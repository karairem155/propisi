// Kılavuz harf — çalışma ekranında arka plana konan soluk harf.
//
// Şekil fonttan (Bad Script, OFL) geliyor: glyph verisi gerektirmiyor, yani
// bugün çalışıyor. Aynı çizim işlevi grading/shape.ts'e de veriliyor ki
// değerlendirme tam olarak ekranda gördüğün şekle göre yapılsın.

import { baselines, type PaperConfig } from './paper';

const FAMILY = "'Bad Script', cursive";

let fontReady: Promise<void> | null = null;

/**
 * Webfont yüklenmeden canvas'a yazarsan yedek fontla çizer ve şekil yanlış olur —
 * hem kılavuz hem değerlendirme bozulur. Çizimden önce bu beklenmeli.
 */
export function ensureGuideFont(): Promise<void> {
  fontReady ??= (async () => {
    try {
      await document.fonts.load(`400 100px ${FAMILY}`, 'ишабвгд');
      await document.fonts.ready;
    } catch {
      /* font yüklenmezse yedekle devam — şekil bozuk olur ama çökmez */
    }
  })();
  return fontReady;
}

export type GuideBox = {
  /** Metnin sol kenarı. */
  x: number;
  /** Taban çizgisi. */
  baseline: number;
  fontSize: number;
  width: number;
  /** Harfin görsel yüksekliği (çıkan/inen dahil). */
  height: number;
};

/**
 * Harfi satıra oturtacak ölçüyü hesaplar: gövde yüksekliği рабочая строка'ya eşit.
 * Ölçü 'о' üzerinden alınır — çıkan/inen kuyruğu olmayan referans harf.
 */
export function measureGuide(
  ctx: CanvasRenderingContext2D,
  text: string,
  paper: PaperConfig,
  width: number,
  height: number,
): GuideBox {
  const PROBE = 100;
  ctx.save();
  ctx.font = `400 ${PROBE}px ${FAMILY}`;
  const ref = ctx.measureText('о');
  const refHeight = ref.actualBoundingBoxAscent + ref.actualBoundingBoxDescent || PROBE * 0.5;
  const fontSize = Math.max(12, (PROBE * paper.rowHeight) / refHeight);

  ctx.font = `400 ${fontSize}px ${FAMILY}`;
  const m = ctx.measureText(text);
  ctx.restore();

  const line = baselines(paper, height)[0] ?? height * 0.55;
  return {
    x: Math.max(16, (width - m.width) / 2),
    baseline: line,
    fontSize,
    width: m.width,
    height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
  };
}

/** Normalize başlangıç noktasını ekran koordinatına çevirir. */
export function startPointOf(
  box: GuideBox,
  start: { x: number; y: number },
  rowHeight: number,
): { x: number; y: number } {
  return {
    x: box.x + start.x * box.width,
    y: box.baseline - start.y * rowHeight,
  };
}

/**
 * Propisi kitaplarındaki numaralı başlangıç noktası.
 * Kılavuz görünürken çizilir — kılavuz yoksa ipucu da olmamalı.
 */
export function drawStartMarker(
  ctx: CanvasRenderingContext2D,
  at: { x: number; y: number },
  rowHeight: number,
  alpha = 1,
): void {
  const r = Math.max(7, rowHeight * 0.13);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#35c79a';
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1.5, r * 0.22);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${Math.round(r * 1.25)}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', at.x, at.y + r * 0.06);
  ctx.restore();
}

export type GuideStyle = {
  /** 0 = görünmez (Kademe 3), 0.28 civarı = kılavuzlu (Kademe 1). */
  alpha: number;
  color?: string;
};

export function drawGuide(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: GuideBox,
  style: GuideStyle,
): void {
  if (style.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = style.alpha;
  ctx.fillStyle = style.color ?? '#1d3f8f';
  ctx.font = `400 ${box.fontSize}px ${FAMILY}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, box.x, box.baseline);
  ctx.restore();
}

/**
 * Değerlendirme için hedef maskesi — kılavuzun tam opak hâli.
 * scoreShape bunu `drawTarget` olarak alır.
 */
export function targetPainter(
  text: string,
  box: GuideBox,
): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    ctx.font = `400 ${box.fontSize}px ${FAMILY}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, box.x, box.baseline);
  };
}
