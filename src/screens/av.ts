// Harf avı — brief 7.6, "ambiguity eğitimi".
//
// El yazısıyla yazılmış bir kelimede belirli harfi bul ve işaretle.
// Bu, uygulamanın ayırt etme sorununa EN DOĞRUDAN çalışan alıştırma:
// `шиншилла` kelimesinde `и`leri bulmak için `ш`den ayırmak zorundasın,
// ve ikisi de aynı tekrarlayan elementten oluşuyor (brief 6.1).
//
// Kelime seçimi rastgele değil: hedef harfi İÇEREN ve ona karışan bir harfi de
// içeren kelimeler öne alınıyor. `и` avını `дом`da yapmak hiçbir şey öğretmez.

import { CONFUSABLES } from '../data/confusables';
import { HARD_WORDS, LEVELS, levelOfLetter } from '../data/curriculum';
import { ensureCard, review } from '../srs/scheduler';
import { nextAfter } from '../srs/flow';
import { Rating } from '../srs/cards';
import { recordReview } from '../srs/stats';
import { pushResult } from '../srs/session';
import { ensureGuideFont } from '../ui/guide';

const FAMILY = "'Bad Script', cursive";
const FONT_SIZE = 76;

type Span = { ch: string; x0: number; x1: number; index: number };

/** Hedef harfi içeren, tercihen karışanını da içeren kelimeler. */
function pickWords(target: string, count: number): string[] {
  const pool = [...LEVELS.flatMap((l) => l.words.map((w) => w.ru)), ...HARD_WORDS.map((w) => w.ru)];
  const near = new Set(CONFUSABLES[target] ?? []);

  const withTarget = [...new Set(pool)].filter((w) => w.includes(target));
  // Karışan harfi de içerenler önce — asıl ayrım çalışması orada.
  withTarget.sort((a, b) => {
    const score = (w: string) =>
      [...w].filter((c) => near.has(c)).length * 10 + [...w].filter((c) => c === target).length;
    return score(b) - score(a);
  });
  return withTarget.slice(0, count);
}

