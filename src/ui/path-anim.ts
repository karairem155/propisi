// "Nasıl çizilir" animasyonu — nokta dizisi hâlindeki yollar için.
//
// write-anim.ts harfleri fonttan alıyor; elementlerin fontta karşılığı yok
// (ui/elements.ts şekilleri kodla çiziyor). Bu yüzden eleman derslerinde
// gösterim düğmesi hiç yoktu: kullanıcı kılavuzsuz kademede "nereden
// başlıyordu, hangi yöne gidiyordu" sorusunu soramıyordu. Kontrol noktasının
// geçilememesinin bir sebebi buydu.
//
// Buradaki iş yolun uzunluğunu ölçmek, zamanı yürütmek ve kalemi çizmek.

import type { Pt } from './elements';
import { drawArrow } from './arrow';

export type PathAnimOptions = {
  lineWidth: number;
  /** Saniyede kaç piksel çizilsin. */
  speed?: number;
  loop?: boolean;
  /** Animasyonun ALTINA her karede basılacak katman (ör. değerlendirme). */
  underlay?: HTMLCanvasElement | null;
  onDone?: () => void;
};

export type PathAnim = { stop: () => void };

const INK = '#1d3f8f';
const GHOST = 'rgba(29,63,143,.18)';
const PEN = '#35c79a';
const START = '#2fb98d';

function lengthsOf(path: Pt[]): { steps: number[]; total: number } {
  const steps: number[] = [0];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
    steps.push(total);
  }
  return { steps, total };
}

/** Yolun `upto` uzunluğundaki noktası ve oradan biraz gerisi — ok yönü için. */
function headOf(path: Pt[], upto: number): { at: Pt; from: Pt } | null {
  if (path.length < 2) return null;
  const { steps } = lengthsOf(path);
  const back = Math.max(1, upto - 6);
  const pick = (d: number): Pt => {
    for (let i = 1; i < path.length; i++) {
      if (steps[i]! < d) continue;
      const prev = steps[i - 1]!;
      const t = (d - prev) / Math.max(0.0001, steps[i]! - prev);
      return {
        x: path[i - 1]!.x + (path[i]!.x - path[i - 1]!.x) * t,
        y: path[i - 1]!.y + (path[i]!.y - path[i - 1]!.y) * t,
      };
    }
    return path[path.length - 1]!;
  };
  return { at: pick(upto), from: pick(back) };
}

function strokePath(ctx: CanvasRenderingContext2D, path: Pt[], upto: number): Pt | null {
  if (path.length < 2) return null;
  const { steps } = lengthsOf(path);
  ctx.beginPath();
  ctx.moveTo(path[0]!.x, path[0]!.y);
  let head: Pt = path[0]!;
  for (let i = 1; i < path.length; i++) {
    const at = steps[i]!;
    if (at <= upto) {
      ctx.lineTo(path[i]!.x, path[i]!.y);
      head = path[i]!;
      continue;
    }
    // Son parça kısmi: iki nokta arasında orantılı ilerle.
    const prev = steps[i - 1]!;
    const t = (upto - prev) / Math.max(0.0001, at - prev);
    head = {
      x: path[i - 1]!.x + (path[i]!.x - path[i - 1]!.x) * t,
      y: path[i - 1]!.y + (path[i]!.y - path[i - 1]!.y) * t,
    };
    ctx.lineTo(head.x, head.y);
    break;
  }
  ctx.stroke();
  return head;
}

/**
 * Yolları sırayla çizer; her karede kendi katmanını temizler, yani canlı
 * katmana oynatılmalı. `underlay` verilirse temizlikten sonra o basılır —
 * değerlendirme katmanı animasyonun altında durabilsin diye.
 */
export function playPath(
  ctx: CanvasRenderingContext2D,
  paths: Pt[][],
  opts: PathAnimOptions,
): PathAnim | null {
  const usable = paths.filter((p) => p.length > 1);
  if (!usable.length) return null;

  const lens = usable.map((p) => lengthsOf(p).total);
  const total = lens.reduce((n, x) => n + x, 0);
  const speed = opts.speed ?? 230;
  const duration = Math.max(900, (total / speed) * 1000);
  const HOLD = 520;

  const size = () => [ctx.canvas.width, ctx.canvas.height] as const;
  let raf = 0;
  let start = 0;
  let stopped = false;

  const frame = (now: number) => {
    if (stopped) return;
    if (!start) start = now;
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const drawn = total * t;

    {
      const [w, h] = size();
      ctx.clearRect(0, 0, w, h);
    }
    if (opts.underlay) ctx.drawImage(opts.underlay, 0, 0);

    ctx.save();
    ctx.lineWidth = opts.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Hayalet: nereye gideceğini görmek, nereden geldiğini görmek kadar önemli.
    ctx.strokeStyle = GHOST;
    for (const path of usable) strokePath(ctx, path, Infinity);

    // Çizilmiş kısım + kalem ucu.
    ctx.strokeStyle = INK;
    let left = drawn;
    let head: Pt | null = null;
    let headFrom: Pt | null = null;
    for (let i = 0; i < usable.length; i++) {
      if (left <= 0) break;
      const path = usable[i]!;
      const upto = Math.min(left, lens[i]!);
      head = strokePath(ctx, path, upto) ?? head;
      const h = headOf(path, upto);
      if (h) {
        head = h.at;
        headFrom = h.from;
      }
      left -= lens[i]!;
    }

    // Başlangıç noktası — hangi uçtan başlandığı şeklin yarısı.
    const first = usable[0]![0]!;
    ctx.fillStyle = START;
    ctx.beginPath();
    ctx.arc(first.x, first.y, opts.lineWidth * 0.75, 0, Math.PI * 2);
    ctx.fill();

    if (t < 1 && head && headFrom) {
      // Kalem ucu = yön oku (bkz. ui/arrow.ts).
      drawArrow(ctx, headFrom, head, opts.lineWidth * 1.5, PEN);
    } else if (t >= 1) {
      // Bitince her yolun ucunda ok kalır — tablodaki gibi.
      for (const path of usable) {
        const end = headOf(path, lengthsOf(path).total);
        if (end) drawArrow(ctx, end.from, end.at, opts.lineWidth * 1.4, PEN);
      }
    }
    ctx.restore();

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
