// Cümle okuma — el yazısı cümleyi anla.
//
// Yazabilmek okuyabilmek değil. Kelime düzeyinde bunu `eslestir` ölçüyordu
// ama CÜMLE düzeyinde hiçbir şey yoktu: el yazısıyla yazılmış bir cümleyi
// baştan sona okumak, tek tek kelime tanımaktan başka bir beceri — gözün
// kelime sınırlarını, büyük harfi ve noktayı da çözmesi gerekiyor.
//
// Çeldirici anlamlar rastgele cümlelerden değil, AYNI SEVİYENİN cümlelerinden
// geliyor: aynı harf havuzundan kurulu oldukları için el yazısında birbirine
// benziyorlar. Alakasız bir cümleyi çeldirici yapmak soruyu bedava yapardı.

import { findSentence, SENTENCES, type Sentence } from '../data/sentences';
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

/** Aynı seviyeden üç çeldirici; yetmezse komşu seviyelerden tamamlanıyor. */
function optionsFor(target: Sentence): Sentence[] {
  const sameLevel = SENTENCES.filter((s) => s.after === target.after && s.id !== target.id);
  const others = SENTENCES.filter((s) => s.after !== target.after && s.id !== target.id);
  const decoys = [...shuffle(sameLevel), ...shuffle(others)].slice(0, 3);
  return shuffle([target, ...decoys]);
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
  const options = optionsFor(sen);

  let answered = false;
  let disposed = false;
  let nextHash = '#/ozet';

  root.innerHTML = `
    <div class="practice-top">
      <a class="back" href="#/">✕</a>
      <div class="practice-title">
        <b class="as-text">Cümle okuma</b>
        <span>Bu cümle ne diyor?</span>
      </div>
      <button id="say" class="ghost" style="min-height:38px;padding:8px 13px" title="Dinle">🔊</button>
    </div>

    <div class="card" style="text-align:center">
      <div class="read-sentence cursive">${sen.ru}</div>
    </div>

    <div class="read-options" id="opts">
      ${options
        .map((o) => `<button class="read-option" data-id="${o.id}">${o.tr}</button>`)
        .join('')}
    </div>
    <div id="readFoot"></div>
  `;

  const foot = root.querySelector<HTMLElement>('#readFoot')!;
  const sayBtn = root.querySelector<HTMLButtonElement>('#say')!;

  for (const b of root.querySelectorAll<HTMLButtonElement>('.read-option')) {
    b.addEventListener('click', () => answer(b));
  }

  function answer(btn: HTMLButtonElement): void {
    if (answered) return;
    answered = true;
    const ok = btn.dataset['id'] === sen.id;
    sfx(ok ? 'correct' : 'wrong');

    for (const b of root.querySelectorAll<HTMLButtonElement>('.read-option')) {
      b.disabled = true;
      if (b.dataset['id'] === sen.id) b.classList.add('right');
      else if (b === btn) b.classList.add('wrong');
    }
    (ok ? burst : shake)(btn);
    void finish(ok);
  }

  async function finish(ok: boolean): Promise<void> {
    await review(`sentence:${sen.id}:read`, ok ? Rating.Easy : Rating.Again, ok ? [] : ['shape']);
    await recordReview();
    pushResult({
      subject: sen.id,
      label: sen.ru,
      score: ok ? 1 : 0,
      checks: ok ? [] : ['shape'],
      at: Date.now(),
    });

    const dest = await nextAfter(sen.id);
    if (disposed) return;
    nextHash = dest.href;

    foot.innerHTML = `
      <div class="${ok ? 'ok' : 'warn'}" style="margin-top:14px">
        <b class="cursive" style="font-size:20px">${sen.ru}</b><br>${sen.tr}
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

  void (async () => {
    await Promise.all([
      ensureGuideFont(),
      ensureCard('sentence:read', sen.id, sen.after),
    ]);
  })();

  return () => {
    disposed = true;
  };
}
