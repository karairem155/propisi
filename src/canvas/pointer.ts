// Apple Pencil giriş katmanı — brief 12.1.
//
// ÖNEMLİ (brief 3.1): hanzi-writer PointerEvent kullanmıyor, mouse/touch bağlıyor.
// Bu dosyadaki hiçbir şey kütüphaneden gelmez; pointer boru hattı bizim.
// Kütüphaneye noktalar Faz 1'de grading/adapter.ts üzerinden elle beslenecek.

import type { InkPoint } from '../types';

const proto = typeof PointerEvent !== 'undefined' ? PointerEvent.prototype : null;

export const pointerSupport = {
  coalesced: !!proto && 'getCoalescedEvents' in proto,
  predicted: !!proto && 'getPredictedEvents' in proto,
  pressure: !!proto && 'pressure' in proto,
  tilt: !!proto && 'tiltX' in proto,
  altitude: !!proto && 'altitudeAngle' in proto,
};

export type PointerStats = {
  /** Toplanan coalesced örnek sayısı. */
  coalesced: number;
  /** Tetiklenen pointermove sayısı. coalesced/rawMoves = örnekleme kazancı. */
  rawMoves: number;
  downs: number;
  ups: number;
  /** brief 12.2 — Scribble girdiyi kaparsa burada görünür. Test 3'ün asıl sinyali. */
  cancels: number;
};

export type PointerSink = {
  onStart(pt: InkPoint, e: PointerEvent): void;
  onMove(pts: InkPoint[], predicted: InkPoint[], e: PointerEvent): void;
  onEnd(reason: 'up' | 'cancel'): void;
};

export type PointerConfig = {
  /** true = sadece Pencil. Palm rejection'ın birinci katmanı. */
  penOnly: boolean;
  /** getPredictedEvents() ile spekülatif uç çizilsin mi. */
  usePredicted: boolean;
};

/**
 * brief 12.1 basınç tuzağı: fare basılıyken 0.5, değilken 0 verir; Pencil sürekli 0..1.
 * Fallback SADECE tam eşitlikte uygulanır — `pressure < 0.01` gibi bir eşik koyarsan
 * hafif dokunuşlarda çizgi kalınlığı zıplar.
 */
function pressureOf(e: PointerEvent): number {
  return e.pressure === 0 ? 0.5 : e.pressure;
}

/** Sentetik olaylarda boş dizi döner — event'in kendisine düş (brief 12.1). */
function coalescedOf(e: PointerEvent): PointerEvent[] {
  if (!pointerSupport.coalesced) return [e];
  const list = e.getCoalescedEvents();
  return list.length ? list : [e];
}

function predictedOf(e: PointerEvent): PointerEvent[] {
  if (!pointerSupport.predicted) return [];
  return e.getPredictedEvents();
}

export type PointerHandle = {
  stats: PointerStats;
  config: PointerConfig;
  detach(): void;
  resetStats(): void;
};

export function attachPointer(
  el: HTMLElement,
  sink: PointerSink,
  config: PointerConfig,
): PointerHandle {
  let activeId: number | null = null;
  let t0 = 0;
  let box = el.getBoundingClientRect();

  const stats: PointerStats = { coalesced: 0, rawMoves: 0, downs: 0, ups: 0, cancels: 0 };

  const toInk = (e: PointerEvent): InkPoint => ({
    x: e.clientX - box.left,
    y: e.clientY - box.top,
    p: pressureOf(e),
    t: e.timeStamp - t0,
  });

  const accepts = (e: PointerEvent) => !config.penOnly || e.pointerType === 'pen';

  const onDown = (e: PointerEvent) => {
    if (activeId !== null || !accepts(e)) return;
    e.preventDefault();
    box = el.getBoundingClientRect(); // kaydırma/yeniden boyutlanma sonrası taze ölçüm
    activeId = e.pointerId;
    t0 = e.timeStamp;
    stats.downs++;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* capture desteklenmiyorsa sorun değil */
    }
    sink.onStart(toInk(e), e);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return;
    e.preventDefault();
    stats.rawMoves++;
    const batch = coalescedOf(e);
    stats.coalesced += batch.length;
    sink.onMove(batch.map(toInk), config.usePredicted ? predictedOf(e).map(toInk) : [], e);
  };

  const finish = (e: PointerEvent, reason: 'up' | 'cancel') => {
    if (e.pointerId !== activeId) return;
    if (reason === 'up') e.preventDefault();
    activeId = null;
    if (reason === 'up') stats.ups++;
    else stats.cancels++;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* zaten bırakılmış olabilir */
    }
    sink.onEnd(reason);
  };

  const onUp = (e: PointerEvent) => finish(e, 'up');
  const onCancel = (e: PointerEvent) => finish(e, 'cancel');

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);
  // Yüzeyin dışında bırakılan kalem için — capture varsa nadiren gerekir.
  el.addEventListener('pointerleave', onUp);

  return {
    stats,
    config,
    detach() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('pointerleave', onUp);
    },
    resetStats() {
      stats.coalesced = 0;
      stats.rawMoves = 0;
      stats.downs = 0;
      stats.ups = 0;
      stats.cancels = 0;
    },
  };
}
