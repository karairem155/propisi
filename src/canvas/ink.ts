// perfect-freehand ile mürekkep render'ı — brief 3, "el yazısı için doğru primitif".
// Basınç verisi gerçek olduğu için simulatePressure kapalı; fare girdisinde açılır.

import { getStroke } from 'perfect-freehand';
import type { InkPoint } from '../types';

export type InkStyle = {
  size: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  simulatePressure: boolean;
};

/** Pencil: gerçek basınç var, inceltme açık. */
export const PEN_STYLE: InkStyle = {
  size: 7,
  thinning: 0.55,
  smoothing: 0.5,
  streamline: 0.35,
  simulatePressure: false,
};

/** Fare/parmak: basınç sabit 0.5 geliyor, hızdan sahte basınç üret. */
export const MOUSE_STYLE: InkStyle = {
  ...PEN_STYLE,
  thinning: 0.35,
  simulatePressure: true,
};

export function styleFor(pointerType: string): InkStyle {
  return pointerType === 'pen' ? PEN_STYLE : MOUSE_STYLE;
}

/**
 * Nokta dizisini dolgulu dış hat Path2D'sine çevirir.
 * `last=false` → hamle devam ediyor, uç yuvarlatılmaz (canlı çizimde doğru görünür).
 */
export function outlinePath(points: InkPoint[], style: InkStyle, last: boolean): Path2D {
  const path = new Path2D();
  if (points.length === 0) return path;

  const input: [number, number, number][] = points.map((p) => [p.x, p.y, p.p]);
  const outline = getStroke(input, { ...style, last });
  if (outline.length < 3) return path;

  const first = outline[0]!;
  path.moveTo(first[0]!, first[1]!);
  for (let i = 1; i < outline.length; i++) {
    const pt = outline[i]!;
    path.lineTo(pt[0]!, pt[1]!);
  }
  path.closePath();
  return path;
}
