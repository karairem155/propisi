// Eşleştirme — brief 7.6.
//
// El yazısı ↔ Türkçe anlam. Diğer alıştırmalar tek konuya bakıyor; bu aynı anda
// dördünü karşı karşıya getiriyor. Kelimeleri tek tek doğru tanıyıp toplu
// verildiğinde karıştırmak çok yaygın — bu ekran tam onu ölçüyor.
//
// Bir oturumda o seviyenin dört kelimesinin `word:read` kartı birden
// değerlendiriliyor; hata yapılan kelime kendi kartından düşük not alıyor,
// diğerleri etkilenmiyor.

import { findWord, LEVELS, type WordItem } from '../data/curriculum';
import { ensureCard, review } from '../srs/scheduler';
import { nextAfter } from '../srs/flow';
import { Rating } from '../srs/cards';
import { recordReview } from '../srs/stats';
import { pushResult } from '../srs/session';
import { ensureGuideFont } from '../ui/guide';

type Pair = { word: WordItem; done: boolean };

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function render(root: HTMLElement, subject?: string): () => void {
  const target = subject ?? 'мама';
  const entry = findWord(target);
  const level = entry?.level ?? LEVELS[0]!;
  const words = level.words.slice(0, 4);

  const pairs: Pair[] = words.map((word) => ({ word, done: false }));
  const left = shuffle(pairs);
  const right = shuffle(pairs);

  /** Kelime başına hata — her kartın notu kendi hatasına göre. */
  const mistakes = new Map<string, number>();
  /** Seçili düğüm — çiftin kendisi değil, düğümü tutuluyor ki aynı düğmeye
   *  tekrar basınca seçim bırakılabilsin. */
  let selectedBtn: HTMLButtonElement | null = null;
  let locked = false;
  let disposed = false;
  let nextHash = '#/ozet';

  root.className = 'screen';
  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b class="as-text">Eşleştirme</b>
        <span>El yazısını anlamıyla eşleştir</span>
      </div>
      <span style="width:44px"></span>
    </div>
    <div class="note">Önce bir el yazısı, sonra anlamı. Yanlış eşleştirme kaydediliyor.</div>
    <div class="match-grid">
      <div class="match-col" id="left">
        ${left
          .map(
            (p) =>
              `<button class="match-item cursive" data-w="${p.word.ru}" data-side="l">${p.word.ru}</button>`,
          )
          .join('')}
      </div>
      <div class="match-col" id="right">
        ${right
          .map(
            (p) =>
              `<button class="match-item" data-w="${p.word.ru}" data-side="r">${p.word.tr}</button>`,
          )
          .join('')}
      </div>
    </div>
    <div id="matchFoot"></div>
  `;

  const foot = root.querySelector<HTMLElement>('#matchFoot')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.match-item')];

  const clearSelection = () => {
    for (const b of buttons) b.classList.remove('sel');
  };

  function select(btn: HTMLButtonElement): void {
    clearSelection();
    btn.classList.add('sel');
    selectedBtn = btn;
  }

  function onPick(btn: HTMLButtonElement): void {
    if (locked || btn.disabled) return;

    // Hiç seçim yok → seç.
    if (!selectedBtn) {
      select(btn);
      return;
    }
    // Aynı düğmeye tekrar → seçimi bırak.
    if (selectedBtn === btn) {
      clearSelection();
      selectedBtn = null;
      return;
    }
    // Aynı sütundan başka düğme → seçimi taşı.
    if (selectedBtn.dataset['side'] === btn.dataset['side']) {
      select(btn);
      return;
    }

    // Karşı sütun → eşleştirmeyi dene.
    const first = selectedBtn;
    const wordA = first.dataset['w']!;
    const wordB = btn.dataset['w']!;

    if (wordA === wordB) {
      const pair = pairs.find((x) => x.word.ru === wordA)!;
      pair.done = true;
      for (const b of buttons) {
        if (b.dataset['w'] === wordA) {
          b.classList.remove('sel');
          b.classList.add('right');
          b.disabled = true;
        }
      }
      selectedBtn = null;
      if (pairs.every((x) => x.done)) void finish();
      return;
    }

    // Yanlış eşleştirme — iki kelimeye de hata yazılır, ikisi de karışmış demektir.
    mistakes.set(wordA, (mistakes.get(wordA) ?? 0) + 1);
    mistakes.set(wordB, (mistakes.get(wordB) ?? 0) + 1);

    locked = true;
    btn.classList.add('wrong');
    first.classList.add('wrong');
    setTimeout(() => {
      btn.classList.remove('wrong');
      first.classList.remove('wrong', 'sel');
      selectedBtn = null;
      locked = false;
    }, 650);
  }

  for (const b of buttons) b.addEventListener('click', () => onPick(b));

  async function finish(): Promise<void> {
    const total = [...mistakes.values()].reduce((n, x) => n + x, 0);

    for (const p of pairs) {
      const miss = mistakes.get(p.word.ru) ?? 0;
      const rating = miss === 0 ? Rating.Easy : miss === 1 ? Rating.Good : Rating.Hard;
      await ensureCard('word:read', p.word.ru, level.id);
      await review(`word:${p.word.ru}:read`, rating, miss ? ['shape'] : []);
    }
    await recordReview();
    const score = pairs.length / (pairs.length + total);
    pushResult({ subject: target, label: 'Eşleştirme', score, checks: [], at: Date.now() });

    const step = await nextAfter(target);
    if (disposed) return;
    nextHash = step.href;

    foot.innerHTML = `
      <div class="${total === 0 ? 'ok' : 'warn'}" style="margin-top:14px">
        ${
          total === 0
            ? 'Hepsini ilk denemede eşleştirdin.'
            : `${total} yanlış eşleştirme. Karıştırdığın kelimeler daha sık tekrara girecek.`
        }
      </div>
      <button class="primary" id="go" style="width:100%">${step.label}</button>`;
    foot.querySelector('#go')!.addEventListener('click', () => {
      location.hash = nextHash;
    });
  }

  void (async () => {
    await ensureGuideFont();
    if (disposed) return;
    for (const p of pairs) await ensureCard('word:read', p.word.ru, level.id);
  })();

  return () => {
    disposed = true;
  };
}
