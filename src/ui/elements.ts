// Element kılavuz şekilleri — элементы букв (brief 7.2).
//
// Elementlerin fontta karşılığı yok: "eğik çizgi" bir harf değil. Bu yüzden
// şekilleri burada kod olarak çiziliyor. Harfler için ui/guide.ts fonttan
// alıyor, elementler için burası.
//
// Propisi'de element alıştırması satır boyunca TEKRARLANIR — tek bir şekil değil,
// aynı şeklin ritmi öğretiliyor. Burada da öyle: satır boyunca birkaç kopya.
//
// ŞEKİLLER NOKTA DİZİSİ, Path2D DEĞİL. Sebebi animasyon: "nasıl çizilir"
// gösterimi yolun uzunluğunu ve üstündeki kalem konumunu istiyor, tuvalin
// yol API'sinde ikisi de yok. Eğriler burada örnekleniyor (ui/path-anim.ts
// aynı diziyi hem çiziyor hem yürüyor). Örnek sıklığı bu ölçekte gözle
// ayırt edilemiyor.

import type { PaperConfig } from './paper';

export type Pt = { x: number; y: number };

export type ElementBox = {
  /** Satırın taban çizgisi. */
  baseline: number;
  rowHeight: number;
  /** İlk kopyanın sol kenarı. */
  x: number;
  /** Kopyalar arası yatay mesafe. */
  pitch: number;
  count: number;
  /** Eğim, dereceden radyana. */
  slant: number;
};

export function measureElements(
  paper: PaperConfig,
  width: number,
  baseline: number,
  count = 4,
): ElementBox {
  const rowHeight = paper.rowHeight;
  const pitch = rowHeight * 0.95;
  const total = pitch * (count - 1) + rowHeight * 0.7;
  return {
    baseline,
    rowHeight,
    x: Math.max(24, (width - total) / 2),
    pitch,
    count,
    slant: (paper.slantDeg * Math.PI) / 180,
  };
}

/** Eğime göre, tabandan h kadar yukarıdaki noktanın yatay kayması. */
function lean(box: ElementBox, h: number): number {
  return h / Math.tan(box.slant);
}

const P = (x: number, y: number): Pt => ({ x, y });

/** Karesel eğriyi noktalara böler — başlangıç noktası HARİÇ (o zaten dizide). */
function quad(a: Pt, c: Pt, b: Pt, n = 16): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push(
      P(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y),
    );
  }
  return out;
}

/** Döndürülmüş elips yayı. Açı büyürken ekranda saat yönünde ilerler. */
function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number,
  a0: number,
  a1: number,
  n = 44,
): Pt[] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const px = rx * Math.cos(a);
    const py = ry * Math.sin(a);
    out.push(P(cx + px * cos - py * sin, cy + px * sin + py * cos));
  }
  return out;
}

/**
 * Şekil = bir ya da birkaç kesintisiz yol, her yol nokta dizisi.
 *
 * Nokta SIRASI kalemin gideceği yön. Ovalde başlangıç sağ üst ve yön saat
 * yönünün TERSİ — propisi'nin öğrettiği yön bu; yanlış yönde yazılan oval
 * sonraki harflerde bağlantıyı bozuyor.
 */
type Shape = (box: ElementBox, x: number) => Pt[][];

