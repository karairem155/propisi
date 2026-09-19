// Dikte — brief 7.5.
//
// "Ekranda hiçbir görsel yok. Kelime sesli okunur, kullanıcı el yazısıyla yazar."
// Uygulamanın en zor alıştırması ve en çok şey ölçeni: sesi harfe, harfi el
// yazısına çevirmeyi aynı anda istiyor.
//
// Kılavuz olmadığı için değerlendirme KONUMDAN BAĞIMSIZ (shape.ts → align).
// Kullanıcı kelimeyi sayfanın neresine yazarsa yazsın şekli karşılaştırılıyor;
// ölçek bilerek normalize edilmiyor (brief 6.1 uyarısı).
//
// brief 8.2: "tekrar dinle" sayısı zorluk sinyali, FSRS notuna katılıyor.

import { InkSurface } from '../canvas/surface';
import { attachPointer, type PointerHandle } from '../canvas/pointer';
import { outlinePath, styleFor } from '../canvas/ink';
import { drawPaper, DEFAULT_PAPER, type PaperConfig } from '../ui/paper';
import { drawGuide, ensureGuideFont, measureGuide, targetPainter, type GuideBox } from '../ui/guide';
import { scoreShape, shapeMessage } from '../grading/shape';
import { ensureCard, review, buildQueue, practiceHref } from '../srs/scheduler';
import { Rating } from '../srs/cards';
import { recordReview } from '../srs/stats';
import { pushResult, seenSubjects } from '../srs/session';
import { speak, speechStatus } from '../audio/speech';
import { getSetting, saveAttempt } from '../db/db';
import { findWord } from '../data/curriculum';
import { APP_VERSION, isStandalone, newId, type InkPoint, type InkStroke } from '../types';

const INK_COLOR = '#14213d';
const PASS = 0.7;

