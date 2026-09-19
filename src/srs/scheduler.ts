// FSRS sarmalayıcı ve tekrar kuyruğu — brief Bölüm 8.
//
// ts-fsrs 5.4.2 (MIT, sıfır bağımlılık, FSRS-6). SM-2'yi elle yazmaya gerek yok.

import { createEmptyCard, fsrs, type Grade } from 'ts-fsrs';
import { db } from '../db/db';
import {
  cardId,
  isDue,
  overdueDays,
  type CardId,
  type CardKind,
  type SrsCard,
} from './cards';

export const STORE_CARDS = 'cards';

const scheduler = fsrs();

export async function allCards(): Promise<SrsCard[]> {
  return (await (await db()).getAll(STORE_CARDS)) as SrsCard[];
}

export async function getCard(id: CardId): Promise<SrsCard | undefined> {
  return (await (await db()).get(STORE_CARDS, id)) as SrsCard | undefined;
}

export async function putCard(card: SrsCard): Promise<void> {
  await (await db()).put(STORE_CARDS, card);
}

/** Kart yoksa oluşturur. Ders açıldığında çağrılır. */
export async function ensureCard(
  kind: CardKind,
  subject: string,
  levelId: string,
): Promise<SrsCard> {
  const id = cardId(kind, subject);
  const existing = await getCard(id);
  if (existing) return existing;

  const card: SrsCard = {
    id,
    kind,
    subject,
    levelId,
    fsrs: createEmptyCard(),
    errors: {},
    createdAt: Date.now(),
  };
  await putCard(card);
  return card;
}

/** Bir denemeyi işle: FSRS'i ilerlet, hata sayaçlarını güncelle. */
export async function review(
  id: CardId,
  grade: Grade,
  failedChecks: string[] = [],
  now = new Date(),
): Promise<SrsCard | undefined> {
  const card = await getCard(id);
  if (!card) return undefined;

  const result = scheduler.next(card.fsrs, now, grade);
  card.fsrs = result.card;
  card.lastResult = failedChecks.length ? 'fail' : 'pass';
  for (const check of failedChecks) {
    card.errors[check] = (card.errors[check] ?? 0) + 1;
  }
  await putCard(card);
  return card;
}

/**
 * Şu an gerçekten çalışılabilen kart türleri.
 *
 * NEDEN VAR: tanıma (`:read`), bağlantı, kelime ve dikte kartlarının ekranı
 * henüz yok. Zamanlanırlarsa kuyrukta sonsuza kadar kalıyorlar — çalışma ekranı
 * yalnızca `:write` kartını değerlendirdiği için vadeleri hiç ilerlemiyor ve
 * aynı harf arka arkaya geliyordu. Çalışılamayan şey zamanlanmamalı.
 *
 * Ekranları geldikçe buraya eklenecek.
 */
const PRACTICABLE: CardKind[] = ['letter:write', 'element:write'];

export function isPracticable(card: SrsCard): boolean {
  return PRACTICABLE.includes(card.kind);
}

export type QueueBucket = 'letter' | 'element' | 'join' | 'word' | 'dictation';

export type Queue = {
  cards: SrsCard[];
  /** Vadesi bugünden önce geçmiş olanlar — brief 8.3, kırmızı rozet. */
  overdue: SrsCard[];
  counts: Record<QueueBucket, number>;
  total: number;
};

function bucketOf(card: SrsCard): QueueBucket {
  if (card.kind === 'word:dictation') return 'dictation';
  if (card.kind.startsWith('word')) return 'word';
  if (card.kind === 'join') return 'join';
  if (card.kind.startsWith('element')) return 'element';
  return 'letter';
}

/**
 * Bugünün kuyruğu.
 *
 * brief 7.0: "Tekrar kuyruğu karışık türdedir — harf çizimi, kelime yazımı, dikte,
 * eşleştirme aynı oturumda karışık gelir. Tek tip tekrar sıkıcıdır ve transfer
 * sağlamaz." Bu yüzden türe göre gruplamıyoruz; en gecikmişten başlayıp
 * türleri serpiştiriyoruz.
 *
 * brief 8.3: günlük tekrar limiti YOK. Sayı ne çıkarsa o.
 */
export async function buildQueue(now = new Date()): Promise<Queue> {
  const due = (await allCards()).filter((c) => isDue(c, now) && isPracticable(c));
  due.sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());

  const counts: Record<QueueBucket, number> = {
    letter: 0,
    element: 0,
    join: 0,
    word: 0,
    dictation: 0,
  };
  for (const card of due) counts[bucketOf(card)]++;

  return {
    cards: interleave(due),
    overdue: due.filter((c) => overdueDays(c, now) >= 1),
    counts,
    total: due.length,
  };
}

/**
 * Aynı türden kartları arka arkaya vermemek için serpiştirir.
 * Gecikme sırasını kabaca korur ama tür çeşitliliğini önceler.
 */
function interleave(cards: SrsCard[]): SrsCard[] {
  const lanes = new Map<QueueBucket, SrsCard[]>();
  for (const card of cards) {
    const key = bucketOf(card);
    const lane = lanes.get(key);
    if (lane) lane.push(card);
    else lanes.set(key, [card]);
  }

  const out: SrsCard[] = [];
  const order = [...lanes.keys()];
  let i = 0;
  while (out.length < cards.length) {
    const lane = lanes.get(order[i % order.length]!)!;
    const next = lane.shift();
    if (next) out.push(next);
    i++;
    if (i > cards.length * order.length + order.length) break; // güvenlik
  }
  return out;
}

/** Patika düğümlerinin durumu için: konuya ait kartların özeti. */
export async function progressBySubject(): Promise<
  Map<string, { cards: SrsCard[]; due: number; seen: boolean }>
> {
  const map = new Map<string, { cards: SrsCard[]; due: number; seen: boolean }>();
  const now = new Date();
  for (const card of await allCards()) {
    const entry = map.get(card.subject) ?? { cards: [], due: 0, seen: false };
    entry.cards.push(card);
    if (isDue(card, now)) entry.due++;
    if (card.fsrs.reps > 0) entry.seen = true;
    map.set(card.subject, entry);
  }
  return map;
}
