// Cümle dizme — kelimeleri doğru sıraya koy.
//
// `kur` ekranının bir üst basamağı: orada harfler kelimeyi kuruyordu, burada
// kelimeler cümleyi kuruyor. Ölçtüğü şey el yazısı değil SÖZ DİZİMİ — Rusça
// kelime sırası Türkçeden farklı ve cümleyi yazabilmek sırayı bilmek demek
// değil.
//
// Kelimeler EL YAZISIYLA basılı: sırayı bulmak için önce her kelimeyi
// okuman gerekiyor, yani okuma da ölçülüyor.

import { findSentence, wordsOf, type Sentence } from '../data/sentences';
import { ensureCard, review } from '../srs/scheduler';
import { nextAfter } from '../srs/flow';
import { Rating } from '../srs/cards';
import { recordReview } from '../srs/stats';
import { pushResult } from '../srs/session';
import { speak, speechStatus } from '../audio/speech';
import { sfx } from '../audio/sfx';
import { burst, shake } from '../ui/celebrate';
import { ensureGuideFont } from '../ui/guide';

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function render(root: HTMLElement, id?: string): () => void {
  const sentence = findSentence(id ?? 's1');

  root.className = 'screen';
  if (!sentence) {
    root.innerHTML = `<div class="warn">Böyle bir cümle yok: <code>${id}</code></div>
      <a class="btn primary on-blue" href="#/patika"
         style="display:block;text-align:center;text-decoration:none">Patikaya dön</a>`;
    return () => {};
  }
  const sen: Sentence = sentence;
  const words = wordsOf(sen);

  /** Karo havuzu. İki kelime aynı olabilir, o yüzden kimlik taşıyor. */
  const tiles = shuffle(words.map((w, i) => ({ id: i, w }))).map((t) => ({ ...t, used: false }));
  /** Seçilen sıra — karo kimlikleri. */
  const chosen: number[] = [];

  let mistakes = 0;
  let done = false;
  let disposed = false;
  let nextHash = '#/ozet';

  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b class="as-text">Cümle diz</b>
        <span>Kelimeleri doğru sıraya koy</span>
      </div>
      <button id="say" class="ghost" style="min-height:38px;padding:8px 13px" title="Dinle">🔊</button>
    </div>

    <div class="card" style="text-align:center">
      <div class="build-meaning">${sen.tr}</div>
      <div class="order-line" id="line"></div>
    </div>

    <div class="order-pool" id="pool"></div>
    <div id="orderFoot"></div>
  `;

  const lineBox = root.querySelector<HTMLElement>('#line')!;
  const poolBox = root.querySelector<HTMLElement>('#pool')!;
  const foot = root.querySelector<HTMLElement>('#orderFoot')!;
  const sayBtn = root.querySelector<HTMLButtonElement>('#say')!;

  const paint = () => {
    lineBox.innerHTML = chosen.length
      ? chosen
          .map((tid, i) => {
            const t = tiles.find((x) => x.id === tid)!;
            return `<button class="order-word chosen cursive" data-pos="${i}">${t.w}</button>`;
          })
          .join('')
      : `<span class="order-empty">Kelimeleri aşağıdan seç</span>`;

    poolBox.innerHTML = tiles
      .map(
        (t) =>
          `<button class="order-word cursive" data-tile="${t.id}"${t.used ? ' disabled' : ''}>${t.w}</button>`,
      )
      .join('');
  };

  root.addEventListener('click', (e) => {
    if (done) return;
    const el = e.target as HTMLElement;
    const tile = el.closest<HTMLElement>('[data-tile]');
    if (tile) {
      const t = tiles.find((x) => x.id === Number(tile.dataset['tile']));
      if (!t || t.used) return;
      t.used = true;
      chosen.push(t.id);
      sfx('tap');
      paint();
      if (chosen.length === words.length) check();
      return;
    }
    // Dizilmiş kelimeye basınca havuza döner — yanlış sırayı düzeltmenin yolu.
    const pos = el.closest<HTMLElement>('[data-pos]');
    if (pos) {
      const [tid] = chosen.splice(Number(pos.dataset['pos']), 1);
      const t = tiles.find((x) => x.id === tid);
      if (t) t.used = false;
      sfx('tap');
      paint();
    }
  });

  function check(): void {
    const guess = chosen.map((tid) => tiles.find((x) => x.id === tid)!.w);
    if (guess.join(' ') === words.join(' ')) {
      done = true;
      sfx('correct');
      burst(lineBox, 16);
      void finish();
      return;
    }
    mistakes++;
    sfx('wrong');
    shake(lineBox);
    // Baştan doğru olan önek KALIR; gerisi havuza döner. Tamamen sıfırlamak
    // uzun cümlede cezalandırıcı oluyor.
    let keep = 0;
    while (keep < guess.length && guess[keep] === words[keep]) keep++;
    for (const tid of chosen.splice(keep)) {
      const t = tiles.find((x) => x.id === tid);
      if (t) t.used = false;
    }
    setTimeout(paint, 380);
  }

  async function finish(): Promise<void> {
    const score = Math.max(0, 1 - mistakes * 0.25);
    const rating =
      mistakes === 0
        ? Rating.Easy
        : mistakes === 1
          ? Rating.Good
          : mistakes <= 3
            ? Rating.Hard
            : Rating.Again;

    await review(`sentence:${sen.id}:order`, rating, mistakes ? ['shape'] : []);
    await recordReview();
    pushResult({ subject: sen.id, label: sen.ru, score, checks: [], at: Date.now() });

    const dest = await nextAfter(sen.id);
    if (disposed) return;
    nextHash = dest.href;

    foot.innerHTML = `
      <div class="${mistakes === 0 ? 'ok' : 'warn'}" style="margin-top:14px">
        <b class="cursive" style="font-size:20px">${sen.ru}</b><br>
        ${mistakes === 0 ? 'İlk denemede doğru sıraladın.' : `${mistakes} yanlış deneme.`}
      </div>
      <button class="primary on-blue" id="go" style="width:100%">${dest.label}</button>`;
    foot.querySelector('#go')!.addEventListener('click', () => {
      location.hash = nextHash;
    });
  }

  sayBtn.addEventListener('click', () => {
    if (!speak(sen.ru)) {
      sayBtn.textContent = '—';
      setTimeout(() => (sayBtn.textContent = '🔊'), 1600);
    }
  });
  if (!speechStatus().ready) sayBtn.style.opacity = '.45';

  paint();
  void (async () => {
    await Promise.all([ensureGuideFont(), ensureCard('sentence:order', sen.id, sen.after)]);
  })();

  return () => {
    disposed = true;
  };
}
