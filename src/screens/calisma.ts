// Çalışma ekranı — bir ders tek çizim değil, bir dizi.
//
// Brief 7.1 üç kademe tarif ediyor ve "3 kez üst üste hatasız → sonraki kademe"
// diyor. Ders bu yüzden yedi denemelik bir dizi:
//
//   Kademe 1 · 3 kez — kılavuz belirgin, üstünden geç
//   Kademe 2 · 2 kez — kılavuz soluyor
//   Kademe 3 · 2 kez — kılavuz YOK, ezberden yaz
//
// Başarısız deneme kademeyi ilerletmiyor, tekrarlanıyor. Asıl öğrenme
// Kademe 3'te oluyor: kılavuz arkada görünmeden yazmak.
//
// Değerlendirme şu an şekil örtüşmesi (grading/shape.ts). Yön, hamle sırası ve
// kalem kalkışı glyph verisi ister; başlangıç noktası denetimi (data/starts.ts)
// yönün yakalanabilen yarısı.

import { InkSurface } from '../canvas/surface';
import { attachPointer, type PointerHandle } from '../canvas/pointer';
import { outlinePath, styleFor } from '../canvas/ink';
import { drawPaper, DEFAULT_PAPER, type PaperConfig } from '../ui/paper';
import {
  drawStartMarker,
  drawStress,
  ensureGuideFont,
  firstCharWidth,
  measureGuide,
  startPointOf,
  targetPainter,
  type GuideBox,
} from '../ui/guide';
import { startOf } from '../data/starts';
import {
  elementCount,
  elementPainter,
  measureElements,
  type ElementBox,
} from '../ui/elements';
import { scoreShape, shapeMessage, type ShapeResult } from '../grading/shape';
import { ensureCard, review, buildQueue } from '../srs/scheduler';
import { Rating } from '../srs/cards';
import { getSetting, saveAttempt } from '../db/db';
import { recordReview } from '../srs/stats';
import { pushResult, seenSubjects } from '../srs/session';
import { speak, speechStatus } from '../audio/speech';
import { APP_VERSION, isStandalone, newId, type InkPoint, type InkStroke } from '../types';
import { ELEMENTS, LEVELS, findWord, levelOfLetter } from '../data/curriculum';

const INK_COLOR = '#14213d';
/** Bu puanın altı sayılmaz; kademe ilerlemez. */
const PASS = 0.72;

type Step = { stage: 1 | 2 | 3; need: number; label: string; alpha: number };

const LESSON: Step[] = [
  { stage: 1, need: 3, label: 'Kılavuzun üstünden geç', alpha: 0.3 },
  { stage: 2, need: 2, label: 'Kılavuz soluyor', alpha: 0.13 },
  { stage: 3, need: 2, label: 'Kılavuz yok — ezberden yaz', alpha: 0 },
];
const TOTAL = LESSON.reduce((n, s) => n + s.need, 0);

type Info = {
  title: string;
  sub: string;
  say: string;
  element: boolean;
  word: boolean;
  /** Vurgulu harfin indeksi — yalnız kelimelerde. */
  stress: number;
};

/** Ekranda gösterilecek başlık, seslendirilecek metin ve tür. */
function describe(subject: string): Info {
  const el = ELEMENTS.find((e) => e.id === subject);
  if (el) {
    return { title: el.name, sub: el.ru, say: '', element: true, word: false, stress: -1 };
  }
  const w = findWord(subject);
  if (w) {
    return {
      title: w.word.ru,
      sub: w.word.tr,
      say: w.word.ru,
      element: false,
      word: true,
      stress: w.word.stress,
    };
  }
  for (const lvl of LEVELS) {
    const l = lvl.letters.find((x) => x.ch === subject);
    // Ünsüzlerde harfin ADI değil SESİ okunuyor (bkz. curriculum.ts → say).
    if (l) {
      return {
        title: l.ch,
        sub: l.hint ?? lvl.ru,
        say: l.say ?? l.ch,
        element: false,
        word: false,
        stress: -1,
      };
    }
  }
  return { title: subject, sub: '', say: subject, element: false, word: false, stress: -1 };
}

