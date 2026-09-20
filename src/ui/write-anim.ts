// "Nasıl yazılır" animasyonu — kalem harfi senin önünde yazar.
//
// Kaynağı glyph/reveal.ts: harfin şerit içi mesafe haritası. Buradaki iş
// sadece zamanı yönetmek ve ekrana basmak.
//
// Hız sabit DEĞİL, yol uzunluğuyla orantılı: `с` ile `щ` aynı sürede yazılırsa
// biri aceleye gelir öbürü sürünür. Uzun harf uzun sürüyor, tıpkı elde olduğu
// gibi.

import { glyphReveal, penAt, revealMask } from '../glyph/reveal';

export type WriteAnimOptions = {
  /** Metnin sol kenarı ve taban çizgisi — kılavuzla aynı yer. */
  x: number;
  baseline: number;
  fontSize: number;
  family: string;
  /** Saniyede kaç tuval pikseli yazılsın. */
  speed?: number;
  /** Bitince baştan alsın mı. */
  loop?: boolean;
  /** Her tur bittiğinde. */
  onDone?: () => void;
};

export type WriteAnim = { stop: () => void };

const INK = '#14213d';
const GHOST = 'rgba(29,63,143,.16)';
const PEN = '#35c79a';

/**
 * Animasyonu `ctx` üzerine oynatır. Her karede kendi alanını temizler, yani
 * üzerine çizdiği katman animasyona ayrılmış olmalı (canlı katman).
 */
export function playWrite(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: WriteAnimOptions,
): WriteAnim | null {
  const r = glyphReveal(text, opts.fontSize, opts.family);
  if (!r) return null;

  const scratch = document.createElement('canvas');
  // Tuval pikseli cinsinden yol uzunluğu ≈ en uzak mesafe (BFS'te 10 = 1px).
  const pathPx = (r.maxDist / 10) * r.scale;
  const speed = opts.speed ?? 190;
  const duration = Math.max(700, (pathPx / speed) * 1000);
  /** Bitince harf bir an tam görünsün — göz sonucu yakalasın. */
  const HOLD = 520;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const dx = opts.x - r.offX * r.scale;
  const dy = opts.baseline - r.offY * r.scale;
  const dw = r.w * r.scale;
  const dh = r.h * r.scale;

  let raf = 0;
  let start = 0;
  let stopped = false;

  const frame = (now: number) => {
    if (stopped) return;
    if (!start) start = now;
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);

    ctx.clearRect(0, 0, w, h);

    // Hayalet: nereye gideceğini görmek, nereden geldiğini görmek kadar önemli.
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = GHOST;
    ctx.font = `400 ${opts.fontSize}px ${opts.family}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, opts.x, opts.baseline);
    ctx.restore();

    // Yazılmış kısım.
    ctx.drawImage(revealMask(r, t, scratch), dx, dy, dw, dh);

    // Kalem ucu — yalnız yazarken, bitişte kaldırılıyor.
    if (t < 1) {
      const p = penAt(r, t);
      if (p) {
        ctx.save();
        ctx.fillStyle = PEN;
        ctx.beginPath();
        ctx.arc(opts.x + p.x, opts.baseline + p.y, Math.max(5, opts.fontSize * 0.055), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (elapsed < duration + HOLD) {
      raf = requestAnimationFrame(frame);
      return;
    }
    if (opts.loop) {
      start = 0;
      raf = requestAnimationFrame(frame);
      return;
    }
    ctx.clearRect(0, 0, w, h);
    opts.onDone?.();
  };

  raf = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    },
  };
}

/** Tek kare: harfin `t` anındaki hâli. Galeri ve önizleme için. */
export function drawWriteFrame(
  ctx: CanvasRenderingContext2D,
  text: string,
  t: number,
  opts: Omit<WriteAnimOptions, 'speed' | 'loop' | 'onDone'>,
): void {
  const r = glyphReveal(text, opts.fontSize, opts.family);
  if (!r) return;
  ctx.save();
  ctx.fillStyle = GHOST;
  ctx.font = `400 ${opts.fontSize}px ${opts.family}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, opts.x, opts.baseline);
  ctx.restore();
  ctx.drawImage(
    revealMask(r, t),
    opts.x - r.offX * r.scale,
    opts.baseline - r.offY * r.scale,
    r.w * r.scale,
    r.h * r.scale,
  );
  void INK;
}
