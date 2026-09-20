// Başlangıç noktası doğrulama sayfası.
//
// data/starts.ts pedagojik veri, ölçüm değil — propisi geleneğinden türetildi.
// 33 harfi tek tek açıp kontrol etmek yerine hepsi burada yan yana: yeşil nokta
// kalemin başlaması gereken yer. Yanlış duran varsa starts.ts'te düzeltilir.
//
// Emin olmadıklarım üstte ayrı bölümde — önce onlara bakılmalı.

import { ALPHABET } from '../data/curriculum';
import { STARTS, unverified } from '../data/starts';
import { drawStartMarker, ensureGuideFont, measureGuide, startPointOf } from '../ui/guide';
import { DEFAULT_PAPER } from '../ui/paper';

const CELL = 108;
const ROW_HEIGHT = 44;

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  const shaky = new Set(unverified());

  const cells = (list: string[]) =>
    list
      .map(
        (ch) => `<div class="start-cell${shaky.has(ch) ? ' shaky' : ''}">
          <canvas data-ch="${ch}" width="${CELL}" height="${CELL}"></canvas>
          <b>${ch}</b>
          <span>${STARTS[ch]?.note ?? '—'}</span>
        </div>`,
      )
      .join('');

  const sure = ALPHABET.filter((ch) => STARTS[ch] && !shaky.has(ch));
  const unsure = ALPHABET.filter((ch) => shaky.has(ch));
  const missing = ALPHABET.filter((ch) => !STARTS[ch]);

  root.innerHTML = `
    <div class="warn">
      <b>Bu veri doğrulanmadı.</b> Propisi geleneğinden türetildi, bir kaynaktan
      kopyalanmadı. Yeşil nokta kalemin <b>başlaması gereken</b> yer. Yanlış duran
      varsa <code>src/data/starts.ts</code> içinde düzeltilir.
    </div>

    <h2>Önce bunlara bak · ${unsure.length}</h2>
    <div class="card"><div class="start-grid">${cells(unsure)}</div></div>

    <h2>Emin olduklarım · ${sure.length}</h2>
    <div class="card"><div class="start-grid">${cells(sure)}</div></div>

    ${
      missing.length
        ? `<h2>Tanımsız · ${missing.length}</h2>
           <div class="card"><p class="fine" style="margin:0">
             ${missing.join(' · ')} — bu harflerin başlangıç noktası yok, denetim yapılmıyor.
           </p></div>`
        : ''
    }
  `;

  let disposed = false;
  void (async () => {
    await ensureGuideFont();
    if (disposed) return;

    const paper = { ...DEFAULT_PAPER, rowHeight: ROW_HEIGHT };
    for (const canvas of root.querySelectorAll<HTMLCanvasElement>('canvas[data-ch]')) {
      const ch = canvas.dataset['ch']!;
      const start = STARTS[ch];
      if (!start) continue;

      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = CELL * dpr;
      canvas.height = CELL * dpr;
      canvas.style.width = `${CELL}px`;
      canvas.style.height = `${CELL}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      // Satır çizgileri
      const baseline = CELL * 0.68;
      ctx.strokeStyle = 'rgba(29,63,143,.28)';
      ctx.lineWidth = 1;
      for (const y of [baseline, baseline - ROW_HEIGHT]) {
        ctx.beginPath();
        ctx.moveTo(6, y);
        ctx.lineTo(CELL - 6, y);
        ctx.stroke();
      }

      const box = measureGuide(ctx, ch, paper, CELL, CELL);
      box.baseline = baseline;
      ctx.fillStyle = '#14213d';
      ctx.font = `400 ${box.fontSize}px ${box.family}`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(ch, box.x, baseline);

      drawStartMarker(ctx, startPointOf(box, start, ROW_HEIGHT), ROW_HEIGHT);
    }
  })();

  return () => {
    disposed = true;
  };
}
