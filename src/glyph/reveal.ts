// Harfin YAZILIŞINI göster — "Write It! Russian" tarzı hamle animasyonu.
//
// ── Neden iskelet değil ──────────────────────────────────────────────────────
//
// İlk denemem harfi Zhang–Suen ile inceltip iskeleti yürümekti. İskelet temiz
// çıkıyor (`и` 201 piksel, 3 uç) ama YÜRÜYÜŞ güvenilmez: merdiven desenleri
// üç komşulu piksel üretiyor, yürüyüş dallanıyor, harf parçalara bölünüyor.
// `ш` üç parça, `у` altı parça çıktı — oysa ikisi de tek hamlede yazılıyor.
//
// Daha da önemlisi: parçaları birleştirsem bile HAMLE SIRASI geometriden
// çıkan bir tahmin olurdu. Yanlış hamle sırası öğretmek hiç öğretmemekten
// kötüdür, çünkü kullanıcı el yazısı bilmiyor ve yanlış olduğunu anlayamaz.
//
// ── Bunun yerine: jeodezik açılım ────────────────────────────────────────────
//
// Kalem, harfin başlangıç noktasından başlayıp mürekkebin İÇİNDEN ilerler.
// Yani bir pikselin "ne zaman yazıldığı", başlangıç noktasına olan
// ŞERİT İÇİ mesafesidir — kuş uçuşu değil, mürekkebin içinden yürüyerek.
// Bunu genişlik-öncelikli aramayla tam olarak hesaplayabiliyoruz.
//
// Bu yaklaşımın iki üstünlüğü var:
//   · Kurgu gereği doğru. Kavşak, dallanma, hamle sırası tahmini yok;
//     mesafe haritası harfin kendi geometrisinden çıkıyor.
//   · Eğrileri ve ilmekleri kendiliğinden izliyor: `и`de birinci tepeye
//     çıkıp iniyor, sonra ikinciye — çünkü şerit öyle gidiyor.
//
// Tek zayıflığı kapalı ilmekler (`о`): açılım iki yönden birden dönüyor.
// Kabul edilebilir — çünkü yanlış bir şey ÖĞRETMİYOR, sadece o harfte
// hareketin yönünü tam göstermiyor.
//
// Başlangıç noktası data/starts.ts'ten. 33 harfin 14'ünde emin olmadığım için
// animasyon değerlendirmeye KATILMIYOR: gösteriyor, not vermiyor.

import { startOf } from '../data/starts';

/** Mesafe haritası bu yükseklikte hesaplanıyor; gösterimde ölçekleniyor. */
const GRID_H = 160;

export type GlyphReveal = {
  /** Harfin maskesi — alfa kanalında mürekkep. */
  mask: HTMLCanvasElement;
  /** Her piksel için başlangıçtan şerit içi mesafe; mürekkep dışı 0xffff. */
  dist: Uint16Array;
  w: number;
  h: number;
  /** En uzak mürekkep pikselinin mesafesi — animasyonun sonu. */
  maxDist: number;
  /** Maskenin sol-üst köşesinin harf kökenine göre konumu (ızgara px). */
  offX: number;
  offY: number;
  /** Izgara pikseli → tuval pikseli. */
  scale: number;
};

const cache = new Map<string, Omit<GlyphReveal, 'scale'>>();

/**
 * Harfi rasterleştir, başlangıç noktasından şerit içi mesafeyi hesapla.
 *
 * `fontSize` yalnız ölçek için; harita sabit çözünürlükte bir kez hesaplanıp
 * saklanıyor, çünkü inceltme değil BFS bile olsa her açılışta yapmak gereksiz.
 */