export function render(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'мама';
  const entry = findWord(target);
  const meaning = entry?.word.tr ?? '';

  root.className = 'screen flush';
  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b class="as-text">Dikte</b>
        <span>Duyduğun kelimeyi yaz</span>
      </div>
      <span style="width:44px"></span>
    </div>

    <div class="card" style="text-align:center;margin-bottom:10px">
      <button class="quiz-sound" id="play">🔊 Dinle</button>
      <div class="row" style="justify-content:center;margin-top:10px">
        <button class="ghost" id="slow">Yavaş</button>
        <span class="fine" id="replays" style="margin:0;align-self:center">0 tekrar</span>
      </div>
    </div>

    <div class="ink-surface" id="surface"></div>
    <div class="toolbar">
      <button id="undo" class="ghost" disabled>↶ Geri al</button>
      <button id="clear" class="ghost" disabled>Temizle</button>
      <span class="spacer"></span>
      <button id="check" class="primary" disabled>Kontrol et</button>
    </div>
    <div class="scroll"><div id="result"></div></div>
  `;

  const host = root.querySelector<HTMLElement>('#surface')!;
  const resultBox = root.querySelector<HTMLElement>('#result')!;
  const checkBtn = root.querySelector<HTMLButtonElement>('#check')!;
  const undoBtn = root.querySelector<HTMLButtonElement>('#undo')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('#clear')!;
  const replayLabel = root.querySelector<HTMLElement>('#replays')!;

  const surface = new InkSurface(host, { desynchronized: true });
  const strokes: InkStroke[] = [];
  let current: InkPoint[] = [];
  let pointerType = 'mouse';
  let frame = 0;

  let paper: PaperConfig = DEFAULT_PAPER;
  let box: GuideBox | null = null;
  let replays = 0;
  let checked = false;
  let disposed = false;
  let nextHash = '#/ozet';

  /** Dikte tuvali BOŞ — sadece satır çizgileri. Kılavuz yok, ipucu yok. */
  const redraw = (revealAnswer = false) => {
    drawPaper(surface.ctx.paper, surface.width, surface.height, paper);
    if (revealAnswer && box) {
      drawGuide(surface.ctx.paper, target, box, { alpha: 0.22 });
    }
    surface.clearCommitted();
    surface.ctx.committed.fillStyle = INK_COLOR;
    for (const s of strokes) {
      surface.ctx.committed.fill(outlinePath(s.points, styleFor(s.pointerType), true));
    }
  };

  const remeasure = () => {
    box = measureGuide(surface.ctx.paper, target, paper, surface.width, surface.height);
    redraw(checked);
  };
  surface.setResizeHandler(remeasure);

  const syncButtons = () => {
    const has = strokes.length > 0;
    undoBtn.disabled = checked || !has;
    clearBtn.disabled = checked || !has;
    checkBtn.disabled = !checked && !has;
  };

  const paint = () => {
    frame = 0;
    surface.clearLive();
    if (current.length < 2) return;
    surface.ctx.live.fillStyle = INK_COLOR;
    surface.ctx.live.fill(outlinePath(current, styleFor(pointerType), false));
  };

  const pointer: PointerHandle = attachPointer(
    host,
    {
      onStart(pt, e) {
        if (checked) return;
        pointerType = e.pointerType;
        current = [pt];
        if (!frame) frame = requestAnimationFrame(paint);
      },
      onMove(pts) {
        if (checked) return;
        current.push(...pts);
        if (!frame) frame = requestAnimationFrame(paint);
      },
      onEnd(reason) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        if (current.length > 1 && !checked) {
          surface.ctx.committed.fillStyle = INK_COLOR;
          surface.ctx.committed.fill(outlinePath(current, styleFor(pointerType), true));
          strokes.push({
            points: current,
            pointerType,
            coalescedCount: 0,
            rawMoves: 0,
            canceled: reason === 'cancel',
          });
        }
        current = [];
        surface.clearLive();
        syncButtons();
      },
    },
    { penOnly: false, usePredicted: true },
  );

  const play = (rate = 1) => {
    replays++;
    replayLabel.textContent = `${replays - 1} tekrar`;
    if (!speak(target, { rate })) {
      replayLabel.textContent = 'Cihazda ru-RU ses yok';
    }
  };

  root.querySelector('#play')!.addEventListener('click', () => play(1));
  // brief 7.5 — yavaş okuma seçeneği
  root.querySelector('#slow')!.addEventListener('click', () => play(0.7));

  undoBtn.addEventListener('click', () => {
    if (checked || !strokes.length) return;
    strokes.pop();
    redraw();
    syncButtons();
  });

  clearBtn.addEventListener('click', () => {
    if (checked) return;
    strokes.length = 0;
    redraw();
    syncButtons();
  });

  checkBtn.addEventListener('click', () => {
    if (checked) {
      location.hash = nextHash;
      return;
    }
    if (strokes.length) void grade();
  });

  async function grade(): Promise<void> {
    if (!box) return;
    const result = scoreShape({
      width: surface.width,
      height: surface.height,
      drawTarget: targetPainter(target, box),
      drawUser: (ctx) => {
        for (const s of strokes) ctx.fill(outlinePath(s.points, styleFor(s.pointerType), true));
      },
      tolerance: Math.max(8, paper.rowHeight * 0.16),
      // Kılavuz yok: nereye yazdığı değil, ne yazdığı önemli.
      align: 'translate',
    });

    checked = true;
    syncButtons();
    // Doğru yazımı el yazısıyla göster (brief 7.5: "yanlışsa doğru yazım gösterilir").
    redraw(true);
    surface.ctx.live.drawImage(result.overlay, 0, 0);

    const msg = shapeMessage(result, 'kelime');
    const pct = (v: number) => Math.round(v * 100);
    const extraReplays = Math.max(0, replays - 1);

    resultBox.innerHTML = `
      <div class="card result-card">
        <div class="result-head">
          <b>${msg.title}</b>
          <span class="result-score">${pct(result.score)}</span>
        </div>
        <p class="fine" style="margin:4px 0 10px">${msg.detail}</p>
        <div class="word-answer">
          <span class="cursive">${target}</span>
          <div>
            <b>${target}</b>
            ${meaning ? `<span class="fine" style="margin:0"> · ${meaning}</span>` : ''}
          </div>
        </div>
        <p class="fine">
          ${extraReplays ? `${extraReplays} kez tekrar dinledin — zorluk sinyali olarak sayıldı.` : 'Tek dinlemede yazdın.'}
        </p>
      </div>`;

    await finish(result.score, extraReplays);
  }

  async function finish(score: number, extraReplays: number): Promise<void> {
    // brief 8.2 — tekrar dinleme sayısı notu düşürür.
    let rating: Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;
    if (score < 0.55) rating = Rating.Again;
    else if (score < PASS || extraReplays >= 2) rating = Rating.Hard;
    else if (score >= 0.88 && extraReplays === 0) rating = Rating.Easy;
    else rating = Rating.Good;

    await review(`word:${target}:dictation`, rating, score < PASS ? ['shape'] : []);
    await recordReview();
    // Yazabilen ve duyabilen için sıradaki adım anlamı tanımak.
    if (entry) await ensureCard('word:read', target, entry.level.id);
    pushResult({ subject: target, label: target, score, checks: [], at: Date.now() });
    await saveAttempt({
      id: newId(),
      ts: Date.now(),
      target: `dictation:${target}`,
      stage: 3,
      strokes: strokes.slice(),
      verdict: score >= PASS ? 'pass' : 'fail',
      failedChecks: score < PASS ? ['shape'] : [],
      thresholds: { score, replays: extraReplays },
      hintUsed: extraReplays > 0,
      env: {
        appVersion: APP_VERSION,
        ua: navigator.userAgent,
        standalone: isStandalone(),
        dpr: window.devicePixelRatio || 1,
        surface: { w: surface.width, h: surface.height },
        desynchronized: surface.desynchronized,
      },
    });

    const queue = await buildQueue();
    if (disposed) return;
    const seen = seenSubjects();
    const next = queue.cards.find((c) => c.subject !== target && !seen.has(c.subject));
    nextHash = next ? practiceHref(next) : '#/ozet';
    checkBtn.textContent = next ? `Devam · ${queue.total}` : 'Oturumu bitir';
  }

  void (async () => {
    const [saved] = await Promise.all([
      getSetting<PaperConfig>('paper', DEFAULT_PAPER),
      ensureCard('word:dictation', target, entry?.level.id ?? 'g1'),
      ensureGuideFont(),
    ]);
    if (disposed) return;
    paper = saved;
    remeasure();
    if (speechStatus().ready) play(1);
    else replayLabel.textContent = 'Cihazda ru-RU ses yok';
  })();

  return () => {
    disposed = true;
    pointer.detach();
    surface.destroy();
  };
}
