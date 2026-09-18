// Propisi defter zemini — brief 7.1 "her kademede sabit olanlar".
// Taban çizgisi, üst çizgi, orta çizgi ve eğik yardımcı çizgiler (наклонные линии).
// Rus okul defterlerinde eğim standardı yataya göre 65°.

export type PaperConfig = {
  /** Рабочая строка yüksekliği (üst çizgi ile taban çizgisi arası), CSS px. */
  rowHeight: number;
  /** Satırlar arası boşluk — çıkan/inen kuyruklar için. rowHeight çarpanı. */
  gapRatio: number;
  /** Eğik çizgi açısı, yataya göre derece. Rus standardı 65. */
  slantDeg: number;
  /** Eğik çizgiler arası yatay mesafe, CSS px. */
  slantGap: number;
  showSlant: boolean;
  showMid: boolean;
};

export const DEFAULT_PAPER: PaperConfig = {
  rowHeight: 64,
  gapRatio: 0.9,
  slantDeg: 65,
  slantGap: 32,
  showSlant: true,
  showMid: true,
};

// Renkler ui/style.css token'larıyla aynı aileden. Kağıt beyaza yakın ki
// beyaz kartlarla uyumlu olsun — ama satır yapısı pedagojik, o değişmez.
const INK_BG = '#fdfcf8';
const LINE = 'rgba(64, 106, 176, 0.34)';
const LINE_STRONG = 'rgba(29, 63, 143, 0.58)';
const LINE_MID = 'rgba(64, 106, 176, 0.18)';
const LINE_SLANT = 'rgba(142, 124, 240, 0.24)';

/** Bir satırın taban çizgisi y koordinatları. */
export function baselines(cfg: PaperConfig, height: number): number[] {
  const pitch = cfg.rowHeight * (1 + cfg.gapRatio);
  const out: number[] = [];
  for (let y = cfg.rowHeight + cfg.rowHeight * cfg.gapRatio * 0.5; y < height; y += pitch) {
    out.push(y);
  }
  return out;
}

export function drawPaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cfg: PaperConfig,
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = INK_BG;
  ctx.fillRect(0, 0, width, height);

  // Eğik yardımcı çizgiler — sayfanın tamamını kateder.
  if (cfg.showSlant) {
    const rad = (cfg.slantDeg * Math.PI) / 180;
    const dx = height / Math.tan(rad); // tepe noktasının yatay kayması
    ctx.strokeStyle = LINE_SLANT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -dx; x < width + dx; x += cfg.slantGap) {
      ctx.moveTo(x, height);
      ctx.lineTo(x + dx, 0);
    }
    ctx.stroke();
  }

  ctx.lineWidth = 1;
  for (const base of baselines(cfg, height)) {
    const top = base - cfg.rowHeight;

    if (cfg.showMid) {
      ctx.strokeStyle = LINE_MID;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.moveTo(0, base - cfg.rowHeight / 2);
      ctx.lineTo(width, base - cfg.rowHeight / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(width, top);
    ctx.stroke();

    // Taban çizgisi en belirgin olan — harf buradan başlar.
    ctx.strokeStyle = LINE_STRONG;
    ctx.beginPath();
    ctx.moveTo(0, base);
    ctx.lineTo(width, base);
    ctx.stroke();
  }

  ctx.restore();
}
