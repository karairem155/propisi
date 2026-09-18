// Element kılavuz şekilleri — элементы букв (brief 7.2).
//
// Elementlerin fontta karşılığı yok: "eğik çizgi" bir harf değil. Bu yüzden
// şekilleri burada kod olarak çiziliyor. Harfler için ui/guide.ts fonttan
// alıyor, elementler için burası.
//
// Propisi'de element alıştırması satır boyunca TEKRARLANIR — tek bir şekil değil,
// aynı şeklin ritmi öğretiliyor. Burada da öyle: satır boyunca birkaç kopya.

import type { PaperConfig } from './paper';

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

type Shape = (ctx: CanvasRenderingContext2D, box: ElementBox, x: number) => void;

const SHAPES: Record<string, Shape> = {
  // Düz eğik çizgi — прямая наклонная палочка
  'el-naklon': (ctx, box, x) => {
    const h = box.rowHeight;
    ctx.moveTo(x, box.baseline);
    ctx.lineTo(x + lean(box, h), box.baseline - h);
  },

  // Aşağıda yuvarlatmalı çizgi — крючок
  'el-kryuchok': (ctx, box, x) => {
    const h = box.rowHeight;
    const top = x + lean(box, h);
    ctx.moveTo(top, box.baseline - h);
    ctx.lineTo(x + h * 0.06, box.baseline - h * 0.22);
    ctx.quadraticCurveTo(
      x - h * 0.02,
      box.baseline,
      x + h * 0.34,
      box.baseline - h * 0.06,
    );
  },

  // Altta ve üstte yuvarlatmalı çizgi
  'el-dvojnoj': (ctx, box, x) => {
    const h = box.rowHeight;
    ctx.moveTo(x, box.baseline - h * 0.1);
    ctx.quadraticCurveTo(x + h * 0.12, box.baseline - h, x + lean(box, h) + h * 0.2, box.baseline - h * 0.92);
    ctx.moveTo(x + lean(box, h) + h * 0.2, box.baseline - h * 0.92);
    ctx.lineTo(x + h * 0.22, box.baseline - h * 0.2);
    ctx.quadraticCurveTo(x + h * 0.18, box.baseline, x + h * 0.52, box.baseline - h * 0.08);
  },

  // Oval — овал
  'el-oval': (ctx, box, x) => {
    const h = box.rowHeight;
    ctx.save();
    ctx.translate(x + h * 0.3, box.baseline - h / 2);
    ctx.rotate(-(Math.PI / 2 - box.slant));
    ctx.ellipse(0, 0, h * 0.27, h * 0.5, 0, 0, Math.PI * 2);
    ctx.restore();
  },

  // İlmek — петелька
  'el-petlya': (ctx, box, x) => {
    const h = box.rowHeight;
    const top = x + lean(box, h);
    ctx.moveTo(x, box.baseline);
    ctx.quadraticCurveTo(x + h * 0.1, box.baseline - h * 0.6, top, box.baseline - h);
    ctx.quadraticCurveTo(top + h * 0.3, box.baseline - h * 0.8, x + h * 0.36, box.baseline - h * 0.42);
    ctx.quadraticCurveTo(x + h * 0.1, box.baseline - h * 0.1, x + h * 0.62, box.baseline - h * 0.05);
  },

  // Oval–yarımoval bordür
  'el-bordyur': (ctx, box, x) => {
    const h = box.rowHeight;
    ctx.save();
    ctx.translate(x + h * 0.3, box.baseline - h / 2);
    ctx.rotate(-(Math.PI / 2 - box.slant));
    ctx.ellipse(0, 0, h * 0.24, h * 0.44, 0, 0, Math.PI * 2);
    ctx.restore();
    // Yanına yarım oval
    ctx.save();
    ctx.translate(x + h * 0.78, box.baseline - h / 2);
    ctx.rotate(-(Math.PI / 2 - box.slant));
    ctx.ellipse(0, 0, h * 0.24, h * 0.44, 0, Math.PI * 0.35, Math.PI * 1.65);
    ctx.restore();
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

/**
 * Elementi satır boyunca çizer. `guide.ts`'teki harf çizimiyle aynı sözleşme:
 * aynı işlev hem kılavuz hem değerlendirme hedefi olarak kullanılıyor ki
 * puanlama tam olarak ekranda görünen şekle göre yapılsın.
 */
export function elementPainter(
  id: string,
  box: ElementBox,
): (ctx: CanvasRenderingContext2D) => void {
  const shape = SHAPES[id];
  if (!shape) return () => {};

  return (ctx) => {
    ctx.save();
    ctx.lineWidth = Math.max(4, box.rowHeight * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle;
    for (let i = 0; i < box.count; i++) {
      ctx.beginPath();
      shape(ctx, box, box.x + i * box.pitch);
      ctx.stroke();
    }
    ctx.restore();
  };
}
