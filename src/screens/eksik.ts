// Eksik harf — el yazısı kelimede boşluğu doldur.
//
// Bu ekran uygulamanın en zor ayrımını en ucuz yoldan ölçüyor. Kelime EL
// YAZISIYLA yazılı ve bir harfi eksik; şıklar o harfin karışanları. Yani
// `шиншилла` içinde eksik olanın `и` mi `ш` mı olduğunu anlamak için
// komşularını okuman gerekiyor — brief 6.1'in tam merkezi.
//
// Yazmıyorsun, çiziyor da değilsin: yalnız OKUYORSUN. Yazabildiğini okuyamamak
// bu alfabede çok yaygın; ayrı bir alıştırma hak ediyor.

import { CONFUSABLES, optionsFor } from '../data/confusables';
import { ALPHABET, findWord } from '../data/curriculum';
import { ensureCard, review } from '../srs/scheduler';
import { nextAfter } from '../srs/flow';
import { Rating } from '../srs/cards';
import { recordReview } from '../srs/stats';
import { pushResult } from '../srs/session';
import { speak, speechStatus } from '../audio/speech';
import { sfx } from '../audio/sfx';
import { burst, shake } from '../ui/celebrate';
import { ensureGuideFont } from '../ui/guide';

type Question = { hidden: number; answer: string; options: string[] };

/**
 * Hangi harfler gizlenecek?
 *
 * Karışanı OLAN harfler önce: `дом` içinde `о`yu gizlemek `д`yi gizlemekten
 * daha öğretici, çünkü `о` ile `а` el yazısında birbirine benziyor. Karışanı
 * olmayan harf gizlenirse soru "bu kelimeyi hatırlıyor musun"a dönüşüyor.
 */
function buildQuestions(word: string, count: number): Question[] {
  const chars = [...word];
  const ranked = chars
    .map((ch, i) => ({ ch, i, score: (CONFUSABLES[ch] ?? []).length }))
    .sort((a, b) => b.score - a.score);

  const out: Question[] = [];
  for (const { ch, i } of ranked) {
    if (out.length >= count) break;
    if (out.some((q) => q.hidden === i)) continue;
    out.push({ hidden: i, answer: ch, options: optionsFor(ch, 4, ALPHABET) });
  }
  // Soru sırası kelimedeki sıraya göre — soldan sağa okumak doğal.
  return out.sort((a, b) => a.hidden - b.hidden);
}

