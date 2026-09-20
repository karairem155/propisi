// Yön oku — propisi tablolarındaki ok.
//
// Kullanıcının gönderdiği alfabe tablosunda her harfin yanında kalemin
// gittiği yönü gösteren bir ok var; yalnız "nereden başla" değil "nereye
// doğru" da bilgi. Animasyonda kalem ucu bu yüzden nokta değil ok.

export type Vec = { x: number; y: number };

/**
 * `at` noktasına, `from`'dan gelen yöne bakan dolu bir ok başı çizer.
 * Yön hesaplanamayacak kadar kısa hareket varsa hiçbir şey çizmez —
 * rastgele yöne bakan bir ok yanlış bilgi olur.
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Vec,
  at: Vec,
  size: number,
  color: string,
): void {
  const dx = at.x - from.x;
  const dy = at.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return;
  const ux = dx / len;
  const uy = dy / len;
  const back = size * 1.25;
  const side = size * 0.72;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(at.x + ux * size * 0.5, at.y + uy * size * 0.5);
  ctx.lineTo(at.x - ux * back + -uy * side, at.y - uy * back + ux * side);
  ctx.lineTo(at.x - ux * back * 0.55, at.y - uy * back * 0.55);
  ctx.lineTo(at.x - ux * back + uy * side, at.y - uy * back - ux * side);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
