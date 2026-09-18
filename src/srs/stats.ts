// Seri ve günlük sayaç.
//
// Bunlar ekranda baştan beri görünüyordu ama hiç hesaplanmıyordu — sabit sıfır
// gösteriyordu. Brief 8.3 seriyi unutturmama mekanizmasının parçası sayıyor,
// dolayısıyla sahte olması kabul edilemez.
//
// Gün anahtarı YEREL tarihten üretiliyor (UTC değil): gece 1'de çalışan biri
// için gün, takvimdeki gündür.

import { getSetting, setSetting } from '../db/db';

export type StudyStats = {
  /** 'YYYY-MM-DD' → o gün değerlendirilen kart sayısı. */
  days: Record<string, number>;
  streak: number;
  best: number;
  lastDay: string;
};

const KEY = 'studyStats';
const KEEP_DAYS = 180;

const EMPTY: StudyStats = { days: {}, streak: 0, best: 0, lastDay: '' };

export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return dayKey(date);
}

export async function loadStats(): Promise<StudyStats> {
  const raw = await getSetting<StudyStats>(KEY, EMPTY);
  return { ...EMPTY, ...raw, days: { ...raw.days } };
}

/**
 * Bir değerlendirme kaydedildi. Günün ilk kaydında seri güncellenir:
 * dün de çalışıldıysa artar, aradan gün atlandıysa sıfırdan başlar.
 */
export async function recordReview(now = new Date()): Promise<StudyStats> {
  const stats = await loadStats();
  const today = dayKey(now);

  if (stats.lastDay !== today) {
    stats.streak = stats.lastDay === shiftDays(today, -1) ? stats.streak + 1 : 1;
    stats.lastDay = today;
  }
  stats.days[today] = (stats.days[today] ?? 0) + 1;
  stats.best = Math.max(stats.best, stats.streak);

  // Eski günleri kırp — ayar kaydı şişmesin.
  const cutoff = shiftDays(today, -KEEP_DAYS);
  for (const k of Object.keys(stats.days)) {
    if (k < cutoff) delete stats.days[k];
  }

  await setSetting(KEY, stats);
  return stats;
}

export type StatsView = {
  today: number;
  streak: number;
  best: number;
  /** Son 7 günün sayıları, eskiden yeniye. */
  week: { day: string; count: number }[];
};

export async function statsView(now = new Date()): Promise<StatsView> {
  const stats = await loadStats();
  const today = dayKey(now);

  // Seri kopmuşsa göstermeden önce düzelt: dün de bugün de çalışılmadıysa 0.
  const yesterday = shiftDays(today, -1);
  const streak =
    stats.lastDay === today || stats.lastDay === yesterday ? stats.streak : 0;

  const week: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = shiftDays(today, -i);
    week.push({ day: key, count: stats.days[key] ?? 0 });
  }

  return { today: stats.days[today] ?? 0, streak, best: stats.best, week };
}
