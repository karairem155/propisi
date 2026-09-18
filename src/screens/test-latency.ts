// Bölüm 13 — Test 2: desynchronized:true gerçekten gecikmeyi azaltıyor mu?
//
// DÜRÜSTLÜK NOTU: sayfa içinden gerçek "kalem ucundan piksele" gecikmesi ölçülemez —
// onun için kamera gerekir. Burada iki şey var:
//   (a) ÖLÇÜM: pointer olayının zaman damgasından boyama çağrısına kadar geçen süre.
//       Compositor gecikmesini içermez, yani alt sınırdır.
//   (b) ASIL TEST: kırmızı artı ham kalem konumunu gösterir. Mürekkep ucu ile artı
//       arasındaki mesafe algılanan gecikmedir. İki paneli hızlı çizip GÖZLE karşılaştır.

import { InkSurface } from '../canvas/surface';
import { attachPointer, type PointerHandle } from '../canvas/pointer';
import { outlinePath, styleFor } from '../canvas/ink';
import type { InkPoint } from '../types';

/** ui/style.css içindeki --ink ile aynı. */
const INK_COLOR = '#14213d';

export function render(root: HTMLElement): () => void {
  root.className = 'screen flush';
  root.innerHTML = `
    <div class="note">
      <p style="margin:0">
        İki panelde de aynı hızda, aynı uzunlukta birkaç saniye çiz. <b>Kırmızı artı</b>
        kalemin ham konumu; mürekkep ucunun ondan ne kadar geride kaldığına bak.
        Sayılar boyama çağrısına kadar geçen süredir, ekrana ulaşma süresi değil.
      </p>
    </div>
    <div class="split">
      <div class="pane">
        <h3>desynchronized: <b>true</b> — <span id="g1">?</span></h3>
        <div class="ink-surface" id="s1"></div>
      </div>
      <div class="pane">
        <h3>desynchronized: <b>false</b> — <span id="g2">?</span></h3>
        <div class="ink-surface" id="s2"></div>
      </div>
    </div>
    <div class="scroll">
      <div class="stats" id="stats"></div>
    </div>
    <div class="toolbar"><button id="reset" class="ghost">Sıfırla</button></div>
  `;

  const statsBox = root.querySelector<HTMLElement>('#stats')!;
  const panels = [
    build(root.querySelector<HTMLElement>('#s1')!, true, root.querySelector<HTMLElement>('#g1')!),
    build(root.querySelector<HTMLElement>('#s2')!, false, root.querySelector<HTMLElement>('#g2')!),
  ];

  const timer = window.setInterval(() => {
    statsBox.innerHTML = panels
      .map((p) => {
        const s = summarize(p.samples);
        return [
          card(s.median, `desync=${p.desync} medyan ms`),
          card(s.p95, `desync=${p.desync} p95 ms`),
          card(String(p.samples.length), `desync=${p.desync} örnek`),
        ].join('');
      })
      .join('');
  }, 400);

  root.querySelector('#reset')!.addEventListener('click', () => {
    for (const p of panels) {
      p.samples.length = 0;
      p.surface.clearInk();
    }
  });

  return () => {
    clearInterval(timer);
    for (const p of panels) {
      p.pointer.detach();
      p.surface.destroy();
    }
  };
}

type Panel = {
  desync: boolean;
  surface: InkSurface;
  pointer: PointerHandle;
  samples: number[];
};

function build(host: HTMLElement, desync: boolean, badge: HTMLElement): Panel {
  const surface = new InkSurface(host, { desynchronized: desync });
  badge.textContent =
    surface.desynchronized === null
      ? 'okunamadı'
      : surface.desynchronized
        ? 'verildi'
        : 'verilmedi';

  const samples: number[] = [];
  let current: InkPoint[] = [];
  let tip: { x: number; y: number } | null = null;
  let stamp = 0;
  let frame = 0;
  let pointerType = 'mouse';

  const paint = () => {
    frame = 0;
    surface.clearLive();
    const ctx = surface.ctx.live;
    if (current.length > 1) {
      ctx.fillStyle = INK_COLOR;
      ctx.fill(outlinePath(current, styleFor(pointerType), false));
    }
    if (tip) {
      // Ham kalem konumu — mürekkep ucuyla arasındaki mesafe algılanan gecikmedir.
      ctx.strokeStyle = '#c8321e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tip.x - 9, tip.y);
      ctx.lineTo(tip.x + 9, tip.y);
      ctx.moveTo(tip.x, tip.y - 9);
      ctx.lineTo(tip.x, tip.y + 9);
      ctx.stroke();
    }
    if (stamp) {
      const dt = performance.now() - stamp;
      if (dt >= 0 && dt < 400) samples.push(dt);
      if (samples.length > 600) samples.splice(0, samples.length - 600);
      stamp = 0;
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
        current = [pt];
        tip = { x: pt.x, y: pt.y };
        stamp = e.timeStamp;
        schedule();
      },
      onMove(pts, _pred, e) {
        current.push(...pts);
        const last = pts[pts.length - 1];
        if (last) tip = { x: last.x, y: last.y };
        stamp = e.timeStamp;
        schedule();
      },
      onEnd() {
        // Bekleyen ölçümü düşürme: kısa bir hamlenin tüm olayları tek frame'e
        // düşerse zamanlanmış paint hiç çalışmadan iptal edilir ve örnek kaybolur.
        if (stamp) {
          const dt = performance.now() - stamp;
          if (dt >= 0 && dt < 400) samples.push(dt);
        }
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        if (current.length > 1) {
          surface.ctx.committed.fillStyle = INK_COLOR;
          surface.ctx.committed.fill(outlinePath(current, styleFor(pointerType), true));
        }
        current = [];
        tip = null;
        stamp = 0;
        surface.clearLive();
      },
    },
    { penOnly: false, usePredicted: false },
  );

  return { desync, surface, pointer, samples };
}

function card(value: string, label: string): string {
  return `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
}

function summarize(samples: number[]): { median: string; p95: string } {
  if (!samples.length) return { median: '—', p95: '—' };
  const sorted = samples.slice().sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!;
  return { median: at(0.5).toFixed(1), p95: at(0.95).toFixed(1) };
}