export function render(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'мама';
  const entry = findWord(target);
  const questions = buildQuestions(target, Math.min(3, target.length));

  let index = 0;
  let correct = 0;
  let answered = false;
  let disposed = false;
  let nextHash = '#/ozet';

  root.className = 'screen';
  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b class="as-text">Eksik harf</b>
        <span id="qCount">1 / ${questions.length}</span>
      </div>
      <button id="say" class="ghost" style="min-height:38px;padding:8px 13px" title="Dinle">🔊</button>
    </div>
    <div class="step-dots" id="dots"></div>
    <div id="quiz"></div>
  `;

  const quizBox = root.querySelector<HTMLElement>('#quiz')!;
  const dotsBox = root.querySelector<HTMLElement>('#dots')!;
  const countLabel = root.querySelector<HTMLElement>('#qCount')!;
  const sayBtn = root.querySelector<HTMLButtonElement>('#say')!;

  const drawDots = () => {
    dotsBox.innerHTML = `<span class="dot-group">${questions
      .map((_, i) => `<i class="${i < index ? 'on' : ''}"></i>`)
      .join('')}</span>`;
  };

  function paint(): void {
    const q = questions[index]!;
    countLabel.textContent = `${index + 1} / ${questions.length}`;
    drawDots();

    // Eksik harf yerine alt çizgi: el yazısında boşluk bırakmak kelimeyi
    // ikiye bölüyor, alt çizgi "burada bir harf var" diyor.
    const shown = [...target]
      .map((ch, i) => (i === q.hidden ? `<span class="gap">_</span>` : ch))
      .join('');

    quizBox.innerHTML = `
      <div class="card" style="text-align:center">
        <div class="gap-word cursive">${shown}</div>
        <div class="fine" style="margin:6px 0 0">${entry?.word.tr ?? ''}</div>
      </div>
      <div class="quiz-grid">
        ${q.options
          .map((o) => `<button class="quiz-option cursive" data-opt="${o}">${o}</button>`)
          .join('')}
      </div>
      <div id="gapFoot"></div>`;

    answered = false;
    for (const b of quizBox.querySelectorAll<HTMLButtonElement>('.quiz-option')) {
      b.addEventListener('click', () => answer(b, q));
    }
  }

  function answer(btn: HTMLButtonElement, q: Question): void {
    if (answered) return;
    answered = true;
    const ok = btn.dataset['opt'] === q.answer;
    if (ok) correct++;
    sfx(ok ? 'correct' : 'wrong');

    for (const b of quizBox.querySelectorAll<HTMLButtonElement>('.quiz-option')) {
      b.disabled = true;
      if (b.dataset['opt'] === q.answer) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    }
    (ok ? burst : shake)(btn);

    const foot = quizBox.querySelector<HTMLElement>('#gapFoot')!;
    foot.innerHTML = `
      <div class="${ok ? 'ok' : 'warn'}" style="margin-top:12px">
        ${
          ok
            ? `Doğru — <b class="cursive">${target}</b>`
            : `Doğrusu <b class="cursive">${q.answer}</b>. Tam kelime:
               <b class="cursive">${target}</b>`
        }
      </div>
      <button class="primary on-blue" id="next" style="width:100%">
        ${index + 1 < questions.length ? 'Sonraki' : 'Bitir'}
      </button>`;
    foot.querySelector('#next')!.addEventListener('click', () => {
      index++;
      if (index < questions.length) paint();
      else void finish();
    });
  }

  async function finish(): Promise<void> {
    const score = correct / Math.max(1, questions.length);
    const rating =
      score === 1
        ? Rating.Easy
        : score >= 0.6
          ? Rating.Good
          : score > 0
            ? Rating.Hard
            : Rating.Again;

    await review(`word:${target}:gap`, rating, score < 1 ? ['shape'] : []);
    await recordReview();
    pushResult({ subject: target, label: target, score, checks: [], at: Date.now() });

    const dest = await nextAfter(target);
    if (disposed) return;
    nextHash = dest.href;

    drawDots();
    quizBox.innerHTML = `
      <div class="card" style="text-align:center">
        <div class="result-score" style="font-size:40px">${correct} / ${questions.length}</div>
        <h3 style="margin:4px 0 6px">${correct === questions.length ? 'Hepsi doğru' : 'Eksik harf bitti'}</h3>
        <p class="fine" style="margin:0 0 14px">
          ${
            correct === questions.length
              ? 'Kelimeyi harf harf okuyabiliyorsun.'
              : 'Karıştırdığın harfler tekrar kuyruğuna girdi.'
          }
        </p>
        <button class="primary" id="go" style="width:100%">${dest.label}</button>
      </div>`;
    quizBox.querySelector('#go')!.addEventListener('click', () => {
      location.hash = nextHash;
    });
  }

  sayBtn.addEventListener('click', () => {
    if (!speak(target)) {
      sayBtn.textContent = '—';
      setTimeout(() => (sayBtn.textContent = '🔊'), 1600);
    }
  });
  if (!speechStatus().ready) sayBtn.style.opacity = '.45';

  void (async () => {
    await Promise.all([
      ensureGuideFont(),
      ensureCard('word:gap', target, entry?.level.id ?? 'g1'),
    ]);
    if (!disposed) paint();
  })();

  return () => {
    disposed = true;
  };
}
