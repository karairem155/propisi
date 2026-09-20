// Hamle yolu doğrulama sayfası — 33 harf yan yana.
//
// data/hamle.ts pedagojik veri: "kalem şuradan şuraya gider". Doğru durup
// durmadığı ancak GÖRÜLEREK anlaşılıyor. Her hücrede harf soluk, üstünde
// hesaplanan yol var: koyudan açığa doğru renk = zaman, ok = bitiş yönü,
// numaralı noktalar = yazdığım yol noktaları.
//
// Yol harfin dışına taşıyorsa nokta yanlış yere düşmüştür (en yakın mürekkep
// pikseline çekilir, yanlış dala kaçabilir); sıra ters görünüyorsa noktaların
// sırası yanlıştır. İkisi de hamle.ts'te düzeltilir.

import { ALPHABET } from '../data/curriculum';
import { hamleOf } from '../data/hamle';
import { glyphReveal } from '../glyph/reveal';
import { routeStrokes } from '../glyph/route';
import { drawArrow } from '../ui/arrow';
import { cursiveFamily } from '../ui/cursive';
import { ensureGuideFont } from '../ui/guide';

const CELL_W = 210;
const CELL_H = 240;
const FONT = 124;

export function render(root: HTMLElement): () => void {
  root.className = 'screen';

  const withData = ALPHABET.filter((ch) => hamleOf(ch));
  const without = ALPHABET.filter((ch) => !hamleOf(ch));

  root.innerHTML = `
    <div class="warn">
      <b>Hamle verisi doğrulanmadı.</b> Yol harfin üstünde durmalı ve
      numaralar yazma sırasını izlemeli. Yanlış duran
      <code>src/data/hamle.ts</code> içinde düzeltilir.
    </div>
    <div class="card"><div class="start-grid">
      ${withData
        .map(
          (ch) => `<div class="start-cell">
            <canvas data-ch="${ch}" width="${CELL_W}" height="${CELL_H}"></canvas>
            <b>${ch}</b>
            <span data-info="${ch}">—</span>
          </div>`,
        )
        .join('')}
    </div></div>
    ${
      without.length
        ? `<h2>Verisi yok · ${without.length}</h2>
           <div class="card"><p class="fine" style="margin:0">${without.join(' · ')}</p></div>`
        : ''
    }
  `;

  let disposed = false;

  void (async () => {
    await ensureGuideFont();
    if (disposed) return;
    const family = cursiveFamily();

    for (const canvas of root.querySelectorAll<HTMLCanvasElement>('canvas[data-ch]')) {
      const ch = canvas.dataset['ch']!;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = CELL_W * dpr;
      canvas.height = CELL_H * dpr;
      canvas.style.width = `${CELL_W}px`;
      canvas.style.height = `${CELL_H}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#fbf9f4';
      ctx.fillRect(0, 0, CELL_W, CELL_H);

      // Harf: taban çizgisi hücrenin alt üçte birinde (inen kuyruklara yer).
      const x0 = 22;
      const baseline = CELL_H * 0.66;
      ctx.save();
      ctx.font = `400 ${FONT}px ${family}`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(20,33,61,.30)';
      ctx.fillText(ch, x0, baseline);
      ctx.restore();

      // Satır çizgileri
      const r = glyphReveal(ch, FONT, family);
      const info = root.querySelector(`[data-info="${ch}"]`);
      if (!r) {
        if (info) info.textContent = 'glif yok';
        continue;
      }
      const xh = FONT * 0.52;
      ctx.save();
      ctx.strokeStyle = 'rgba(20,33,61,.18)';
      ctx.lineWidth = 1;
      for (const y of [baseline, baseline - xh]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CELL_W, y);
        ctx.stroke();
      }
      ctx.restore();

      const paths = routeStrokes(r, hamleOf(ch)!, family);
      if (!paths.length) {
        if (info) info.textContent = 'yol çıkmadı';
        continue;
      }

      // Yol: koyudan açığa — sıra görünsün.
      let n = 0;
      const total = paths.reduce((a, p) => a + p.length, 0);
      ctx.save();
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      for (const path of paths) {
        for (let i = 1; i < path.length; i++) {
          const t = n++ / Math.max(1, total);
          ctx.strokeStyle = `hsl(${212 + t * 110} 78% ${28 + t * 38}%)`;
          ctx.beginPath();
          ctx.moveTo(x0 + path[i - 1]!.x, baseline + path[i - 1]!.y);
          ctx.lineTo(x0 + path[i]!.x, baseline + path[i]!.y);
          ctx.stroke();
        }
        const last = path[path.length - 1]!;
        const prev = path[Math.max(0, path.length - 6)]!;
        drawArrow(
          ctx,
          { x: x0 + prev.x, y: baseline + prev.y },
          { x: x0 + last.x, y: baseline + last.y },
          7,
          '#2fb98d',
        );
        const first = path[0]!;
        ctx.fillStyle = '#e8484f';
        ctx.beginPath();
        ctx.arc(x0 + first.x, baseline + first.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (info) info.textContent = `${paths.length} hamle · ${total} nokta`;
    }
  })();

  return () => {
    disposed = true;
  };
}
