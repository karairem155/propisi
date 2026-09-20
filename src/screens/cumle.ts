// Cümle yazımı — müfredatın en üst basamağı.
//
// Tek kelime yazarken hiç karşılaşmadığın üç şey burada çıkıyor: büyük harf,
// kelime arası boşluk, nokta. Kullanıcının isteği de buydu — "bazen uzun
// cümle bile yazdırsın öğrenilenlerle".
//
// TASARIM KARARI — CÜMLE TEK SEFERDE DEĞİL, KELİME KELİME YAZILIYOR.
//
// Altı kelimelik bir cümleyi tek satıra sığdırmak harfleri okunmaz hâle
// getiriyor (kılavuz genişliğe göre küçülüyor) ve değerlendirmeyi de bozuyor:
// yirmi yedi harfin örtüşmesi tek bir puana inince hangi kelimenin battığı
// kaybolıyor. Kelime kelime yazınca harfler büyük kalıyor, her kelime kendi
// notunu alıyor ve cümlenin sonunda ortalama tek bir FSRS notuna dönüyor.
//
// Cümlenin tamamı üstte el yazısıyla duruyor — akışı görmek de dersin parçası.

import { InkSurface } from '../canvas/surface';
import { attachPointer, type PointerHandle } from '../canvas/pointer';
import { outlinePath, styleFor } from '../canvas/ink';
import { drawPaper, DEFAULT_PAPER, type PaperConfig } from '../ui/paper';
import { ensureGuideFont, measureGuide, targetPainter, type GuideBox } from '../ui/guide';
import { scoreShape, shapeMessage, type ShapeResult } from '../grading/shape';
import { findSentence, SENTENCES, wordsOf, type Sentence } from '../data/sentences';
import { ensureCard, review } from '../srs/scheduler';
import { nextAfter } from '../srs/flow';
import { Rating } from '../srs/cards';
import { recordReview } from '../srs/stats';
import { pushResult } from '../srs/session';
import { speak, speechStatus } from '../audio/speech';
import { sfx, sfxForScore } from '../audio/sfx';
import { burst, countUp, pop, shake } from '../ui/celebrate';
import { getSetting, saveAttempt } from '../db/db';
import { mascot } from '../ui/mascot';
import { APP_VERSION, isStandalone, newId, type InkPoint, type InkStroke } from '../types';

const INK_COLOR = '#14213d';
const PASS = 0.7;
/** Cümlede kılavuz soluk ama var: buradaki ders akış, ezber değil. */
const GUIDE_ALPHA = 0.22;

