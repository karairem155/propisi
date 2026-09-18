// Çalışma ekranı — kılavuzun üstüne yaz, örtüşmeye göre değerlendirilsin.
//
// v1 kapsamı bilinçli olarak dar: şekil örtüşmesi (grading/shape.ts). Yön, hamle
// sırası ve tepe sayısı glyph verisi istiyor, o Faz 1'de gelecek ve aynı ekranı
// yerinden oynatmadan yükseltecek.
//
// Kademe kılavuzun saydamlığıyla temsil ediliyor (brief 7.1):
//   Kademe 1 — kılavuz belirgin, üstünden geç
//   Kademe 2 — kılavuz soluyor
//   Kademe 3 — kılavuz yok, ezberden yaz
// Kademe kartın tekrar sayısından türüyor; "Kılavuzu göster" ile geçici bakılabilir.

import { InkSurface } from '../canvas/surface';
import { attachPointer, type PointerHandle } from '../canvas/pointer';
import { outlinePath, styleFor } from '../canvas/ink';
import { drawPaper, DEFAULT_PAPER, type PaperConfig } from '../ui/paper';
import {
  drawGuide,
  ensureGuideFont,
  measureGuide,
  targetPainter,
  type GuideBox,
} from '../ui/guide';
import { scoreShape, shapeMessage, type ShapeResult } from '../grading/shape';
import { ensureCard, review, buildQueue } from '../srs/scheduler';
import { Rating } from '../srs/cards';
import { getSetting, saveAttempt } from '../db/db';
import { recordReview } from '../srs/stats';
import { speak, speechStatus } from '../audio/speech';
import { APP_VERSION, isStandalone, newId, type InkPoint, type InkStroke } from '../types';
import { ELEMENTS, levelOfLetter } from '../data/curriculum';

const INK_COLOR = '#14213d';

/** Kademeye göre kılavuz saydamlığı. */
const STAGE_ALPHA = [0.3, 0.16, 0];

function stageOfReps(reps: number): 1 | 2 | 3 {
  if (reps >= 6) return 3;
  if (reps >= 3) return 2;
  return 1;
}

/** Örtüşme puanını FSRS notuna çevirir — kullanıcı kendi kendini değerlendirmiyor. */
function ratingOf(score: number): Rating.Again | Rating.Hard | Rating.Good | Rating.Easy {
  if (score >= 0.85) return Rating.Easy;
  if (score >= 0.72) return Rating.Good;
  if (score >= 0.58) return Rating.Hard;
  return Rating.Again;
}

/** Düşen kontrolü teşhis adına çevirir — İlerleme raporu bunu kullanıyor. */
function failedChecks(r: ShapeResult): string[] {
  const out: string[] = [];
  if (r.missedSection) out.push('humps'); // atlanan bölüm = eksik tepe/eleman
  if (r.recall < 0.7) out.push('length');
  if (r.precision < 0.65) out.push('shape');
  return out;
}