function ratingOf(score: number): Rating.Again | Rating.Hard | Rating.Good | Rating.Easy {
  if (score >= 0.85) return Rating.Easy;
  if (score >= PASS) return Rating.Good;
  if (score >= 0.58) return Rating.Hard;
  return Rating.Again;
}

function failedChecks(r: ShapeResult): string[] {
  const out: string[] = [];
  if (r.missedSection) out.push('humps');
  if (r.recall < 0.7) out.push('length');
  if (r.precision < 0.65) out.push('shape');
  return out;
}

export function render(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'и';
  const info = describe(target);

  root.className = 'screen flush';
  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b class="${info.element ? 'as-text' : ''}">${info.title}</b>
        <span id="stepLabel">${LESSON[0]!.label}</span>
      </div>
      <button id="say" class="ghost" style="min-height:38px;padding:8px 13px" title="Dinle">🔊</button>
    </div>
    <div class="step-dots" id="dots"></div>
    <div class="ink-surface" id="surface"></div>
    <div class="toolbar">
      <button id="undo" class="ghost" disabled>↶ Geri al</button>
      <button id="clear" class="ghost" disabled>Temizle</button>
      <span class="spacer"></span>
      <button id="check" class="primary" disabled>Kontrol et</button>
    </div>
    ${info.word ? `<div class="word-strip"><b>${info.title}</b><span>${info.sub}</span></div>` : ''}
    <div class="scroll"><div id="result"></div></div>
  `;

  const host = root.querySelector<HTMLElement>('#surface')!;
  const resultBox = root.querySelector<HTMLElement>('#result')!;
  const stepLabel = root.querySelector<HTMLElement>('#stepLabel')!;
  const dotsBox = root.querySelector<HTMLElement>('#dots')!;
  const checkBtn = root.querySelector<HTMLButtonElement>('#check')!;
  const undoBtn = root.querySelector<HTMLButtonElement>('#undo')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('#clear')!;
  const sayBtn = root.querySelector<HTMLButtonElement>('#say')!;

  const surface = new InkSurface(host, { desynchronized: true });
  const strokes: InkStroke[] = [];
  let current: InkPoint[] = [];
  let pointerType = 'mouse';
  let frame = 0;
  let mark = { coalesced: 0, rawMoves: 0 };

  let paper: PaperConfig = DEFAULT_PAPER;
  let box: GuideBox | null = null;
  let elBox: ElementBox | null = null;
  let disposed = false;

  // — ders durumu —
  let stepIndex = 0;
  let passedInStep = 0;
  const scores: number[] = [];
  let checked = false;
  let finished = false;
  let peeked = false;
  let nextHash = '#/ozet';

  const step = () => LESSON[Math.min(stepIndex, LESSON.length - 1)]!;
  const passedTotal = () =>
    LESSON.slice(0, stepIndex).reduce((n, s) => n + s.need, 0) + passedInStep;

  const start = info.element ? undefined : startOf(target[0] ?? target);
  const startAt = (): { x: number; y: number } | null => {
    if (!start || !box) return null;
    // Kelimede nokta ilk harfe göre konumlanır, kelimenin tamamına göre değil.
    const span = info.word ? firstCharWidth(surface.ctx.paper, target, box) : box.width;
    return startPointOf(box, start, paper.rowHeight, span);
  };

  const painter = (): ((ctx: CanvasRenderingContext2D) => void) | null => {
    if (info.element) return elBox ? elementPainter(target, elBox) : null;
    return box ? targetPainter(target, box) : null;
  };

  const drawDots = () => {
    const done = passedTotal();
    let i = 0;
    dotsBox.innerHTML = LESSON.map(
      (s) =>
        `<span class="dot-group" title="Kademe ${s.stage}">` +
        Array.from({ length: s.need }, () => `<i class="${i++ < done ? 'on' : ''}"></i>`).join('') +
        `</span>`,
    ).join('');
  };

  const redraw = () => {
    drawPaper(surface.ctx.paper, surface.width, surface.height, paper);
    const alpha = step().alpha;
    const paint = painter();
    if (paint && alpha > 0) {
      const ctx = surface.ctx.paper;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#1d3f8f';
      paint(ctx);
      ctx.restore();

      // Vurgu işareti kelimelerde şart — vurgusuz okunan Rusça kelime yanlıştır.
      if (info.word && box && info.stress >= 0) {
        drawStress(surface.ctx.paper, target, box, info.stress, Math.min(1, alpha * 3));
      }
      // İşaret yalnızca kılavuz görünürken; Kademe 3'te ipucu yok.
      const at = startAt();
      if (at) drawStartMarker(surface.ctx.paper, at, paper.rowHeight, Math.min(1, alpha * 3));
    }
    surface.clearCommitted();
    surface.ctx.committed.fillStyle = INK_COLOR;
    for (const s of strokes) {
      surface.ctx.committed.fill(outlinePath(s.points, styleFor(s.pointerType), true));
    }
  };

  const remeasure = () => {
    box = measureGuide(surface.ctx.paper, target, paper, surface.width, surface.height);
    if (info.element) {
      elBox = measureElements(paper, surface.width, box.baseline, elementCount(target));
    }
    redraw();
  };
  surface.setResizeHandler(remeasure);

  const syncButtons = () => {
    const has = strokes.length > 0;
    undoBtn.disabled = checked || !has;
    clearBtn.disabled = checked || !has;
    checkBtn.disabled = !checked && !has;
  };

  /** Sonraki denemeye hazırla — tuval temiz, sonuç kapalı. */
  const nextAttempt = () => {
    strokes.length = 0;
    checked = false;
    resultBox.innerHTML = '';
    checkBtn.textContent = 'Kontrol et';
    stepLabel.textContent = step().label;
    drawDots();
    redraw();
    syncButtons();
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
        if (current.length > 1 && !checked) {
          surface.ctx.committed.fillStyle = INK_COLOR;
          surface.ctx.committed.fill(outlinePath(current, styleFor(pointerType), true));
          strokes.push({
            points: current,
            pointerType,
            coalescedCount: pointer.stats.coalesced - mark.coalesced,
            rawMoves: pointer.stats.rawMoves - mark.rawMoves,
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

  // — kurulum —
  void (async () => {
    const [saved] = await Promise.all([
      getSetting<PaperConfig>('paper', DEFAULT_PAPER),
      openLesson(target),
      ensureGuideFont(),
    ]);
    if (disposed) return;
    paper = saved;
    remeasure();
    drawDots();
  })();

  if (info.element) {
    sayBtn.remove();
  } else {
    sayBtn.addEventListener('click', () => {
      peeked = true;
      if (!speak(info.say)) {
        sayBtn.textContent = '—';
        sayBtn.title = 'Cihazda ru-RU ses bulunamadı';
        setTimeout(() => (sayBtn.textContent = '🔊'), 1600);
      }
    });
    if (!speechStatus().ready) sayBtn.style.opacity = '.45';
  }

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
      nextAttempt();
      return;
    }
    if (strokes.length) void grade();
  });

  async function grade(): Promise<void> {
    const paintTarget = painter();
    if (!paintTarget) return;

    const result = scoreShape({
      width: surface.width,
      height: surface.height,
      drawTarget: paintTarget,
      drawUser: (ctx) => {
        for (const s of strokes) ctx.fill(outlinePath(s.points, styleFor(s.pointerType), true));
      },
      // 0.22 çok cömertti: eksik tepe bile tolerans bandına giriyordu.
      tolerance: Math.max(7, paper.rowHeight * 0.13),
    });

    checked = true;
    syncButtons();
    surface.ctx.live.drawImage(result.overlay, 0, 0);

    // Başlangıç denetimi — yönün yakalanabilen yarısı.
    const at = startAt();
    const firstPoint = strokes[0]?.points[0];
    const startOff =
      at && firstPoint
        ? Math.hypot(firstPoint.x - at.x, firstPoint.y - at.y) > paper.rowHeight * 0.45
        : false;

    const checks = failedChecks(result);
    if (startOff) checks.unshift('start');

    const passed = result.score >= PASS && !startOff;
    scores.push(result.score);

    if (passed) {
      passedInStep++;
      if (passedInStep >= step().need) {
        stepIndex++;
        passedInStep = 0;
      }
    }
    drawDots();
    finished = stepIndex >= LESSON.length;

    const noun = info.element ? 'şekil' : info.word ? 'kelime' : 'harf';
    const msg = shapeMessage(result, noun);
    const pct = (v: number) => Math.round(v * 100);

    resultBox.innerHTML = `
      <div class="card result-card">
        <div class="result-head">
          <b>${startOff && !result.missedSection ? 'Yanlış yerden başladın' : msg.title}</b>
          <span class="result-score">${pct(result.score)}</span>
        </div>
        <p class="fine" style="margin:4px 0 12px">${
          startOff
            ? `Yeşil noktadan başlamalısın${start?.note ? ` — ${start.note.toLocaleLowerCase('tr')}` : ''}. ${msg.detail}`
            : msg.detail
        }</p>
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
        <p class="fine">${
          passed
            ? `${passedTotal()} / ${TOTAL} tamam.`
            : 'Bu deneme sayılmadı — kademe ilerlemedi, tekrar dene.'
        }</p>
      </div>`;

    if (!finished) {
      checkBtn.textContent = passed ? 'Sonraki' : 'Tekrar dene';
      stepLabel.textContent = step().label;
      return;
    }
    await finishLesson(checks);
  }

  /**
   * Ders bitti: denemelerin ORTALAMASI tek bir FSRS notuna çevriliyor.
   * Her deneme ayrı not olsaydı yedi tekrar kartı yapay olarak ileri atardı.
   */
  async function finishLesson(lastChecks: string[]): Promise<void> {
    const average = scores.reduce((n, x) => n + x, 0) / Math.max(1, scores.length);

    await review(`${kindOf(target)}:${target}:write`, ratingOf(average), lastChecks);
    await recordReview();
    pushResult({
      subject: target,
      label: info.title,
      score: average,
      checks: lastChecks,
      at: Date.now(),
    });
    await saveAttempt({
      id: newId(),
      ts: Date.now(),
      target: `${kindOf(target)}:${target}`,
      stage: 3,
      strokes: strokes.slice(),
      verdict: average >= PASS ? 'pass' : 'fail',
      failedChecks: lastChecks,
      thresholds: { average, attempts: scores.length },
      hintUsed: peeked,
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

    resultBox.insertAdjacentHTML(
      'afterbegin',
      `<div class="ok" style="text-align:center">
         <b>Ders tamam</b> · ${scores.length} deneme, ortalama ${Math.round(average * 100)}
       </div>`,
    );

    if (next) {
      nextHash = `#/calis/${encodeURIComponent(next.subject)}`;
      checkBtn.textContent = `Sonraki ders · ${queue.total}`;
    } else {
      nextHash = '#/ozet';
      checkBtn.textContent = 'Oturumu bitir';
    }
  }

  return () => {
    disposed = true;
    pointer.detach();
    surface.destroy();
  };
}

function kindOf(subject: string): 'letter' | 'element' | 'word' {
  if (ELEMENTS.some((e) => e.id === subject)) return 'element';
  return findWord(subject) ? 'word' : 'letter';
}

/**
 * Ders açma: kart yoksa üretir. Kelime dersinde o seviyenin BÜTÜN kelimeleri
 * açılır — oturum sonra kuyruk üzerinden aralarında dolaşır.
 */
async function openLesson(subject: string) {
  const element = ELEMENTS.find((e) => e.id === subject);
  if (element) return ensureCard('element:write', subject, 'elements');

  const w = findWord(subject);
  if (w) {
    for (const other of w.level.words) {
      if (other.ru !== subject) await ensureCard('word:write', other.ru, w.level.id);
    }
    return ensureCard('word:write', subject, w.level.id);
  }

  const level = levelOfLetter(subject);
  return ensureCard('letter:write', subject, level?.id ?? 'g1');
}