export function glyphReveal(text: string, fontSize: number, family: string): GlyphReveal | null {
  const key = `${text}|${family}`;
  const cached = cache.get(key);
  const scale = fontSize / GRID_H;
  if (cached) return { ...cached, scale };

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) return null;
  probe.font = `400 ${GRID_H}px ${family}`;
  const m = probe.measureText(text);
  const ascent = m.actualBoundingBoxAscent || GRID_H * 0.8;
  const descent = m.actualBoundingBoxDescent || GRID_H * 0.25;
  const left = m.actualBoundingBoxLeft || 0;
  const right = m.actualBoundingBoxRight || m.width;

  const pad = 3;
  const w = Math.ceil(left + right) + pad * 2;
  const h = Math.ceil(ascent + descent) + pad * 2;
  if (w < 4 || h < 4 || w > 3000 || h > 3000) return null;

  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const ctx = mask.getContext('2d', { willReadFrequently: true })!;
  ctx.font = `400 ${GRID_H}px ${family}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  // Kökene göre konum: sol kenar ve taban çizgisi.
  const originX = pad + left;
  const originY = pad + ascent;
  ctx.fillText(text, originX, originY);

  const img = ctx.getImageData(0, 0, w, h).data;
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ink[i] = img[i * 4 + 3]! > 90 ? 1 : 0;

  // Başlangıç: starts.ts oranı, mürekkebe en yakın piksele çekiliyor.
  const hintRatio = startOf(text[0] ?? text);
  const hx = originX + (hintRatio?.x ?? 0.04) * GRID_H;
  const hy = originY - (hintRatio?.y ?? 0) * GRID_H;
  let seed = -1;
  let bestD = Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!ink[i]) continue;
      const d = (x - hx) ** 2 + (y - hy) ** 2;
      if (d < bestD) {
        bestD = d;
        seed = i;
      }
    }
  }
  if (seed < 0) return null;

  // Şerit içi mesafe — sekiz komşulu BFS. Çapraz adım √2 sayılıyor ki
  // eğik giden şeritte hız sabit görünsün.
  const dist = new Uint16Array(w * h).fill(0xffff);
  dist[seed] = 0;
  // Basit bir kova kuyruğu: mesafeler tam sayıya yuvarlanıyor (10 = 1 piksel).
  const STEP = 10;
  const DIAG = 14;
  const queue: number[] = [seed];
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++]!;
    const d = dist[i]!;
    const x = i % w;
    const y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!ink[j]) continue;
        const nd = d + (dx && dy ? DIAG : STEP);
        if (nd < dist[j]!) {
          dist[j] = nd;
          queue.push(j);
        }
      }
    }
  }

  // Mürekkebe bağlı olmayan parçalar (й'nin işareti, ё'nün noktaları) BFS'e
  // hiç girmiyor. Onları EN SONA koy: ayrı hamleler ve gerçekten de sonra
  // yazılıyorlar — bu, geometriden değil yazı geleneğinden gelen tek kural.
  let maxDist = 0;
  for (let i = 0; i < dist.length; i++) {
    if (ink[i] && dist[i]! !== 0xffff && dist[i]! > maxDist) maxDist = dist[i]!;
  }
  const detachedAt = maxDist + STEP * 6;
  let detached = 0;
  for (let i = 0; i < dist.length; i++) {
    if (ink[i] && dist[i]! === 0xffff) {
      dist[i] = detachedAt;
      detached++;
    }
  }
  if (detached) maxDist = detachedAt;

  const value = { mask, dist, w, h, maxDist, offX: originX, offY: originY };
  cache.set(key, value);
  return { ...value, scale };
}

/** Animasyonun `t` anında (0..1) kalemin bulunduğu nokta, kökene göre. */
export function penAt(r: GlyphReveal, t: number): { x: number; y: number } | null {
  const front = t * r.maxDist;
  const band = Math.max(60, r.maxDist * 0.03);
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let i = 0; i < r.dist.length; i++) {
    const d = r.dist[i]!;
    if (d === 0xffff) continue;
    if (d > front || d < front - band) continue;
    const x = i % r.w;
    sx += x;
    sy += (i - x) / r.w;
    n++;
  }
  if (!n) return null;
  return { x: (sx / n - r.offX) * r.scale, y: (sy / n - r.offY) * r.scale };
}

/**
 * `t` anına kadar yazılmış kısmı maskeye işleyip döndürür.
 * Dönen tuval, harfin kökenine göre `offX/offY` kadar kaydırılarak çizilmeli.
 */
export function revealMask(r: GlyphReveal, t: number, out?: HTMLCanvasElement): HTMLCanvasElement {
  const cv = out ?? document.createElement('canvas');
  if (cv.width !== r.w || cv.height !== r.h) {
    cv.width = r.w;
    cv.height = r.h;
  }
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(r.w, r.h);
  const front = t * r.maxDist;
  const data = img.data;
  for (let i = 0; i < r.dist.length; i++) {
    const d = r.dist[i]!;
    if (d === 0xffff || d > front) continue;
    const p = i * 4;
    data[p] = 20;
    data[p + 1] = 33;
    data[p + 2] = 61;
    data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
