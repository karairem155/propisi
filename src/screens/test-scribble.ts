// Bölüm 13 — Test 3: Scribble hamle düşürüyor mu?
//
// brief 12.2: iPadOS Scribble Pencil girişini sistem genelinde izliyor; hızlı
// "dikey-yatay-dikey" hamlelerde üçüncü hamlenin düştüğü bildiriliyor. Bu tam olarak
// и, ш, м, л, п harflerinin ürettiği desen. Web API'sinden bastırmak mümkün değil.
//
// Asıl sinyal pointercancel sayacı: Scribble girdiyi kaparsa orada görünür.

import { InkSurface } from '../canvas/surface';
import { attachPointer } from '../canvas/pointer';
import { outlinePath, styleFor } from '../canvas/ink';
import { drawPaper, DEFAULT_PAPER } from '../ui/paper';
import type { InkPoint } from '../types';

/** ui/style.css içindeki --ink ile aynı. */
const INK_COLOR = '#14213d';

export function render(root: HTMLElement): () => void {
  root.className = 'screen flush';
  root.innerHTML = `
    <div class="note">
      <p style="margin:0">
        <b>Yöntem:</b> aşağıya <code>и</code> ve <code>ш</code> harflerini olabildiğince
        <b>hızlı</b> çiz. Beklenen hamle sayısını gir, sayaçla karşılaştır. Sonra
        <b>Ayarlar → Apple Pencil → Scribble</b> kapalıyken sıfırla ve tekrar çiz.
        İki ölçüm arasındaki fark testin cevabıdır.
      </p>
    </div>
    <div class="ink-surface" id="surface"></div>
    <div class="toolbar">
      <label class="toggle">Beklenen hamle:
        <input type="number" id="expected" value="0" min="0" class="num">
      </label>
      <span class="spacer"></span>
      <button id="reset" class="ghost">Sıfırla</button>
    </div>
    <div class="scroll">
      <div class="stats" id="stats"></div>
      <h2>Olay günlüğü</h2>
      <pre class="log" id="log">—</pre>
    </div>
  `;

  const host = root.querySelector<HTMLElement>('#surface')!;
  const statsBox = root.querySelector<HTMLElement>('#stats')!;
  const logBox = root.querySelector<HTMLElement>('#log')!;
  const expected = root.querySelector<HTMLInputElement>('#expected')!;

  const surface = new InkSurface(host, { desynchronized: true });
  const log: string[] = [];
  const done: InkPoint[][] = [];
  let current: InkPoint[] = [];
  let pointerType = 'mouse';
  let frame = 0;
  let t0 = 0;

  const redraw = () => {
    drawPaper(surface.ctx.paper, surface.width, surface.height, DEFAULT_PAPER);
    surface.clearCommitted();
    surface.ctx.committed.fillStyle = INK_COLOR;
    for (const s of done) surface.ctx.committed.fill(outlinePath(s, styleFor(pointerType), true));
  };
  surface.setResizeHandler(redraw);
  redraw();

  const note = (line: string) => {
    log.unshift(line);
    if (log.length > 40) log.pop();
    logBox.textContent = log.join('\n');
  };

  const paint = () => {
    frame = 0;
    surface.clearLive();
    if (current.length > 1) {
      surface.ctx.live.fillStyle = INK_COLOR;
      surface.ctx.live.fill(outlinePath(current, styleFor(pointerType), false));
    }
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const pointer = attachPointer(
    host,
    {
      onStart(pt, e) {
        pointerType = e.pointerType;
        if (!t0) t0 = e.timeStamp;
        current = [pt];
        note(`${ms(e.timeStamp - t0)}  down    ${e.pointerType}  p=${e.pressure.toFixed(3)}`);
        schedule();
      },
      onMove(pts, _pred, e) {
        current.push(...pts);
        if (pts.length !== 1) note(`${ms(e.timeStamp - t0)}  move    coalesced=${pts.length}`);
        schedule();
      },
      onEnd(reason) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        const n = current.length;
        if (n > 1) {
          done.push(current);
          surface.ctx.committed.fillStyle = INK_COLOR;
          surface.ctx.committed.fill(outlinePath(current, styleFor(pointerType), true));
        }
        note(
          reason === 'cancel'
            ? `        CANCEL  Scribble girdiyi kapmis olabilir — ${n} nokta atildi`
            : `        up      ${n} nokta`,
        );
        current = [];
        surface.clearLive();
        refresh();
      },
    },
    { penOnly: false, usePredicted: false },
  );

  function refresh() {
    const want = Number(expected.value) || 0;
    const got = done.length;
    const missing = want ? want - got : 0;
    statsBox.innerHTML = [
      card(String(got), 'tamamlanan hamle'),
      card(String(pointer.stats.downs), 'pointerdown'),
      card(String(pointer.stats.ups), 'pointerup'),
      card(String(pointer.stats.cancels), 'pointercancel'),
      card(want ? (missing > 0 ? `−${missing}` : 'tam') : '—', 'düşen hamle'),
      card(String(pointer.stats.coalesced), 'coalesced nokta'),
    ].join('');
  }

  expected.addEventListener('input', refresh);
  root.querySelector('#reset')!.addEventListener('click', () => {
    done.length = 0;
    log.length = 0;
    t0 = 0;
    logBox.textContent = '—';
    pointer.resetStats();
    redraw();
    refresh();
  });

  refresh();

  return () => {
    pointer.detach();
    surface.destroy();
  };
}

function card(value: string, label: string): string {
  return `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
}

function ms(v: number): string {
  return String(Math.round(v)).padStart(6, ' ');
}