const SHAPES: Record<string, Shape> = {
  // Düz eğik çizgi — прямая наклонная палочка (yukarıdan aşağıya)
  'el-naklon': (box, x) => {
    const h = box.rowHeight;
    return [[P(x + lean(box, h), box.baseline - h), P(x, box.baseline)]];
  },

  // Aşağıda yuvarlatmalı çizgi — крючок
  'el-kryuchok': (box, x) => {
    const h = box.rowHeight;
    const top = P(x + lean(box, h), box.baseline - h);
    const knee = P(x + h * 0.06, box.baseline - h * 0.22);
    return [
      [top, knee, ...quad(knee, P(x - h * 0.02, box.baseline), P(x + h * 0.34, box.baseline - h * 0.06))],
    ];
  },

  // Altta ve üstte yuvarlatmalı çizgi — tek kesintisiz hareket
  'el-dvojnoj': (box, x) => {
    const h = box.rowHeight;
    const a = P(x, box.baseline - h * 0.1);
    const top = P(x + lean(box, h) + h * 0.2, box.baseline - h * 0.92);
    const knee = P(x + h * 0.22, box.baseline - h * 0.2);
    return [
      [
        a,
        ...quad(a, P(x + h * 0.12, box.baseline - h), top),
        knee,
        ...quad(knee, P(x + h * 0.18, box.baseline), P(x + h * 0.52, box.baseline - h * 0.08)),
      ],
    ];
  },

  // Oval — овал (sağ üstten başlar, saat yönünün tersine döner)
  'el-oval': (box, x) => {
    const h = box.rowHeight;
    const rot = box.slant - Math.PI / 2;
    const a0 = -Math.PI / 4;
    return [arc(x + h * 0.3, box.baseline - h / 2, h * 0.27, h * 0.5, rot, a0, a0 - Math.PI * 2)];
  },

  // İlmek — петелька
  'el-petlya': (box, x) => {
    const h = box.rowHeight;
    const top = P(x + lean(box, h), box.baseline - h);
    const a = P(x, box.baseline);
    const cross = P(x + h * 0.36, box.baseline - h * 0.42);
    return [
      [
        a,
        ...quad(a, P(x + h * 0.1, box.baseline - h * 0.6), top),
        ...quad(top, P(top.x + h * 0.3, box.baseline - h * 0.8), cross),
        ...quad(cross, P(x + h * 0.1, box.baseline - h * 0.1), P(x + h * 0.62, box.baseline - h * 0.05)),
      ],
    ];
  },

  // Oval–yarımoval bordür
  'el-bordyur': (box, x) => {
    const h = box.rowHeight;
    const rot = box.slant - Math.PI / 2;
    const a0 = -Math.PI / 4;
    return [
      arc(x + h * 0.3, box.baseline - h / 2, h * 0.24, h * 0.44, rot, a0, a0 - Math.PI * 2),
      arc(x + h * 0.78, box.baseline - h / 2, h * 0.24, h * 0.44, rot, Math.PI * 1.65, Math.PI * 0.35),
    ];
  },
};

// Satır tanıtımı: çizilecek şekil yok, üç eğik çizgiyle ısınma.
SHAPES['el-stroka'] = SHAPES['el-naklon']!;

export function isElement(id: string): boolean {
  return id in SHAPES;
}

/** Bordür geniş, satıra daha az kopya sığar. */
export function elementCount(id: string): number {
  return id === 'el-bordyur' ? 3 : 4;
}

/** Kılavuz kalınlığı — hem çizimde hem animasyonda aynı. */
export function elementLineWidth(box: ElementBox): number {
  return Math.max(4, box.rowHeight * 0.1);
}

/** Satırdaki bütün kopyaların yolları, soldan sağa. */
export function elementPaths(id: string, box: ElementBox): Pt[][] {
  const shape = SHAPES[id];
  if (!shape) return [];
  const out: Pt[][] = [];
  for (let i = 0; i < box.count; i++) out.push(...shape(box, box.x + i * box.pitch));
  return out;
}

/**
 * Elementi satır boyunca çizer. `guide.ts`'teki harf çizimiyle aynı sözleşme:
 * aynı işlev hem kılavuz hem değerlendirme hedefi olarak kullanılıyor ki
 * puanlama tam olarak ekranda görünen şekle göre yapılsın.
 */
export function elementPainter(
  id: string,
  box: ElementBox,
): (ctx: CanvasRenderingContext2D) => void {
  const paths = elementPaths(id, box);
  if (!paths.length) return () => {};

  return (ctx) => {
    ctx.save();
    ctx.lineWidth = elementLineWidth(box);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle;
    for (const path of paths) {
      ctx.beginPath();
      ctx.moveTo(path[0]!.x, path[0]!.y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i]!.x, path[i]!.y);
      ctx.stroke();
    }
    ctx.restore();
  };
}