export function render(root: HTMLElement, id?: string): () => void {
  const sentence: Sentence | undefined = findSentence(id ?? 's1');

  root.className = 'screen flush';
  if (!sentence) {
    root.className = 'screen';
    root.innerHTML = `<div class="warn">Böyle bir cümle yok: <code>${id}</code></div>
      <a class="btn primary on-blue" href="#/patika"
         style="display:block;text-align:center;text-decoration:none">Patikaya dön</a>`;
    return () => {};
  }

  // TS, kapanışların içinde `sentence` daralmasını korumuyor; daraltılmış
  // yerel sabit üzerinden ilerliyoruz.
  const sen: Sentence = sentence;
  const words = wordsOf(sen);
  const scores: number[] = [];
  let wordIndex = 0;
  let checked = false;
  let finished = false;
  let heard = false;
  let nextHash = '#/ozet';

  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b class="as-text">Cümle</b>
        <span id="stepLabel">${words.length} kelime · ${sen.note}</span>
      </div>
      <button id="say" class="ghost" style="min-height:38px;padding:8px 13px" title="Dinle">🔊</button>
    </div>

    <div class="sentence-bar" id="bar">
      <div class="sentence-ru" id="ru"></div>
      <div class="sentence-tr">${sen.tr}</div>
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
  const ruBox = root.querySelector<HTMLElement>('#ru')!;
  const resultBox = root.querySelector<HTMLElement>('#result')!;
  const stepLabel = root.querySelector<HTMLElement>('#stepLabel')!;
  const checkBtn = root.querySelector<HTMLButtonElement>('#check')!;
  const undoBtn = root.querySelector<HTMLButtonElement>('#undo')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('#clear')!;
  const sayBtn = root.querySelector<HTMLButtonElement>('#say')!;

  const surface = new InkSurface(host, { desynchronized: true });
  const strokes: InkStroke[] = [];
  let current: InkPoint[] = [];
  let pointerType = 'mouse';
  let frame = 0;
  let paper: PaperConfig = DEFAULT_PAPER;
  let box: GuideBox | null = null;
  let disposed = false;

  const word = () => words[Math.min(wordIndex, words.length - 1)]!;

  /** Üstteki cümle şeridi: yazılan kelime vurgulu, bitenler soluk yeşil. */
  const paintBar = () => {
    ruBox.innerHTML = words
      .map((w, i) => {
        const state = i < wordIndex ? 'done' : i === wordIndex ? 'now' : 'next';
        return `<span class="sw sw--${state}">${w}</span>`;
      })
      .join(' ');
  };

  const redraw = (reveal = false) => {
    drawPaper(surface.ctx.paper, surface.width, surface.height, paper);
    const alpha = reveal ? Math.max(GUIDE_ALPHA, 0.3) : GUIDE_ALPHA;
    if (box) {
      const ctx = surface.ctx.paper;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#1d3f8f';
      targetPainter(word(), box)(ctx);
      ctx.restore();
    }
    surface.clearCommitted();
    surface.ctx.committed.fillStyle = INK_COLOR;
    for (const s of strokes) {
      surface.ctx.committed.fill(outlinePath(s.points, styleFor(s.pointerType), true));
    }
  };

  function scoreNow(): ShapeResult | null {
    if (!box) return null;
    return scoreShape({
      width: surface.width,
      height: surface.height,
      drawTarget: targetPainter(word(), box),
      drawUser: (ctx) => {
        for (const s of strokes) ctx.fill(outlinePath(s.points, styleFor(s.pointerType), true));
      },
      tolerance: Math.max(8, paper.rowHeight * 0.15),
      align: 'none',
    });
  }

  const remeasure = () => {
    box = measureGuide(surface.ctx.paper, word(), paper, surface.width, surface.height);
    redraw(checked);
    // Yeniden boyutlanma değerlendirme katmanını siliyor (bkz. calisma.ts).
    if (checked) {
      const again = scoreNow();
      if (again) surface.ctx.live.drawImage(again.overlay, 0, 0);
    }
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

  sayBtn.addEventListener('click', () => {
    heard = true;
    if (!speak(sen.ru)) {
      sayBtn.textContent = '—';
      setTimeout(() => (sayBtn.textContent = '🔊'), 1600);
    }
  });
  if (!speechStatus().ready) sayBtn.style.opacity = '.45';

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
    if (finished) {
      location.hash = nextHash;
      return;
    }
    if (checked) {
      nextWord();
      return;
    }
    if (strokes.length) void grade();
  });

  function nextWord(): void {
    wordIndex++;
    strokes.length = 0;
    checked = false;
    resultBox.innerHTML = '';
    checkBtn.textContent = 'Kontrol et';
    paintBar();
    stepLabel.textContent = `Kelime ${wordIndex + 1} / ${words.length}`;
    remeasure();
    syncButtons();
  }

  async function grade(): Promise<void> {
    const result = scoreNow();
    if (!result) return;

    checked = true;
    syncButtons();
    redraw(true);
    surface.ctx.live.drawImage(result.overlay, 0, 0);

    const passed = result.score >= PASS;
    scores.push(result.score);
    sfxForScore(result.score, passed);

    const msg = shapeMessage(result, 'kelime');
    const pct = (v: number) => Math.round(v * 100);
    const last = wordIndex >= words.length - 1;

    resultBox.innerHTML = `
      <div class="card result-card">
        <div class="result-head">
          <b>${msg.title}</b>
          <span class="result-score">0</span>
        </div>
        <p class="fine" style="margin:4px 0 10px">${msg.detail}</p>
        <div class="bar-row">
          <span class="bar-name cursive">${word()}</span>
          <div class="bar-track"><i style="width:${pct(result.score)}%;background:${
            passed ? 'var(--mint)' : 'var(--coral)'
          }"></i></div>
          <b>${pct(result.score)}</b>
        </div>
      </div>`;

    const scoreEl = resultBox.querySelector<HTMLElement>('.result-score')!;
    countUp(scoreEl, pct(result.score));
    const card = resultBox.querySelector('.result-card')!;
    if (passed) burst(card, 10);
    else shake(card);

    if (!last) {
      checkBtn.textContent = `Sonraki kelime · ${wordIndex + 2}/${words.length}`;
      return;
    }
    finished = true;
    await finishSentence();
  }

  async function finishSentence(): Promise<void> {
    const average = scores.reduce((n, x) => n + x, 0) / Math.max(1, scores.length);
    const rating =
      average >= 0.85
        ? Rating.Easy
        : average >= PASS
          ? Rating.Good
          : average >= 0.55
            ? Rating.Hard
            : Rating.Again;

    await review(`sentence:${sen.id}`, rating, average < PASS ? ['shape'] : []);
    await recordReview();
    pushResult({
      subject: sen.id,
      label: sen.ru,
      score: average,
      checks: average < PASS ? ['shape'] : [],
      at: Date.now(),
    });
    await saveAttempt({
      id: newId(),
      ts: Date.now(),
      target: `sentence:${sen.id}`,
      stage: 3,
      strokes: strokes.slice(),
      verdict: average >= PASS ? 'pass' : 'fail',
      failedChecks: average < PASS ? ['shape'] : [],
      thresholds: { average, words: words.length },
      hintUsed: heard,
      env: {
        appVersion: APP_VERSION,
        ua: navigator.userAgent,
        standalone: isStandalone(),
        dpr: window.devicePixelRatio || 1,
        surface: { w: surface.width, h: surface.height },
        desynchronized: surface.desynchronized,
      },
    });

    sfx('finish');
    const dest = await nextAfter(sen.id);
    if (disposed) return;

    resultBox.insertAdjacentHTML(
      'afterbegin',
      `<div class="lesson-done">${mascot('kanca', { size: 56, mood: 'cheer' })}</div>
       <div class="ok" style="text-align:center">
         <b>Cümle tamam</b> · ${words.length} kelime, ortalama ${Math.round(average * 100)}
       </div>`,
    );
    const done = resultBox.querySelector('.lesson-done');
    if (done) {
      pop(done);
      burst(done, 24);
    }

    nextHash = dest.href;
    checkBtn.textContent = dest.label;
  }

  void (async () => {
    const [saved] = await Promise.all([
      getSetting<PaperConfig>('paper', DEFAULT_PAPER),
      openSentenceSet(sen),
      ensureGuideFont(),
    ]);
    if (disposed) return;
    paper = saved;
    paintBar();
    stepLabel.textContent = `Kelime 1 / ${words.length} · ${sen.note}`;
    remeasure();
  })();

  return () => {
    disposed = true;
    pointer.detach();
    surface.destroy();
  };
}

/**
 * Cümle dersi açılınca o seviyenin BÜTÜN cümleleri kuyruğa giriyor —
 * kelime ve bağlantı dersleriyle aynı davranış (bkz. calisma.ts → openLesson).
 * Patikadaki tek düğüm bir dersi değil bir SETİ açıyor.
 */
async function openSentenceSet(sen: Sentence): Promise<void> {
  for (const other of SENTENCES.filter((x) => x.after === sen.after)) {
    await ensureCard('sentence', other.id, other.after);
  }
}
