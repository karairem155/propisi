// Hamle yolu — harfin İÇİNDEN geçen, sırası belli kalem yolu.
//
// ── Neden gerekti ───────────────────────────────────────────────────────────
//
// `reveal.ts` jeodezik açılımla çalışıyor: başlangıç noktasından mürekkebin
// içine doğru genişleyen bir ön cephe. Tek şeritli harflerde iyi, ama cephe
// ÇATALLANINCA iki yeri aynı anda yazıyor ve kalem ucu (ortalama) ikisinin
// arasına, yani mürekkebin dışına düşüyor. Ovalli harflerin hepsi böyle:
// о, а, б, д, ф, ю, я. Kullanıcının bildirdiği şey buydu — "hepsini aynı
// anda yapıyor".
//
// ── Yöntem: yol noktaları + jeodezik ────────────────────────────────────────
//
// Harf başına birkaç YOL NOKTASI yazıyoruz (data/hamle.ts): "sağ üstten başla,
// sola dön, alta in, sağa çık, başa dön". Aradaki yolu hesaplıyoruz: iki nokta
// arasında MÜREKKEBİN İÇİNDEN en kısa yol. Böylece
//
//   · şekil fonttan geliyor (yol her zaman harfin üstünde kalıyor),
//   · sıra ve yön veriden geliyor (tahmin yok),
//   · kalem tek bir yerde ilerliyor.
//
// Yol noktalarının ekseni data/starts.ts ile AYNI:
//   x → 0 harfin sol kenarı, 1 sağ kenarı (harfin kendi genişliği)
//   y → 0 taban çizgisi, 1 üst çizgi (gövde yüksekliği); çıkan kuyruk 1'in,
//       inen kuyruk 0'ın dışına taşar
// Böylece `б`nin uzun kolu 1.7, `у`nun ilmeği -0.6 diye yazılabiliyor ve harf
// harf farklı bir dikey ölçek düşünmek gerekmiyor. Nokta yine de en yakın
// mürekkep pikseline çekiliyor, yani birkaç yüzde sapma kendini düzeltiyor.

import type { Pt } from '../ui/elements';
import { GRID_H, glyphReveal, type GlyphReveal } from './reveal';

/** Sınır kutusuna göre normalize yol noktası. */
export type Yol = { x: number; y: number };

type Box = { minX: number; minY: number; maxX: number; maxY: number };

function inkBox(r: GlyphReveal, fromY = -Infinity, toY = Infinity): Box | null {
  let minX = r.w;
  let minY = r.h;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < r.dist.length; i++) {
    if (r.dist[i] === 0xffff) continue;
    const x = i % r.w;
    const y = (i - x) / r.w;
    if (y < fromY || y > toY) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return maxX < minX ? null : { minX, minY, maxX, maxY };
}

/**
 * Gövde yüksekliği (taban → üst çizgi), ızgara pikseli cinsinden.
 *
 * `о` saf gövde harfi: ne çıkan ne inen parçası var. Ölçüyü ondan alıyoruz ki
 * bütün harfler aynı dikey birimi kullansın.
 */
const bodyCache = new Map<string, number>();

function bodyHeight(family: string): number {
  const hit = bodyCache.get(family);
  if (hit !== undefined) return hit;
  const o = glyphReveal('о', GRID_H, family);
  let h = GRID_H * 0.52;
  if (o) {
    const b = inkBox(o);
    if (b) h = b.maxY - b.minY;
  }
  bodyCache.set(family, h);
  return h;
}

/**
 * GÖVDE kutusu — x ekseninin dayanağı.
 *
 * Önce bütün mürekkebin sınır kutusunu kullanıyordum ve `д` gibi kuyruğu
 * yana taşan harflerde eksen kayıyordu: oval sağa itiliyor, yazdığım
 * x oranları ovalin soluna düşüyor, yol kuyruğa kaçıyordu. Ölçü artık
 * yalnız taban ile üst çizgi arasındaki mürekkepten çıkıyor — yani harfin
 * gövdesinden; kuyruklar ekseni bozmuyor.
 */
function bodyBox(r: GlyphReveal, xh: number): Box | null {
  const band = inkBox(r, r.offY - xh * 1.08, r.offY + xh * 0.1);
  return band ?? inkBox(r);
}

/** Yol noktasını en yakın mürekkep pikseline çeker. */
function snap(r: GlyphReveal, box: Box, p: Yol, xh: number): number {
  const tx = box.minX + p.x * (box.maxX - box.minX);
  const ty = r.offY - p.y * xh;
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < r.dist.length; i++) {
    if (r.dist[i] === 0xffff) continue;
    const x = i % r.w;
    const y = (i - x) / r.w;
    const d = (x - tx) ** 2 + (y - ty) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** İki mürekkep pikseli arasında, mürekkebin içinden en kısa yol. */
function geodesic(r: GlyphReveal, from: number, to: number): number[] {
  const prev = new Int32Array(r.dist.length).fill(-1);
  const seen = new Uint8Array(r.dist.length);
  const queue = [from];
  seen[from] = 1;
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++]!;
    if (i === to) break;
    const x = i % r.w;
    const y = (i - x) / r.w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= r.w || ny >= r.h) continue;
        const j = ny * r.w + nx;
        if (seen[j] || r.dist[j] === 0xffff) continue;
        seen[j] = 1;
        prev[j] = i;
        queue.push(j);
      }
    }
  }
  if (!seen[to]) return [];
  const path: number[] = [];
  for (let i = to; i !== -1; i = prev[i]!) {
    path.push(i);
    if (i === from) break;
  }
  return path.reverse();
}

