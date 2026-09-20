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
import { ensureCard, review } from '../srs/scheduler';
import { nextAfter } from '../srs/flow';
import { Rating } from '../srs/cards';
import { delSetting, getSetting, saveAttempt, setSetting } from '../db/db';
import { recordReview } from '../srs/stats';
import { pushResult, examActive, playlistMode } from '../srs/session';
import { speak, speechStatus } from '../audio/speech';
import { sfx, sfxForScore } from '../audio/sfx';
import { burst, countUp, pop, shake } from '../ui/celebrate';
import { APP_VERSION, isStandalone, newId, type InkPoint, type InkStroke } from '../types';
import {
  CAPITALS,
  ELEMENTS,
  LEVELS,
  capitalOf,
  findJoin,
  findWord,
  levelOfCapital,
  levelOfLetter,
} from '../data/curriculum';
import { mascot } from '../ui/mascot';

const INK_COLOR = '#14213d';
/** Bu puanın altı sayılmaz; kademe ilerlemez. */
const PASS = 0.72;

/**
 * Yarım kalan dersin saklanması.
 *
 * Ders yedi denemelik bir dizi ve durumu yalnız bellekte duruyordu. iOS arka
 * plandaki web görünümünü agresif biçimde atıyor: telefon çalarsa kullanıcı
 * geri döndüğünde beşinci denemedeki ders sıfırdan başlıyordu. Kademe ve
 * puanlar kaydediliyor; hamleler DEĞİL (hem büyük hem gereksiz — yeni deneme
 * temiz tuvalle başlar).
 */
type Saved = { stepIndex: number; passedInStep: number; scores: number[]; peeked: boolean; at: number };
const RESUME_KEY = (subject: string) => `lesson:${subject}`;
/** Bundan eskisi geri yüklenmez — bir hafta önceki yarım ders artık geçerli değil. */
const RESUME_MAX_AGE = 24 * 3600_000;

type Step = { stage: 1 | 2 | 3; need: number; label: string; alpha: number };

const FULL_LESSON: Step[] = [
  { stage: 1, need: 3, label: 'Kılavuzun üstünden geç', alpha: 0.3 },
  { stage: 2, need: 2, label: 'Kılavuz soluyor', alpha: 0.13 },
  { stage: 3, need: 2, label: 'Kılavuz yok — ezberden yaz', alpha: 0 },
];

/**
 * Sınav dizisi — kontrol noktasında kullanılır.
 *
 * Yedi denemelik tam ders sınavda yanlış olur: ders ÖĞRETİR, sınav ÖLÇER.
 * Tek deneme, kılavuz yok, "tekrar dene" yok. Aradaki fark tam olarak bu.
 */
const EXAM_LESSON: Step[] = [
  { stage: 3, need: 1, label: 'Sınav — kılavuz yok, tek deneme', alpha: 0 },
];

/**
 * Karışık dersin iki yarısı.
 *
 * NEDEN BÖLÜNDÜ: tam ders aynı harfi yedi kez arka arkaya yazdırıyordu ve
 * kullanıcının ilk söylediği şey buydu — "beş kere üst üste yazdırıyorsun".
 * Yedi tekrar ezber için iyi, motivasyon için felaket.
 *
 * Ders artık `screens/ders.ts` tarafından kuruluyor: önce kılavuzla üç
 * deneme, sonra TANIMA, sonra ezberden iki deneme, sonra HARF AVI. Aynı
 * toplam iş, dört farklı etkinliğe bölünmüş; arada beyin başka bir kas
 * kullanıyor.
 */
const TRACE_LESSON: Step[] = [
  { stage: 1, need: 2, label: 'Kılavuzun üstünden geç', alpha: 0.3 },
  { stage: 2, need: 1, label: 'Kılavuz soluyor', alpha: 0.13 },
];

const MEMORY_LESSON: Step[] = [
  { stage: 3, need: 2, label: 'Kılavuz yok — ezberden yaz', alpha: 0 },
];

type Info = {
  title: string;
  /**
   * Tuvale ÇİZİLECEK metin. Konu kimliği her zaman metin değil: büyük harf
   * dersinin konusu `cap:К`, çizilecek şey ise `К`. Kılavuz, değerlendirme
   * hedefi ve başlangıç noktası hep bunu kullanıyor.
   */
  text: string;
  sub: string;
  say: string;
  element: boolean;
  word: boolean;
  /** Harf çifti mi — kalem kaldırmama kuralı yalnız burada geçerli. */
  join: boolean;
  /** Vurgulu harfin indeksi — yalnız kelimelerde. */
  stress: number;
};

