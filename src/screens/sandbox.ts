// Çizim yüzeyi — Faz 0'ın ana ekranı.
// Pencil giriş katmanını, perfect-freehand render'ını ve hamle kaydını bir araya getirir.
// Buradan kaydedilen her deneme kalibrasyon korpusuna girer (brief 6.3).

import { InkSurface } from '../canvas/surface';
import { attachPointer, pointerSupport, type PointerHandle } from '../canvas/pointer';
import { outlinePath, styleFor } from '../canvas/ink';
import { drawPaper, DEFAULT_PAPER } from '../ui/paper';
import { decimate } from '../grading/decimate';
import { saveAttempt } from '../db/db';
import { APP_VERSION, isStandalone, newId, type InkPoint, type InkStroke } from '../types';

/** ui/style.css içindeki --ink ile aynı. */
const INK_COLOR = '#14213d';

export function render(root: HTMLElement): () => void {
  root.className = 'screen flush';
  root.innerHTML = `
    <div class="ink-surface" id="surface"></div>
    <div class="toolbar">
      <label class="toggle"><input type="checkbox" id="penOnly"> Sadece Pencil</label>
      <label class="toggle"><input type="checkbox" id="predicted" checked> Tahmini uç</label>
      <span class="spacer"></span>
      <button id="clear" class="ghost">Temizle</button>
      <button id="save" class="primary" disabled>Kaydet</button>
    </div>
    <div class="scroll">
      <div class="stats" id="stats"></div>
      <div class="note" id="support" style="margin-top:10px"></div>
    </div>
  `;

  const host = root.querySelector<HTMLElement>('#surface')!;
  const statsBox = root.querySelector<HTMLElement>('#stats')!;
  const supportBox = root.querySelector<HTMLElement>('#support')!;
  const penOnly = root.querySelector<HTMLInputElement>('#penOnly')!;
  const predicted = root.querySelector<HTMLInputElement>('#predicted')!;
  const saveBtn = root.querySelector<HTMLButtonElement>('#save')!;

  const surface = new InkSurface(host, { desynchronized: true });
  const strokes: InkStroke[] = [];

  let current: InkPoint[] = [];
  let predictedTip: InkPoint[] = [];
  let pointerType = 'mouse';
  let strokeCanceled = false;
  let frame = 0;
  let mark = { coalesced: 0, rawMoves: 0 };

  const paint = () => {
    frame = 0;
    surface.clearLive();
    if (current.length === 0) return;
    const style = styleFor(pointerType);
    // Tahmini uç spekülatif çizilir; live katmanı her frame temizlendiği için
    // bir sonraki frame'de kendiliğinden atılır (brief 12.1).
    const pts = predictedTip.length ? current.concat(predictedTip) : current;
    surface.ctx.live.fillStyle = INK_COLOR;
    surface.ctx.live.fill(outlinePath(pts, style, false));
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const pointer: PointerHandle = attachPointer(
    host,
    {
      onStart(pt, e) {
        pointerType = e.pointerType;
        strokeCanceled = false;
        current = [pt];
        predictedTip = [];
        mark = { coalesced: pointer.stats.coalesced, rawMoves: pointer.stats.rawMoves };
        schedule();
      },
      onMove(pts, pred) {
        current.push(...pts);
        predictedTip = pred;
        schedule();
      },
      onEnd(reason) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        predictedTip = [];
        strokeCanceled = reason === 'cancel';

        if (current.length > 1) {
          surface.ctx.committed.fillStyle = INK_COLOR;
          surface.ctx.committed.fill(outlinePath(current, styleFor(pointerType), true));
          strokes.push({
            points: current,
            pointerType,
            coalescedCount: pointer.stats.coalesced - mark.coalesced,
            rawMoves: pointer.stats.rawMoves - mark.rawMoves,
            canceled: strokeCanceled,
          });
          saveBtn.disabled = false;
        }
        current = [];
        surface.clearLive();
        refresh();
      },
    },
    { penOnly: false, usePredicted: true },
  );

  const redraw = () => {
    drawPaper(surface.ctx.paper, surface.width, surface.height, DEFAULT_PAPER);
    surface.clearCommitted();
    surface.ctx.committed.fillStyle = INK_COLOR;
    for (const s of strokes) {
      surface.ctx.committed.fill(outlinePath(s.points, styleFor(s.pointerType), true));
    }
  };
  surface.setResizeHandler(redraw);
  redraw();

  function refresh() {
    const raw = strokes.reduce((n, s) => n + s.points.length, 0);
    const thin = strokes.reduce((n, s) => n + decimate(s.points).length, 0);
    const gain = pointer.stats.rawMoves
      ? (pointer.stats.coalesced / pointer.stats.rawMoves).toFixed(2)
      : '—';
    statsBox.innerHTML = `
      ${stat(String(strokes.length), 'hamle')}
      ${stat(String(raw), 'ham nokta')}
      ${stat(String(thin), 'seyreltilmiş')}
      ${stat(gain + '×', 'coalesced kazancı')}
      ${stat(String(pointer.stats.cancels), 'pointercancel')}
      ${stat(pointerType, 'girdi tipi')}
    `;
  }

  supportBox.innerHTML = [
    `getCoalescedEvents: <b>${yes(pointerSupport.coalesced)}</b>`,
    `getPredictedEvents: <b>${yes(pointerSupport.predicted)}</b>`,
    `pressure: <b>${yes(pointerSupport.pressure)}</b>`,
    `altitudeAngle: <b>${yes(pointerSupport.altitude)}</b>`,
    `desynchronized verildi: <b>${surface.desynchronized === null ? 'okunamadı' : yes(surface.desynchronized)}</b>`,
  ].join(' · ');

  penOnly.addEventListener('change', () => {
    pointer.config.penOnly = penOnly.checked;
  });
  predicted.addEventListener('change', () => {
    pointer.config.usePredicted = predicted.checked;
  });

  root.querySelector('#clear')!.addEventListener('click', () => {
    strokes.length = 0;
    pointer.resetStats();
    saveBtn.disabled = true;
    redraw();
    refresh();
  });

  saveBtn.addEventListener('click', async () => {
    if (!strokes.length) return;
    await saveAttempt({
      id: newId(),
      ts: Date.now(),
      target: 'sandbox',
      stage: 1,
      strokes: strokes.slice(),
      verdict: 'unknown', // Faz 0'da değerlendirme yok; şema Faz 1 için sabit
      failedChecks: [],
      thresholds: {},
      hintUsed: false,
      env: {
        appVersion: APP_VERSION,
        ua: navigator.userAgent,
        standalone: isStandalone(),
        dpr: window.devicePixelRatio || 1,
        surface: { w: surface.width, h: surface.height },
        desynchronized: surface.desynchronized,
      },
    });
    saveBtn.textContent = 'Kaydedildi ✓';
    saveBtn.disabled = true;
    setTimeout(() => (saveBtn.textContent = 'Denemeyi kaydet'), 1400);
  });

  refresh();

  return () => {
    pointer.detach();
    surface.destroy();
  };
}

function stat(value: string, label: string): string {
  return `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
}

function yes(v: boolean): string {
  return v ? 'var' : 'YOK';
}
