// Uygulama genelinde paylaşılan veri tipleri.
// StrokeAttempt brief 6.3'ten birebir: kalibrasyon korpusunun birimi budur.

/** Ham giriş noktası. Seyreltilmemiş — korpusa bu hâliyle yazılır. */
export type InkPoint = {
  x: number; // CSS px, çizim yüzeyinin sol üstüne göre
  y: number;
  p: number; // basınç 0..1
  t: number; // hamle başlangıcından beri ms
};

export type InkStroke = {
  points: InkPoint[];
  pointerType: string; // 'pen' | 'mouse' | 'touch'
  /** Toplam coalesced örnek — rawMoves ile oranı Pencil örnekleme kazancını verir. */
  coalescedCount: number;
  /** Gerçekten tetiklenen pointermove sayısı (frame hızı). */
  rawMoves: number;
  /** Hamle pointercancel ile mi bitti — brief 12.2, Scribble sinyali. */
  canceled: boolean;
};

export type Verdict = 'pass' | 'fail' | 'unknown';

/**
 * brief 6.3 — her deneme kaydedilir. Eşikler cihazda tek tek çizerek değil,
 * bu korpus üzerinde yeniden oynatılarak ayarlanır.
 */
export type StrokeAttempt = {
  id: string;
  ts: number;
  target: string; // 'letter:и' | 'element:крючок' | 'join:ол' | 'sandbox'
  stage: 1 | 2 | 3;
  strokes: InkStroke[];
  verdict: Verdict;
  failedChecks: string[];
  thresholds: Record<string, number>;
  hintUsed: boolean;
  env: AttemptEnv;
};

/** Denemenin hangi koşulda alındığı. Korpusu yorumlarken şart. */
export type AttemptEnv = {
  appVersion: string;
  ua: string;
  /** Ana ekrandan mı açıldı — brief 12.4, Safari sekmesi ayrı depolama kavanozu. */
  standalone: boolean;
  dpr: number;
  surface: { w: number; h: number };
  /** Context desynchronized'ı gerçekten verdi mi (null = okunamadı). */
  desynchronized: boolean | null;
};

export const APP_VERSION = '0.1.0';

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
