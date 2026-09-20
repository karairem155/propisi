// Kelime kurma — harfleri sırayla diz.
//
// Uygulamanın alıştırmaları neredeyse tamamen ÇİZİMDİ: yaz, yaz, duy-yaz.
// Yazmak tek kanal; bir kelimeyi hangi harflerden kurulduğunu bilmeden de
// kopyalayabilirsin. Bu ekran yazmayı tamamen çıkarıp geriye sadece
// İMLÂYI bırakıyor — hangi harf, hangi sırada.
//
// Çeldirici harfler rastgele değil: kelimenin kendi harflerinin karışanları
// (data/confusables.ts). `мама` kurarken çeldirici `л` ve `и` oluyor, çünkü
// el yazısında `м` ile karışan tam olarak onlar. Rastgele `ж` koymak hiçbir
// şey ölçmezdi.

import { CONFUSABLES } from '../data/confusables';
import { findWord } from '../data/curriculum';
import { ensureCard, review } from '../srs/scheduler';
import { nextAfter } from '../srs/flow';
import { Rating } from '../srs/cards';
import { recordReview } from '../srs/stats';
import { pushResult } from '../srs/session';
import { speak, speechStatus } from '../audio/speech';
import { sfx } from '../audio/sfx';
import { burst, shake } from '../ui/celebrate';
import { ensureGuideFont } from '../ui/guide';

/** Kelimenin harflerinden türeyen çeldiriciler. */
function decoys(word: string, count: number): string[] {
  const own = new Set([...word]);
  const pool: string[] = [];
  for (const ch of own) {
    for (const near of CONFUSABLES[ch] ?? []) {
      if (!own.has(near) && !pool.includes(near)) pool.push(near);
    }
  }
  // Karışanı olmayan kelimeler için yedek: alfabeden değil, kelimenin
  // harflerini ikizleyerek — yine de anlamlı bir yanılgı.
  while (pool.length < count) pool.push([...own][pool.length % own.size]!);
  return pool.slice(0, count);
}

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
  const meaning = entry?.word.tr ?? '';
  const letters = [...target];

  /** Yuvalara konan harfler; boş yuva `null`. */
  const slots: (string | null)[] = letters.map(() => null);
  /** Havuzdaki harfler — hangi karonun hangi yuvaya gittiğini izlemek için. */
  const tiles = shuffle([...letters, ...decoys(target, Math.min(3, letters.length))]).map(
    (ch, i) => ({ id: i, ch, used: false }),
  );
  /** Yuva → karo kimliği. */
  const placed: (number | null)[] = letters.map(() => null);

  let mistakes = 0;
  let done = false;
  let disposed = false;
  let nextHash = '#/ozet';

  root.className = 'screen';
  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b class="as-text">Kelime kur</b>
        <span>Harfleri doğru sırayla diz</span>
      </div>
      <button id="say" class="ghost" style="min-height:38px;padding:8px 13px" title="Dinle">🔊</button>
    </div>

    <div class="card" style="text-align:center">
      <div class="build-meaning">${meaning}</div>
      <div class="build-slots" id="slots"></div>
    </div>

    <div class="build-tiles" id="tiles"></div>
    <div id="buildFoot"></div>
  `;

  const slotBox = root.querySelector<HTMLElement>('#slots')!;
  const tileBox = root.querySelector<HTMLElement>('#tiles')!;
  const foot = root.querySelector<HTMLElement>('#buildFoot')!;
  const sayBtn = root.querySelector<HTMLButtonElement>('#say')!;

  const paint = () => {
    slotBox.innerHTML = slots
      .map(
        (ch, i) =>
          `<button class="build-slot${ch ? ' filled' : ''}" data-slot="${i}">${ch ?? ''}</button>`,
      )
      .join('');
    tileBox.innerHTML = tiles
      .map(
        (t) =>
          `<button class="build-tile" data-tile="${t.id}"${t.used ? ' disabled' : ''}>${t.ch}</button>`,
      )
      .join('');
  };

  function place(tileId: number): void {
    if (done) return;
    const tile = tiles.find((t) => t.id === tileId);
    if (!tile || tile.used) return;
    const free = slots.findIndex((s) => s === null);
    if (free < 0) return;
    slots[free] = tile.ch;
    placed[free] = tile.id;
    tile.used = true;
    sfx('tap');
    paint();
    if (slots.every((s) => s !== null)) check();
  }

  /** Dolu yuvaya basınca harf havuza döner — geri alma yolu şart. */
  function unplace(index: number): void {
    if (done) return;
    const tileId = placed[index];
    if (tileId === null || tileId === undefined) return;
    const tile = tiles.find((t) => t.id === tileId);
    if (tile) tile.used = false;
    slots[index] = null;
    placed[index] = null;
    sfx('tap');
    paint();
  }

  root.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    const tile = el.closest<HTMLElement>('[data-tile]');
    if (tile) return place(Number(tile.dataset['tile']));
    const slot = el.closest<HTMLElement>('[data-slot]');
    if (slot) unplace(Number(slot.dataset['slot']));
  });

  function check(): void {
    const guess = slots.join('');
    if (guess === target) {
      done = true;
      sfx('correct');
      burst(slotBox, 16);
      void finish();
      return;
    }
    // Yanlış: hangi yuvaların yanlış olduğunu göster, onları geri al.
    mistakes++;
    sfx('wrong');
    shake(slotBox);
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === letters[i]) continue;
      const tile = tiles.find((t) => t.id === placed[i]);
      if (tile) tile.used = false;
      slots[i] = null;
      placed[i] = null;
    }
    setTimeout(paint, 380);
  }

  async function finish(): Promise<void> {
    // Puan hata sayısından: ilk denemede doğru = 1, her hata dörtte bir götürür.
    const score = Math.max(0, 1 - mistakes * 0.25);
    const rating =
      mistakes === 0
        ? Rating.Easy
        : mistakes === 1
          ? Rating.Good
          : mistakes <= 3
            ? Rating.Hard
            : Rating.Again;

    await review(`word:${target}:build`, rating, mistakes ? ['shape'] : []);
    await recordReview();
    pushResult({
      subject: target,
      label: target,
      score,
      checks: mistakes ? ['shape'] : [],
      at: Date.now(),
    });

    const dest = await nextAfter(target);
    if (disposed) return;

    foot.innerHTML = `
      <div class="${mistakes === 0 ? 'ok' : 'warn'}" style="margin-top:14px">
        ${
          mistakes === 0
            ? `<b>${target}</b> — ilk denemede doğru dizdin.`
            : `<b>${target}</b> · ${mistakes} yanlış deneme. Karıştırdığın harfler tekrara girdi.`
        }
      </div>
      <button class="primary on-blue" id="go" style="width:100%">${dest.label}</button>`;
    foot.querySelector('#go')!.addEventListener('click', () => {
      location.hash = nextHash;
    });
    nextHash = dest.href;
  }

  sayBtn.addEventListener('click', () => {
    if (!speak(target)) {
      sayBtn.textContent = '—';
      setTimeout(() => (sayBtn.textContent = '🔊'), 1600);
    }
  });
  if (!speechStatus().ready) sayBtn.style.opacity = '.45';

  paint();
  void (async () => {
    await Promise.all([
      ensureGuideFont(),
      ensureCard('word:build', target, entry?.level.id ?? 'g1'),
    ]);
    if (!disposed && speechStatus().ready) speak(target);
  })();

  return () => {
    disposed = true;
  };
}