export function render(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'и';
  root.className = 'screen flush';
  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b>${target}</b>
        <span id="stageLabel">Kademe 1</span>
      </div>
      <button id="say" class="ghost" style="min-height:38px;padding:8px 13px" title="Harfi dinle">🔊</button>
      <button id="peek" class="ghost" style="min-height:38px;padding:8px 13px">Kılavuz</button>
    </div>
    <div class="ink-surface" id="surface"></div>
    <div class="toolbar">
      <button id="clear" class="ghost">Temizle</button>
      <span class="spacer"></span>
      <button id="check" class="primary" disabled>Kontrol et</button>
    </div>
    <div class="scroll"><div id="result"></div></div>
  `;

  const host = root.querySelector<HTMLElement>('#surface')!;
  const resultBox = root.querySelector<HTMLElement>('#result')!;
  const stageLabel = root.querySelector<HTMLElement>('#stageLabel')!;
  const checkBtn = root.querySelector<HTMLButtonElement>('#check')!;

  const surface = new InkSurface(host, { desynchronized: true });
  const strokes: InkStroke[] = [];
  let current: InkPoint[] = [];
  let pointerType = 'mouse';
  let frame = 0;
  let mark = { coalesced: 0, rawMoves: 0 };

  let paper: PaperConfig = DEFAULT_PAPER;
  let box: GuideBox | null = null;
  let stage: 1 | 2 | 3 = 1;
  let peeking = false;
  let checked = false;
  let disposed = false;

  const guideAlpha = () => (peeking ? 0.34 : STAGE_ALPHA[stage - 1]!);

  const redraw = () => {
    drawPaper(surface.ctx.paper, surface.width, surface.height, paper);
    if (box) {
      drawGuide(surface.ctx.paper, target, box, { alpha: guideAlpha() });
    }
    surface.clearCommitted();
    surface.ctx.committed.fillStyle = INK_COLOR;
    for (const s of strokes) {
      surface.ctx.committed.fill(outlinePath(s.points, styleFor(s.pointerType), true));
    }
  };

  const remeasure = () => {
    box = measureGuide(surface.ctx.paper, target, paper, surface.width, surface.height);
    redraw();
  };
  surface.setResizeHandler(remeasure);

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
        mark = { coalesced: pointer.stats.coalesced, rawMoves: pointer.stats.rawMoves };
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
        if (current.length > 1) {
          surface.ctx.committed.fillStyle = INK_COLOR;
          surface.ctx.committed.fill(outlinePath(current, styleFor(pointerType), true));
          strokes.push({
            points: current,
            pointerType,
            coalescedCount: pointer.stats.coalesced - mark.coalesced,
            rawMoves: pointer.stats.rawMoves - mark.rawMoves,
            canceled: reason === 'cancel',
          });
          checkBtn.disabled = false;
        }
        current = [];
        surface.clearLive();
      },
    },
    { penOnly: false, usePredicted: true },
  );

  // — kurulum —
  void (async () => {
    const [saved, card] = await Promise.all([
      getSetting<PaperConfig>('paper', DEFAULT_PAPER),
      openLesson(target),
      ensureGuideFont(),
    ]);
    if (disposed) return;
    paper = saved;
    stage = stageOfReps(card.fsrs.reps);
    stageLabel.textContent = `Kademe ${stage}`;
    remeasure();
  })();

  // — eylemler —
  const sayBtn = root.querySelector<HTMLButtonElement>('#say')!;
  sayBtn.addEventListener('click', () => {
    if (!speak(target)) {
      // Ses yoksa sessizce başarısız olmasın — durumu söyle (brief 9.2/13).
      sayBtn.textContent = '—';
      sayBtn.title = 'Cihazda ru-RU ses bulunamadı';
      setTimeout(() => {
        sayBtn.textContent = '🔊';
      }, 1600);
    }
  });
  if (!speechStatus().ready) sayBtn.style.opacity = '.45';

  root.querySelector('#peek')!.addEventListener('click', () => {
    peeking = !peeking;
    redraw();
  });

  root.querySelector('#clear')!.addEventListener('click', () => {
    strokes.length = 0;
    checked = false;
    checkBtn.disabled = true;
    checkBtn.textContent = 'Kontrol et';
    resultBox.innerHTML = '';
    redraw();
  });

  checkBtn.addEventListener('click', () => {
    if (checked) {
      location.hash = '#/';
      return;
    }
    if (!box || !strokes.length) return;
    void grade();
  });

  async function grade(): Promise<void> {
    const result = scoreShape({
      width: surface.width,
      height: surface.height,
      drawTarget: targetPainter(target, box!),
      drawUser: (ctx) => {
        for (const s of strokes) ctx.fill(outlinePath(s.points, styleFor(s.pointerType), true));
      },
      // 0.22 çok cömertti: eksik tepe bile tolerans bandına giriyordu.
      tolerance: Math.max(7, paper.rowHeight * 0.13),
    });

    checked = true;
    checkBtn.textContent = 'Devam';

    // Atlanan/taşan bölgeleri mürekkebin üstüne bindir.
    surface.ctx.live.drawImage(result.overlay, 0, 0);

    const msg = shapeMessage(result);
    const checks = failedChecks(result);
    const pct = (v: number) => Math.round(v * 100);

    resultBox.innerHTML = `
      <div class="card result-card">
        <div class="result-head">
          <b>${msg.title}</b>
          <span class="result-score">${pct(result.score)}</span>
        </div>
        <p class="fine" style="margin:4px 0 12px">${msg.detail}</p>
        <div class="bar-row">
          <span class="bar-name">İsabet</span>
          <div class="bar-track"><i style="width:${pct(result.precision)}%;background:var(--mint)"></i></div>
          <b>${pct(result.precision)}</b>
        </div>
        <div class="bar-row">
          <span class="bar-name">Kapsama</span>
          <div class="bar-track"><i style="width:${pct(result.recall)}%;background:var(--amber)"></i></div>
          <b>${pct(result.recall)}</b>
        </div>
        <p class="fine">
          Kehribar = atladığın yerler · Mercan = taşan mürekkep.
          Yön ve hamle sırası henüz denetlenmiyor.
        </p>
      </div>`;

    await Promise.all([
      review(`${kindOf(target)}:${target}:write`, ratingOf(result.score), checks),
      saveAttempt({
        id: newId(),
        ts: Date.now(),
        target: `letter:${target}`,
        stage,
        strokes: strokes.slice(),
        verdict: result.score >= 0.72 ? 'pass' : 'fail',
        failedChecks: checks,
        thresholds: {
          precision: result.precision,
          recall: result.recall,
          score: result.score,
        },
        hintUsed: peeking,
        env: {
          appVersion: APP_VERSION,
          ua: navigator.userAgent,
          standalone: isStandalone(),
          dpr: window.devicePixelRatio || 1,
          surface: { w: surface.width, h: surface.height },
          desynchronized: surface.desynchronized,
        },
      }),
    ]);

    await recordReview();

    const queue = await buildQueue();
    if (!disposed && queue.total > 0) {
      checkBtn.textContent = `Devam · ${queue.total}`;
    }
  }

  return () => {
    disposed = true;
    pointer.detach();
    surface.destroy();
  };
}

function kindOf(subject: string): 'letter' | 'element' {
  return ELEMENTS.some((e) => e.id === subject) ? 'element' : 'letter';
}

/** Ders açma: kart yoksa üretir. Patika düğümüne dokunulduğunda buraya gelinir. */
async function openLesson(subject: string) {
  const element = ELEMENTS.find((e) => e.id === subject);
  if (element) return ensureCard('element:write', subject, 'elements');
  const level = levelOfLetter(subject);
  return ensureCard('letter:write', subject, level?.id ?? 'g1');
}