export function render(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'и';
  const words = pickWords(target, 3);

  let index = 0;
  let picked = new Set<number>();
  let answered = false;
  let disposed = false;
  const results: boolean[] = [];
  let nextHash = '#/ozet';

  root.className = 'screen';
  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b class="as-text">Harf avı</b>
        <span id="hint">Bütün <b style="font-family:${FAMILY};font-size:19px">${target}</b> harflerini işaretle</span>
      </div>
      <span style="width:44px"></span>
    </div>
    <div class="step-dots" id="dots"></div>
    <div id="hunt"></div>
  `;

  const huntBox = root.querySelector<HTMLElement>('#hunt')!;
  const dotsBox = root.querySelector<HTMLElement>('#dots')!;

  const drawDots = () => {
    dotsBox.innerHTML = `<span class="dot-group">${words
      .map((_, i) => `<i class="${i < index ? 'on' : ''}"></i>`)
      .join('')}</span>`;
  };

  if (!words.length) {
    huntBox.innerHTML = `
      <div class="warn">
        <b>${target}</b> harfini içeren kelime yok — müfredatta bu harfle yazılabilen
        kelime tanımlanmamış. Harf avı bu harf için atlandı.
      </div>
      <a class="btn primary" href="#/" style="display:block;text-align:center;text-decoration:none">Geri dön</a>`;
    return () => {
      disposed = true;
    };
  }

  /** Harflerin yatay sınırları — dokunulan harfi bulmak için. */
  function spansOf(word: string, ctx: CanvasRenderingContext2D, x0: number): Span[] {
    const out: Span[] = [];
    let cursor = x0;
    for (let i = 0; i < word.length; i++) {
      const w = ctx.measureText(word[i]!).width;
      out.push({ ch: word[i]!, x0: cursor, x1: cursor + w, index: i });
      cursor += w;
    }
    return out;
  }

  function paint(): void {
    const word = words[index]!;
    drawDots();
    huntBox.innerHTML = `
      <div class="card" style="padding:10px">
        <canvas id="hcanvas" style="width:100%;display:block"></canvas>
      </div>
      <p class="fine" id="count" style="text-align:center"></p>
      <div id="huntFoot"></div>
      <button class="primary" id="done" style="width:100%;margin-top:6px">İşaretlemeyi bitir</button>
    `;

    const canvas = huntBox.querySelector<HTMLCanvasElement>('#hcanvas')!;
    const cssW = canvas.clientWidth || 320;
    const cssH = Math.round(FONT_SIZE * 1.7);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    let size = FONT_SIZE;
    ctx.font = `400 ${size}px ${FAMILY}`;
    let total = ctx.measureText(word).width;
    if (total > cssW - 24) {
      size *= (cssW - 24) / total;
      ctx.font = `400 ${size}px ${FAMILY}`;
      total = ctx.measureText(word).width;
    }
    const x0 = (cssW - total) / 2;
    const baseline = cssH * 0.68;
    const spans = spansOf(word, ctx, x0);

    const draw = () => {
      ctx.clearRect(0, 0, cssW, cssH);
      // İşaretlenen harflerin arkasına vurgu
      for (const s of spans) {
        if (!picked.has(s.index)) continue;
        ctx.fillStyle = 'rgba(53,199,154,.28)';
        ctx.fillRect(s.x0 - 2, baseline - size * 0.78, s.x1 - s.x0 + 4, size * 1.05);
      }
      ctx.fillStyle = '#14213d';
      ctx.font = `400 ${size}px ${FAMILY}`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(word, x0, baseline);
    };
    draw();

    const countLabel = huntBox.querySelector<HTMLElement>('#count')!;
    const refreshCount = () => {
      countLabel.textContent = `${picked.size} işaretli`;
    };
    refreshCount();

    canvas.addEventListener('pointerdown', (e) => {
      if (answered) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const hit = spans.find((s) => x >= s.x0 && x <= s.x1);
      if (!hit) return;
      if (picked.has(hit.index)) picked.delete(hit.index);
      else picked.add(hit.index);
      draw();
      refreshCount();
    });

    huntBox.querySelector('#done')!.addEventListener('click', () => {
      if (answered) return;
      answered = true;

      const expected = new Set(
        spans.filter((s) => s.ch === target).map((s) => s.index),
      );
      const missed = [...expected].filter((i) => !picked.has(i));
      const wrong = [...picked].filter((i) => !expected.has(i));
      const ok = missed.length === 0 && wrong.length === 0;
      results.push(ok);

      // Doğru harfleri yeşil, yanlış işaretlenenleri mercan göster.
      ctx.clearRect(0, 0, cssW, cssH);
      for (const s of spans) {
        const isTarget = expected.has(s.index);
        const isPicked = picked.has(s.index);
        if (!isTarget && !isPicked) continue;
        ctx.fillStyle = isTarget
          ? 'rgba(53,199,154,.34)'
          : 'rgba(242,112,95,.34)';
        ctx.fillRect(s.x0 - 2, baseline - size * 0.78, s.x1 - s.x0 + 4, size * 1.05);
      }
      ctx.fillStyle = '#14213d';
      ctx.font = `400 ${size}px ${FAMILY}`;
      ctx.fillText(word, x0, baseline);

      const wrongChars = wrong.map((i) => spans[i]!.ch);
      huntBox.querySelector<HTMLElement>('#huntFoot')!.innerHTML = `
        <div class="${ok ? 'ok' : 'warn'}">
          ${
            ok
              ? `Tamamı doğru — ${expected.size} tane ${target} vardı.`
              : `${expected.size} tane <b>${target}</b> vardı.` +
                (missed.length ? ` ${missed.length} tanesini kaçırdın.` : '') +
                (wrongChars.length
                  ? ` <b>${[...new Set(wrongChars)].join(', ')}</b> harfini ${target} sandın — aynı elementten oluşuyorlar.`
                  : '')
          }
        </div>`;

      const btn = huntBox.querySelector<HTMLButtonElement>('#done')!;
      btn.textContent = index + 1 < words.length ? 'Sonraki kelime' : 'Bitir';
      btn.onclick = () => {
        if (index + 1 < words.length) {
          index++;
          picked = new Set();
          answered = false;
          paint();
        } else {
          void finish();
        }
      };
    });
  }

  async function finish(): Promise<void> {
    index = words.length;
    drawDots();
    const score = results.filter(Boolean).length / Math.max(1, results.length);
    const rating =
      score === 1 ? Rating.Easy : score >= 0.6 ? Rating.Good : score > 0 ? Rating.Hard : Rating.Again;

    await review(`letter:${target}:hunt`, rating, score < 1 ? ['humps'] : []);
    await recordReview();
    pushResult({ subject: target, label: target, score, checks: [], at: Date.now() });

    const step = await nextAfter(target);
    if (disposed) return;
    nextHash = step.href;

    huntBox.innerHTML = `
      <div class="card" style="text-align:center">
        <div class="result-score" style="font-size:40px">${results.filter(Boolean).length} / ${results.length}</div>
        <h3 style="margin:4px 0 6px">Harf avı bitti</h3>
        <p class="fine" style="margin:0 0 14px">
          ${
            score === 1
              ? `${target} harfini karışanlardan ayırt ediyorsun.`
              : 'Karıştırdığın yerler tekrar kuyruğuna girdi.'
          }
        </p>
        <button class="primary" id="go" style="width:100%">${step.label}</button>
      </div>`;
    huntBox.querySelector('#go')!.addEventListener('click', () => {
      location.hash = nextHash;
    });
  }

  void (async () => {
    await Promise.all([
      ensureGuideFont(),
      ensureCard('letter:hunt', target, levelOfLetter(target)?.id ?? 'g1'),
    ]);
    if (!disposed) paint();
  })();

  return () => {
    disposed = true;
  };
}
