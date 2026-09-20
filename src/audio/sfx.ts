// Arayüz sesleri.
//
// Uygulamada hiç ses yoktu: doğru yazınca da yanlış yazınca da aynı sessizlik.
// Geri bildirimin en hızlı kanalı ses — göz sonuca inmeden önce kulak cevabı
// almış oluyor.
//
// DOSYA YOK, SENTEZ VAR. Beş sesi WebAudio ile üretiyoruz:
//   · sıfır bayt indirme, çevrimdışı garanti (brief 12 — PWA)
//   · perde ve süre koddan ayarlanıyor, yeni ses için asset üretimi gerekmiyor
//   · service worker SHELL listesi büyümüyor
//
// iOS TUZAĞI — konuşma sentezindekinin aynısı (bkz. audio/speech.ts):
// AudioContext kullanıcı hareketi olmadan `suspended` başlıyor ve hiç ses
// çıkmıyor. İlk dokunuşta resume ediliyor.

import { getSetting, setSetting } from '../db/db';

export type SfxName = 'correct' | 'great' | 'wrong' | 'tap' | 'finish' | 'levelUp';

let ctx: AudioContext | null = null;
let muted = false;

/** Ayar yüklenene kadar sesler çalar; ilk okuma hemen düzeltir. */
export function initSfx(): void {
  void getSetting<boolean>('muteSfx', false).then((v) => {
    muted = v;
  });

  const wake = () => {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  };
  // `once` YOK: iOS bağlamı arka plana alınca yeniden askıya alıyor, her
  // dokunuşta uyandırmak gerekiyor.
  window.addEventListener('pointerdown', wake, { passive: true });
  window.addEventListener('touchstart', wake, { passive: true });
}

export function sfxMuted(): boolean {
  return muted;
}

export async function setSfxMuted(value: boolean): Promise<void> {
  muted = value;
  await setSetting('muteSfx', value);
}

type Note = {
  /** Hz. */
  f: number;
  /** Saniye cinsinden başlangıç gecikmesi. */
  at: number;
  /** Saniye. */
  dur: number;
  /** 0..1 */
  gain?: number;
  type?: OscillatorType;
};

/**
 * Perdeler rastgele değil: doğru cevaplar YUKARI çıkan aralık, yanlış cevap
 * AŞAĞI inen ikili. Müzikal yön, metni okumadan önce anlamı taşıyor.
 */
const SOUNDS: Record<SfxName, Note[]> = {
  // Do–Mi: kısa, tatlı, yoldan çekilen bir onay.
  correct: [
    { f: 523.25, at: 0, dur: 0.1 },
    { f: 659.25, at: 0.07, dur: 0.16 },
  ],
  // Do–Mi–Sol: tam akor, yalnızca yüksek puanda.
  great: [
    { f: 523.25, at: 0, dur: 0.1 },
    { f: 659.25, at: 0.07, dur: 0.12 },
    { f: 783.99, at: 0.14, dur: 0.24 },
  ],
  // İnen küçük ikili, yumuşak üçgen dalga — cezalandırıcı değil, "tekrar dene".
  wrong: [
    { f: 311.13, at: 0, dur: 0.12, type: 'triangle', gain: 0.5 },
    { f: 261.63, at: 0.09, dur: 0.2, type: 'triangle', gain: 0.5 },
  ],
  tap: [{ f: 880, at: 0, dur: 0.045, gain: 0.22 }],
  // Ders sonu: dörtlü çıkış.
  finish: [
    { f: 523.25, at: 0, dur: 0.1 },
    { f: 659.25, at: 0.09, dur: 0.1 },
    { f: 783.99, at: 0.18, dur: 0.1 },
    { f: 1046.5, at: 0.27, dur: 0.34 },
  ],
  // Seviye açıldı: aynı çıkış, altında beşli pedal.
  levelUp: [
    { f: 392.0, at: 0, dur: 0.5, gain: 0.3, type: 'triangle' },
    { f: 523.25, at: 0.05, dur: 0.12 },
    { f: 659.25, at: 0.16, dur: 0.12 },
    { f: 783.99, at: 0.27, dur: 0.12 },
    { f: 1046.5, at: 0.38, dur: 0.4 },
  ],
};

export function sfx(name: SfxName): void {
  if (muted || !ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  for (const note of SOUNDS[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type ?? 'sine';
    osc.frequency.value = note.f;

    // Zarf: hızlı atak, üstel sönüm. Kare kesme "tık" sesi yapıyor.
    const peak = note.gain ?? 0.38;
    const t0 = now + note.at;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + note.dur + 0.02);
  }
}

/** Puana göre doğru sesi — 85 üstü tam akor. */
export function sfxForScore(score: number, passed: boolean): void {
  if (!passed) return sfx('wrong');
  sfx(score >= 0.85 ? 'great' : 'correct');
}
