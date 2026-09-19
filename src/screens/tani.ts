// Tanıma alıştırması — brief 7.6.
//
// Yazmak bir beceri, TANIMAK başka bir beceri. `и` ile `ш`yi yazarken ayırt
// edebilmek okurken ayırt edebilmek demek değil; brief 6.1 asıl zorluğu
// "лш ve ми görsel olarak ayırt edilemez" diye anlatıyor. Bu ekran doğrudan
// oraya çalışıyor.
//
// Üç soru, üç yön:
//   1. El yazısı → matbu   (bu hangi harf?)
//   2. Matbu → el yazısı   (bunun el yazısı hangisi?)
//   3. Ses → el yazısı     (duyduğun harf hangisi?)
//
// Şıklar rastgele değil, karışabilecek harflerden (data/confusables.ts).

import { optionsFor } from '../data/confusables';
import { ALPHABET, LEVELS, levelOfLetter } from '../data/curriculum';
import { ensureCard, review, buildQueue, practiceHref } from '../srs/scheduler';
import { CONFUSABLES } from '../data/confusables';
import { Rating } from '../srs/cards';
import { recordReview } from '../srs/stats';
import { pushResult, seenSubjects } from '../srs/session';
import { speak, speechStatus } from '../audio/speech';
import { ensureGuideFont } from '../ui/guide';

type Mode = 'toPrint' | 'toCursive' | 'fromSound';

type Question = {
  mode: Mode;
  prompt: string;
  options: string[];
  answer: string;
};

const LABEL: Record<Mode, string> = {
  toPrint: 'Bu hangi harf?',
  toCursive: 'Bunun el yazısı hangisi?',
  fromSound: 'Duyduğun harf hangisi?',
};

function sayOf(ch: string): string {
  for (const lvl of LEVELS) {
    const l = lvl.letters.find((x) => x.ch === ch);
    if (l) return l.say ?? l.ch;
  }
  return ch;
}