/** Merdiven basamaklarını yumuşat — hareketli ortalama. */
function smooth(points: Pt[], radius = 3): Pt[] {
  if (points.length < 3) return points;
  const out: Pt[] = [];
  for (let i = 0; i < points.length; i++) {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let k = -radius; k <= radius; k++) {
      const p = points[i + k];
      if (!p) continue;
      sx += p.x;
      sy += p.y;
      n++;
    }
    out.push({ x: sx / n, y: sy / n });
  }
  // Uçlar ortalamayla içeri kaçıyor; orijinallerine geri çekiliyor.
  out[0] = points[0]!;
  out[out.length - 1] = points[points.length - 1]!;
  return out;
}

/** Yakın noktaları at — animasyon için 1-2 piksel aralık yeter. */
function thin(points: Pt[], minGap = 1.6): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minGap) out.push(p);
  }
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]!);
  return out;
}

/**
 * Yol noktalarını gerçek kalem yoluna çevirir.
 *
 * Dönen noktalar harfin KÖKENİNE göre (reveal.penAt ile aynı sözleşme):
 * tuvale basarken `x + p.x`, `baseline + p.y`.
 */
export function routeStrokes(r: GlyphReveal, strokes: Yol[][], family: string): Pt[][] {
  const xh = bodyHeight(family);
  const box = bodyBox(r, xh);
  if (!box) return [];
  const out: Pt[][] = [];

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    const ids = stroke.map((p) => snap(r, box, p, xh));
    const pixels: number[] = [];
    for (let i = 1; i < ids.length; i++) {
      const leg = geodesic(r, ids[i - 1]!, ids[i]!);
      if (!leg.length) continue;
      // İlk bacak tamamı, sonrakiler ilk pikseli tekrar etmesin.
      pixels.push(...(pixels.length ? leg.slice(1) : leg));
    }
    // Nokta işaretleri (ё) tek piksele düşebiliyor — kaybolmasın diye
    // minik bir parçaya çevriliyor.
    if (pixels.length === 1) {
      const i = pixels[0]!;
      const x = i % r.w;
      const y = (i - x) / r.w;
      out.push([
        { x: (x - 1 - r.offX) * r.scale, y: (y - r.offY) * r.scale },
        { x: (x + 1 - r.offX) * r.scale, y: (y - r.offY) * r.scale },
      ]);
      continue;
    }
    if (!pixels.length) continue;
    const pts = pixels.map((i) => {
      const x = i % r.w;
      return { x: (x - r.offX) * r.scale, y: ((i - x) / r.w - r.offY) * r.scale };
    });
    out.push(thin(smooth(pts)));
  }
  return out;
}


/** Zaman haritasının tavanı — 0xffff (mürekkep değil) ile çakışmasın diye. */
export const ORDER_MAX = 10000;

/**
 * Yol sırasını PİKSEL ZAMANINA çevirir.
 *
 * Animasyon harfin görüntüsünü fonttan alıyor (reveal.revealMask), sırasını
 * ise buradan: her mürekkep pikselinin zamanı, yolun EN YAKIN noktasının
 * yol boyunca kaçıncı sırada olduğu. Böylece harf tam kendi şekliyle,
 * üstelik doğru sırayla ortaya çıkıyor — ikisinden birini feda etmeden.
 *
 * Dönen dizi `GlyphReveal.dist` ile aynı sözleşmede: mürekkep dışı 0xffff.
 */
export function pathOrder(r: GlyphReveal, paths: Pt[][]): Uint16Array {
  // Yol noktaları tuval biriminde geldi; ızgaraya geri çevriliyor.
  const flat: { x: number; y: number; at: number }[] = [];
  let total = 0;
  let prev: { x: number; y: number } | null = null;
  for (const path of paths) {
    for (let i = 0; i < path.length; i++) {
      const g = { x: path[i]!.x / r.scale + r.offX, y: path[i]!.y / r.scale + r.offY };
      // Hamleler arası kalem kalkışı süreye yazılmıyor: yalnız aynı hamle
      // içindeki mesafe sayılıyor.
      if (prev && i > 0) total += Math.hypot(g.x - prev.x, g.y - prev.y);
      flat.push({ ...g, at: total });
      prev = g;
    }
  }
  const order = new Uint16Array(r.dist.length).fill(0xffff);
  if (!flat.length || total <= 0) return order;

  for (let i = 0; i < r.dist.length; i++) {
    if (r.dist[i] === 0xffff) continue;
    const x = i % r.w;
    const y = (i - x) / r.w;
    let best = Infinity;
    for (const f of flat) {
      const d = (f.x - x) ** 2 + (f.y - y) ** 2;
      if (d < best) best = d;
    }
    // EN ERKEN geçiş kazanır.
    //
    // Yalnız "en yakın nokta" alınınca kalın yerlerde cephe taranmış gibi
    // dikişli görünüyordu: şeridin bir kenarı ötekinden birkaç kare önce
    // açılıyordu. Kalem o pikselin yanından ilk ne zaman geçtiyse mürekkep
    // o zaman bırakılmış sayılır; yakınlık bandı bunu düzeltiyor.
    const band = (Math.sqrt(best) + 2.5) ** 2;
    let at = Infinity;
    for (const f of flat) {
      const d = (f.x - x) ** 2 + (f.y - y) ** 2;
      if (d <= band && f.at < at) at = f.at;
    }
    if (!Number.isFinite(at)) at = 0;
    order[i] = Math.min(ORDER_MAX, Math.round((at / total) * ORDER_MAX));
  }
  return order;
}
