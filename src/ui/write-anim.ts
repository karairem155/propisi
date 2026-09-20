// "Nasıl yazılır" animasyonu — kalem harfi senin önünde yazar.
//
// Kaynağı glyph/reveal.ts: harfin şerit içi mesafe haritası. Buradaki iş
// sadece zamanı yönetmek ve ekrana basmak.
//
// Hız sabit DEĞİL, yol uzunluğuyla orantılı: `с` ile `щ` aynı sürede yazılırsa
// biri aceleye gelir öbürü sürünür. Uzun harf uzun sürüyor, tıpkı elde olduğu
// gibi.

import { glyphReveal, penAt, revealMask, type GlyphReveal } from '../glyph/reveal';
import { ORDER_MAX, pathOrder, routeStrokes } from '../glyph/route';
import { hamleOf } from '../data/hamle';
import { drawArrow } from './arrow';

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
  /** Animasyonun ALTINA her karede basılacak katman (ör. değerlendirme). */
  underlay?: HTMLCanvasElement | null;
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
/**
 * Harfin zaman haritası — hamle verisi varsa ondan, yoksa jeodezik açılımdan.
 *
 * Jeodezik açılım tek şeritli harflerde iyi ama çatallanınca iki yeri aynı
 * anda yazıyor (kullanıcının gördüğü hata). data/hamle.ts olan harflerde
 * sıra gerçek yazma sırası; şekil yine fonttan geliyor.
 */
const orderCache = new Map<string, Uint16Array | null>();

function sirali(r: GlyphReveal, text: string, family: string): GlyphReveal {
  if (text.length !== 1) return r;
  const key = `${text}|${family}`;
  let order = orderCache.get(key);
  if (order === undefined) {
    const yol = hamleOf(text);
    const paths = yol ? routeStrokes(r, yol, family) : [];
    order = paths.length ? pathOrder(r, paths) : null;
    orderCache.set(key, order);
  }
  return order ? { ...r, dist: order, maxDist: ORDER_MAX } : r;
}

export function playWrite(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: WriteAnimOptions,
): WriteAnim | null {
  const raw = glyphReveal(text, opts.fontSize, opts.family);
  if (!raw) return null;
  const r = sirali(raw, text, opts.family);

  const scratch = document.createElement('canvas');
  // Tuval pikseli cinsinden yol uzunluğu. Jeodezik haritada birim 10 = 1px;
  // hamle haritasında 0..ORDER_MAX, o yüzden harfin kendi boyundan tahmin.
  const pathPx =
    r.maxDist === ORDER_MAX ? opts.fontSize * 2.6 : (r.maxDist / 10) * r.scale;
  const speed = opts.speed ?? 190;
  const duration = Math.max(700, (pathPx / speed) * 1000);
  /** Bitince harf bir an tam görünsün — göz sonucu yakalasın. */
  const HOLD = 520;

  const size = () => [ctx.canvas.width, ctx.canvas.height] as const;
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

    {
      const [w, h] = size();
      ctx.clearRect(0, 0, w, h);
    }
    if (opts.underlay) ctx.drawImage(opts.underlay, 0, 0);

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

    // Kalem ucu — yalnız yazarken, bitişte kaldırılıyor. Nokta değil OK:
    // kullanıcının gönderdiği propisi tablosunda yön oklarla gösteriliyor.
    if (t < 1) {
      const p = penAt(r, t);
      const back = penAt(r, Math.max(0, t - 0.03));
      if (p) {
        const at = { x: opts.x + p.x, y: opts.baseline + p.y };
        const from = back ? { x: opts.x + back.x, y: opts.baseline + back.y } : null;
        const size = Math.max(5, opts.fontSize * 0.055);
        if (from) drawArrow(ctx, from, at, size * 1.5, PEN);
        else {
          ctx.save();
          ctx.fillStyle = PEN;
          ctx.beginPath();
          ctx.arc(at.x, at.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
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
    {
      const [w, h] = size();
      ctx.clearRect(0, 0, w, h);
    }
    if (opts.underlay) ctx.drawImage(opts.underlay, 0, 0);
    opts.onDone?.();
  };

  raf = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      const [w, h] = size();
      ctx.clearRect(0, 0, w, h);
      if (opts.underlay) ctx.drawImage(opts.underlay, 0, 0);
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