export function render(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'и';
  const hasVoice = speechStatus().ready;

  const questions: Question[] = [
    { mode: 'toPrint', prompt: target, options: optionsFor(target, 4, ALPHABET), answer: target },
    { mode: 'toCursive', prompt: target, options: optionsFor(target, 4, ALPHABET), answer: target },
  ];
  // Sessiz cihazda ses sorusu sorulmaz — cevaplanamaz bir soru hata sayılmamalı.
  if (hasVoice) {
    questions.push({
      mode: 'fromSound',
      prompt: target,
      options: optionsFor(target, 4, ALPHABET),
      answer: target,
    });
  }

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
        <b class="as-text" id="qLabel">${LABEL[questions[0]!.mode]}</b>
        <span id="qCount">1 / ${questions.length}</span>
      </div>
      <span style="width:44px"></span>
    </div>
    <div class="step-dots" id="dots"></div>
    <div id="quiz"></div>
  `;

  const quizBox = root.querySelector<HTMLElement>('#quiz')!;
  const qLabel = root.querySelector<HTMLElement>('#qLabel')!;
  const qCount = root.querySelector<HTMLElement>('#qCount')!;
  const dotsBox = root.querySelector<HTMLElement>('#dots')!;

  const drawDots = () => {
    dotsBox.innerHTML = `<span class="dot-group">${questions
      .map((_, i) => `<i class="${i < index ? 'on' : ''}"></i>`)
      .join('')}</span>`;
  };

  function paint(): void {
    const q = questions[index]!;
    qLabel.textContent = LABEL[q.mode];
    qCount.textContent = `${index + 1} / ${questions.length}`;
    drawDots();

    const promptHtml =
      q.mode === 'toPrint'
        ? `<div class="quiz-prompt cursive">${q.prompt}</div>`
        : q.mode === 'toCursive'
          ? `<div class="quiz-prompt print">${q.prompt}</div>`
          : `<button class="quiz-sound" id="replay">🔊 Tekrar dinle</button>`;

    const optionClass = q.mode === 'toPrint' ? 'print' : 'cursive';
    quizBox.innerHTML = `
      <div class="card" style="text-align:center">${promptHtml}</div>
      <div class="quiz-grid">
        ${q.options
          .map(
            (o) => `<button class="quiz-option ${optionClass}" data-opt="${o}">${o}</button>`,
          )
          .join('')}
      </div>
      <div id="quizFoot"></div>
    `;

    if (q.mode === 'fromSound') {
      speak(sayOf(target));
      root.querySelector('#replay')!.addEventListener('click', () => speak(sayOf(target)));
    }

    for (const btn of quizBox.querySelectorAll<HTMLButtonElement>('.quiz-option')) {
      btn.addEventListener('click', () => choose(btn));
    }
  }

  function choose(btn: HTMLButtonElement): void {
    if (answered) return;
    answered = true;
    const q = questions[index]!;
    const picked = btn.dataset['opt']!;
    const ok = picked === q.answer;
    if (ok) correct++;

    for (const b of quizBox.querySelectorAll<HTMLButtonElement>('.quiz-option')) {
      b.disabled = true;
      if (b.dataset['opt'] === q.answer) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    }

    const foot = quizBox.querySelector<HTMLElement>('#quizFoot')!;
    foot.innerHTML = `
      <div class="${ok ? 'ok' : 'warn'}" style="margin-top:12px">
        ${
          ok
            ? 'Doğru.'
            : `Yanlış — doğrusu <b>${q.answer}</b>. Seçtiğin <b>${picked}</b> buna çok benziyor, karıştırmak normal.`
        }
      </div>
      <button class="primary" id="nextQ" style="width:100%;margin-top:10px">
        ${index + 1 < questions.length ? 'Sonraki soru' : 'Bitir'}
      </button>`;

    foot.querySelector('#nextQ')!.addEventListener('click', () => {
      if (index + 1 < questions.length) {
        index++;
        answered = false;
        paint();
      } else {
        void finish();
      }
    });
  }

  async function finish(): Promise<void> {
    index = questions.length;
    drawDots();
    const score = correct / questions.length;
    const rating =
      score === 1 ? Rating.Easy : score >= 0.67 ? Rating.Good : score > 0 ? Rating.Hard : Rating.Again;

    await review(`letter:${target}:read`, rating, score < 1 ? ['shape'] : []);
    await recordReview();
    // Tanıyabilen için sıradaki adım harf avı: kelime içinde ayırt etmek.
    // Yalnız karışanı olan harflerde anlamlı.
    if ((CONFUSABLES[target] ?? []).length) {
      await ensureCard('letter:hunt', target, levelOfLetter(target)?.id ?? 'g1');
    }
    pushResult({ subject: target, label: target, score, checks: [], at: Date.now() });

    const queue = await buildQueue();
    if (disposed) return;
    const seen = seenSubjects();
    const next = queue.cards.find((c) => c.subject !== target && !seen.has(c.subject));
    nextHash = next ? practiceHref(next) : '#/ozet';

    quizBox.innerHTML = `
      <div class="card" style="text-align:center">
        <div class="result-score" style="font-size:40px">${correct} / ${questions.length}</div>
        <h3 style="margin:4px 0 6px">${correct === questions.length ? 'Hepsi doğru' : 'Tanıma bitti'}</h3>
        <p class="fine" style="margin:0 0 14px">
          ${
            correct === questions.length
              ? 'Bu harfi karışanlardan ayırt ediyorsun.'
              : 'Karıştırdığın harfler tekrar kuyruğuna girdi.'
          }
        </p>
        <button class="primary" id="go" style="width:100%">
          ${next ? `Devam · ${queue.total}` : 'Oturumu bitir'}
        </button>
      </div>`;
    quizBox.querySelector('#go')!.addEventListener('click', () => {
      location.hash = nextHash;
    });
  }

  void (async () => {
    await Promise.all([ensureGuideFont(), ensureCard('letter:read', target, levelOfLetter(target)?.id ?? 'g1')]);
    if (!disposed) paint();
  })();

  return () => {
    disposed = true;
  };
}
