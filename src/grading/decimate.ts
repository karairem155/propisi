// Nokta seyreltme — brief 3.1 madde 3.
//
// hanzi-writer'ın continueUserStroke'u her noktada tüm nokta dizisini kopyalayıp
// yeniden render ediyor. 240 Hz ham coalesced akışı doğrudan beslersen hamle başına
// O(n²) iş çıkar ve boğulur.
//
// Ayrım: mürekkep HER ZAMAN ham akışla çizilir; grading'e buradan geçen seyreltilmiş
// akış gider. Değerlendirme eşikleri 1024'lük kutuda 150-350 mertebesinde olduğu için
// alt piksel çözünürlüğü notu değiştirmez.
//
// Faz 1'de adapter.ts bu akışı writer._quiz.continueUserStroke'a bağlayacak.

import type { InkPoint } from '../types';

export const DEFAULT_MIN_DIST = 2.5;

/** Bitmiş bir nokta dizisini seyreltir. İlk ve son nokta her zaman korunur. */
export function decimate(points: InkPoint[], minDist = DEFAULT_MIN_DIST): InkPoint[] {
  if (points.length <= 2) return points.slice();
  const min2 = minDist * minDist;
  const out: InkPoint[] = [points[0]!];
  let last = points[0]!;

  for (let i = 1; i < points.length - 1; i++) {
    const pt = points[i]!;
    const dx = pt.x - last.x;
    const dy = pt.y - last.y;
    if (dx * dx + dy * dy >= min2) {
      out.push(pt);
      last = pt;
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

/** Akış hâlinde seyreltme — canlı çizim sırasında kullanılır. */
export class Decimator {
  private last: InkPoint | null = null;
  private readonly min2: number;

  constructor(minDist = DEFAULT_MIN_DIST) {
    this.min2 = minDist * minDist;
  }

  /** Nokta kabul edilirse noktayı, edilmezse null döner. */
  push(pt: InkPoint): InkPoint | null {
    if (!this.last) {
      this.last = pt;
      return pt;
    }
    const dx = pt.x - this.last.x;
    const dy = pt.y - this.last.y;
    if (dx * dx + dy * dy < this.min2) return null;
    this.last = pt;
    return pt;
  }

  /** Hamle sonu — son nokta eşikten bağımsız geçer. */
  flush(pt: InkPoint): InkPoint {
    this.last = pt;
    return pt;
  }

  reset(): void {
    this.last = null;
  }
}