/** Ekranda gösterilecek başlık, seslendirilecek metin ve tür. */
function describe(subject: string): Info {
  const cap = capitalOf(subject);
  if (cap) {
    return {
      title: cap,
      text: cap,
      sub: `Büyük ${cap.toLocaleLowerCase('ru')} — küçüğünün büyütülmüşü değil`,
      say: cap.toLocaleLowerCase('ru'),
      element: false,
      word: false,
      join: false,
      stress: -1,
    };
  }

  const el = ELEMENTS.find((e) => e.id === subject);
  if (el) {
    return {
      title: el.name,
      text: subject,
      sub: el.ru,
      say: '',
      element: true,
      word: false,
      join: false,
      stress: -1,
    };
  }

  const j = findJoin(subject);
  if (j) {
    return {
      title: subject,
      text: subject,
      sub: 'Kalem kaldırmadan yaz',
      say: subject,
      element: false,
      word: false,
      join: true,
      stress: -1,
    };
  }
  const w = findWord(subject);
  if (w) {
    return {
      title: w.word.ru,
      text: w.word.ru,
      sub: w.word.tr,
      say: w.word.ru,
      element: false,
      word: true,
      join: false,
      stress: w.word.stress,
    };
  }
  for (const lvl of LEVELS) {
    const l = lvl.letters.find((x) => x.ch === subject);
    // Ünsüzlerde harfin ADI değil SESİ okunuyor (bkz. curriculum.ts → say).
    if (l) {
      return {
        title: l.ch,
        text: l.ch,
        sub: l.hint ?? lvl.ru,
        say: l.say ?? l.ch,
        element: false,
        word: false,
        join: false,
        stress: -1,
      };
    }
  }
  return {
    title: subject,
    text: subject,
    sub: '',
    say: subject,
    element: false,
    word: false,
    join: false,
    stress: -1,
  };
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
  // Sınav listesi açıksa bu ekran bir sınav sorusudur (bkz. srs/session.ts).
  // Zayıf nokta serisi de liste kullanıyor ama o ÇALIŞMA — tam ders açılır.
  const exam = examActive();
  const mode = playlistMode();
  const LESSON = exam
    ? EXAM_LESSON
    : mode === 'trace'
      ? TRACE_LESSON
      : mode === 'memory'
        ? MEMORY_LESSON
        : FULL_LESSON;
  const TOTAL = LESSON.reduce((n, s) => n + s.need, 0);

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
  /**
   * Değerlendirme katmanı yeniden çizilebilsin diye saklanan durum.
   *
   * NEDEN VAR: sonuç kartı belirince yüzey kısalıyor (234 → 220 px ölçüldü),
   * ResizeObserver tetikleniyor, tuvaller yeniden kuruluyor ve mürekkep
   * katmanı SİLİNİYORDU. Yani kehribar/mercan geri bildirimi — ekranın
   * "neyi yanlış yaptın" anlatan tek görsel aracı — çoğu zaman hiç
   * görünmüyordu. Yeniden boyutlanınca aynı hamlelerle yeniden hesaplanıyor.
   */
  let gradedAlign: 'none' | 'translate' = 'none';
  let revealed = false;
  let peeked = false;
  let nextHash = '#/ozet';

  const step = () => LESSON[Math.min(stepIndex, LESSON.length - 1)]!;
  const passedTotal = () =>
    LESSON.slice(0, stepIndex).reduce((n, s) => n + s.need, 0) + passedInStep;

  const start = info.element ? undefined : startOf(info.text[0] ?? info.text);
  const startAt = (): { x: number; y: number } | null => {
    if (!start || !box) return null;
    // Kelimede nokta ilk harfe göre konumlanır, kelimenin tamamına göre değil.
    const span = info.word ? firstCharWidth(surface.ctx.paper, info.text, box) : box.width;
    return startPointOf(box, start, paper.rowHeight, span);
  };

  const painter = (): ((ctx: CanvasRenderingContext2D) => void) | null => {
    if (info.element) return elBox ? elementPainter(target, elBox) : null;
    return box ? targetPainter(info.text, box) : null;
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

  /**
   * `reveal` — kılavuzsuz kademede hata yapınca doğru şekli göster.
   *
   * Kullanıcı el yazısını bilmiyorsa "şu bölgeyi atladın" tek başına bir şey
   * öğretmiyor; neyi atladığını görmesi gerekiyor. Dikte ekranı bunu baştan
   * yapıyordu, ders ekranı yapmıyordu. Yalnız DENEME BİTTİKTEN sonra çiziliyor,
   * yani ipucu değil düzeltme.
   */
  const redraw = (reveal = revealed) => {
    drawPaper(surface.ctx.paper, surface.width, surface.height, paper);
    const alpha = reveal ? Math.max(step().alpha, 0.24) : step().alpha;
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
        drawStress(surface.ctx.paper, info.text, box, info.stress, Math.min(1, alpha * 3));
      }
      // İşaret yalnızca kılavuz görünürken; Kademe 3'te ipucu yok.
      // Düzeltmede de gösteriliyor: "buradan başlamalıydın".
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
    box = measureGuide(surface.ctx.paper, info.text, paper, surface.width, surface.height);
    if (info.element) {
      elBox = measureElements(paper, surface.width, box.baseline, elementCount(target));
    }
    redraw();
    // Değerlendirme ekrandaysa katmanı yeni ölçüye göre yeniden kur.
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

  /** Sonraki denemeye hazırla — tuval temiz, sonuç kapalı. */
  const nextAttempt = () => {
    strokes.length = 0;
    checked = false;
    revealed = false;
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

  const saveProgress = () => {
    if (exam) return;
    void setSetting<Saved>(RESUME_KEY(target), {
      stepIndex,
      passedInStep,
      scores: scores.slice(),
      peeked,
      at: Date.now(),
    });
  };
  const clearProgress = () => {
    if (!exam) void delSetting(RESUME_KEY(target));
  };

  // — kurulum —
  void (async () => {
    const [savedPaper, resume] = await Promise.all([
      getSetting<PaperConfig>('paper', DEFAULT_PAPER),
      exam
        ? Promise.resolve(null)
        : getSetting<Saved | null>(RESUME_KEY(target), null),
      openLesson(target),
      ensureGuideFont(),
    ]);
    if (disposed) return;
    paper = savedPaper;

    if (resume && Date.now() - resume.at < RESUME_MAX_AGE && resume.stepIndex < LESSON.length) {
      stepIndex = resume.stepIndex;
      passedInStep = resume.passedInStep;
      scores.push(...resume.scores);
      peeked = resume.peeked;
      stepLabel.textContent = step().label;
      resultBox.innerHTML = `<div class="note" style="text-align:center">
        Kaldığın yerden devam — ${
          passedTotal()
            ? `${passedTotal()} / ${TOTAL} tamamdı.`
            : `${scores.length} deneme yapılmıştı, hepsi ortalamaya girecek.`
        }
      </div>`;
    }

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

  /** Mevcut hamleleri mevcut yüzey ölçüsünde değerlendirir. */
  function scoreNow(): ShapeResult | null {
    const paintTarget = painter();
    if (!paintTarget) return null;
    return scoreShape({
      width: surface.width,
      height: surface.height,
      drawTarget: paintTarget,
      drawUser: (ctx) => {
        for (const s of strokes) ctx.fill(outlinePath(s.points, styleFor(s.pointerType), true));
      },
      // 0.22 çok cömertti: eksik tepe bile tolerans bandına giriyordu.
      tolerance: Math.max(7, paper.rowHeight * 0.13),
      align: gradedAlign,
    });
  }

  async function grade(): Promise<void> {
    if (!painter()) return;

    // Kılavuz yokken nereye yazdığı değil, ne yazdığı önemli.
    gradedAlign = step().alpha === 0 ? 'translate' : 'none';
    const result = scoreNow();
    if (!result) return;

    checked = true;
    syncButtons();

    // Başlangıç denetimi — yönün yakalanabilen yarısı.
    const at = startAt();
    const firstPoint = strokes[0]?.points[0];
    const startOff =
      at && firstPoint
        ? Math.hypot(firstPoint.x - at.x, firstPoint.y - at.y) > paper.rowHeight * 0.45
        : false;

    /**
     * Başlangıç noktası denemeyi DÜŞÜREBİLİR Mİ?
     *
     * İki durumda hayır, ikisi de adaletle ilgili:
     *
     *   1. Yeşil nokta EKRANDA YOKKEN (kılavuzsuz kademe, sınav) yanlış
     *      yerden başlamak "gösterilmeyen kuralı çiğnemek" oluyordu. Sınav
     *      ekranı "Yanlış yerden başladın" diyordu ama doğru yeri hiç
     *      göstermemişti.
     *   2. Kaynağından EMİN OLMADIĞIM harflerde (data/starts.ts → sure:false,
     *      33 harfin 14'ü). Doğrulanmamış pedagojiyle kimseyi düşürmem.
     *
     * Her iki durumda da geri bildirim veriliyor: bilgi değerli, ceza değil.
     */
    const startBlocks = startOff && step().alpha > 0 && start?.sure === true;

    const checks = failedChecks(result);
    if (startOff) checks.unshift('start');

    // brief 7.3 — bağlantının ASIL kuralı безотрывное: iki harf tek hamlede.
    // Şekil doğru olsa bile kalem kalktıysa bağlantı öğrenilmemiş demektir.
    const lifted = info.join && strokes.length > 1;
    if (lifted) checks.unshift('lift');

    const passed = result.score >= PASS && !startBlocks && !lifted;
    scores.push(result.score);

    // Kılavuz görünmüyorken hata yapıldıysa doğru şekli arkaya koy. Sınavda
    // tek hak var, orada geçse de geçmese de doğrusu gösteriliyor.
    revealed = (!passed && step().alpha === 0) || exam;
    redraw();
    surface.ctx.live.drawImage(result.overlay, 0, 0);

    if (passed) {
      passedInStep++;
      if (passedInStep >= step().need) {
        stepIndex++;
        passedInStep = 0;
      }
    } else if (exam) {
      // Sınavda ikinci hak yok: başarısız deneme de adımı bitirir. Ders
      // tekrarlatır, sınav not verir — ekranda söylenen de bu.
      stepIndex++;
      passedInStep = 0;
    }
    drawDots();
    finished = stepIndex >= LESSON.length;
    if (!finished) saveProgress();

    // Sesi HEMEN ver, kart çizilmeden önce. Göz sonuca inene kadar kulak
    // cevabı almış oluyor — geri bildirimin en hızlı kanalı bu.
    sfxForScore(result.score, passed);

    const noun = info.element ? 'şekil' : info.word ? 'kelime' : 'harf';
    const msg = shapeMessage(result, noun);
    const pct = (v: number) => Math.round(v * 100);

    resultBox.innerHTML = `
      <div class="card result-card">
        <div class="result-head">
          <b>${
            lifted
              ? 'Kalem kalktı'
              : startBlocks && !result.missedSection
                ? 'Yanlış yerden başladın'
                : msg.title
          }</b>
          <span class="result-score">${pct(result.score)}</span>
        </div>
        <p class="fine" style="margin:4px 0 12px">${
          lifted
            ? `${strokes.length} hamlede yazdın. Bağlantıda iki harf <b>tek hamlede</b>, kalem kaldırmadan yazılır — asıl öğrenilen şey bu.`
            : startBlocks
              ? `Yeşil noktadan başlamalısın${start?.note ? ` — ${start.note.toLocaleLowerCase('tr')}` : ''}. ${msg.detail}`
              : startOff
                ? `${msg.detail}<br><span class="fine">Başlangıç noktan kaymış${
                    start?.note ? ` — ${start.note.toLocaleLowerCase('tr')}` : ''
                  }. Bu deneme için not kırılmadı.</span>`
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
        ${
          info.join
            ? `<div class="bar-row">
                 <span class="bar-name">Hamle</span>
                 <div class="bar-track"><i style="width:${strokes.length === 1 ? 100 : 30}%;background:${
                   strokes.length === 1 ? 'var(--mint)' : 'var(--coral)'
                 }"></i></div>
                 <b>${strokes.length}</b>
               </div>`
            : ''
        }
        <p class="fine">${
          passed
            ? `${passedTotal()} / ${TOTAL} tamam.`
            : exam
              ? 'Sınavda tek deneme var — bu puan kaydedildi.'
              : 'Bu deneme sayılmadı — kademe ilerlemedi, tekrar dene.'
        }</p>
      </div>`;

    celebrate(passed, result.score);

    if (!finished) {
      checkBtn.textContent = passed ? 'Sonraki' : 'Tekrar dene';
      stepLabel.textContent = step().label;
      return;
    }
    await finishLesson(checks);
  }

  /** Puanı saydır, doğruysa patlat, yanlışsa salla. */
  function celebrate(passed: boolean, score: number): void {
    const scoreEl = resultBox.querySelector<HTMLElement>('.result-score');
    if (scoreEl) countUp(scoreEl, Math.round(score * 100));
    const card = resultBox.querySelector('.result-card');
    if (!card) return;
    if (passed) burst(card, score >= 0.85 ? 20 : 12);
    else shake(card);
  }

  /**
   * Ders bitti: denemelerin ORTALAMASI tek bir FSRS notuna çevriliyor.
   * Her deneme ayrı not olsaydı yedi tekrar kartı yapay olarak ileri atardı.
   */
  async function finishLesson(lastChecks: string[]): Promise<void> {
    clearProgress();
    const average = scores.reduce((n, x) => n + x, 0) / Math.max(1, scores.length);

    const cardId = info.join
      ? `join:${target}`
      : kindOf(target) === 'capital'
        ? `capital:${target}`
        : `${kindOf(target)}:${target}:write`;
    await review(cardId, ratingOf(average), lastChecks);
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

    // Yazmayı bitiren harf için TANIMA kartı açılır: yazabilmek tanıyabilmek
    // demek değil (brief 6.1 — лш ile ми görsel olarak ayırt edilemez).
    if (kindOf(target) === 'letter') {
      await ensureCard('letter:read', target, levelOfLetter(target)?.id ?? 'g1');
    }
    // Yazabildiğin kelime artık dikteye de girer — duyup yazmak ayrı beceri.
    const wordEntry = findWord(target);
    if (wordEntry) {
      await ensureCard('word:dictation', target, wordEntry.level.id);
    }

    const dest = await nextAfter(target);
    if (disposed) return;

    sfx('finish');
    resultBox.insertAdjacentHTML(
      'afterbegin',
      `<div class="lesson-done">
         ${mascot(info.element ? 'oval' : 'kanca', { size: 56, mood: 'cheer' })}
       </div>
       <div class="ok" style="text-align:center">
         <b>${exam ? 'Cevap kaydedildi' : 'Ders tamam'}</b> ·
         ${scores.length} deneme, ortalama ${Math.round(average * 100)}
       </div>`,
    );

    nextHash = dest.href;
    checkBtn.textContent = dest.label;

    const done = resultBox.querySelector('.lesson-done');
    if (done) {
      pop(done);
      burst(done, 22);
    }
  }

  return () => {
    disposed = true;
    pointer.detach();
    surface.destroy();
  };
}

function kindOf(subject: string): 'letter' | 'element' | 'word' | 'join' | 'capital' {
  if (capitalOf(subject)) return 'capital';
  if (ELEMENTS.some((e) => e.id === subject)) return 'element';
  if (findJoin(subject)) return 'join';
  return findWord(subject) ? 'word' : 'letter';
}

/**
 * Ders açma: kart yoksa üretir. Kelime dersinde o seviyenin BÜTÜN kelimeleri
 * açılır — oturum sonra kuyruk üzerinden aralarında dolaşır.
 */
async function openLesson(subject: string) {
  const cap = capitalOf(subject);
  if (cap) {
    // Seviyenin bütün büyük harfleri açılır; düğüm bir SET açıyor.
    const levelId = levelOfCapital(cap) ?? 'g1';
    for (const other of CAPITALS[levelId] ?? []) {
      if (other !== cap) await ensureCard('capital', `cap:${other}`, levelId);
    }
    return ensureCard('capital', subject, levelId);
  }

  const element = ELEMENTS.find((e) => e.id === subject);
  if (element) return ensureCard('element:write', subject, 'elements');

  const j = findJoin(subject);
  if (j) {
    for (const other of j.level.joins) {
      if (other !== subject) await ensureCard('join', other, j.level.id);
    }
    return ensureCard('join', subject, j.level.id);
  }

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
