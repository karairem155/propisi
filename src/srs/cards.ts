// Tekrar kartı modeli — brief 8.1 ve 8.2.
//
// Uygulamanın merkezi bu: kullanıcının açık isteği "tekrar etme kısmı önemli olsun
// unutturmamak için". Kart yalnızca kelime değil — harf çizimi ve bağlantı da
// zamanlanır, hepsi aynı kuyruğa girer.

import { Rating, State, type Card } from 'ts-fsrs';

/** brief 8.1 — kart türleri ve ID formatı. */
export type CardKind =
  | 'letter:write' // Serbest yazım (Kademe 3)
  | 'letter:read' // El yazısı gösterilir, hangi harf?
  | 'letter:hunt' // Kelimede o harfi işaretle (ambiguity eğitimi)
  | 'element:write' // Element çizimi
  | 'join' // Harf çiftini yaz
  | 'word:write' // Anlam/ses verilir, el yazısıyla yaz
  | 'word:read' // El yazısı gösterilir, anlamı?
  | 'word:dictation'; // Duy → yaz

export type CardId = string; // 'letter:а:write' | 'join:ол' | 'word:мама:dictation'

export type SrsCard = {
  id: CardId;
  kind: CardKind;
  /** Kartın konusu: harf, çift ya da kelime. */
  subject: string;
  /** Hangi seviyeden geldi — patika ilerlemesi buradan okunur. */
  levelId: string;
  fsrs: Card;
  /** Hata türü sayaçları — brief 7.8 zayıf harf raporu buradan beslenir. */
  errors: Record<string, number>;
  createdAt: number;
  lastResult?: 'pass' | 'fail';
};

export function cardId(kind: CardKind, subject: string): CardId {
  const [base, mode] = kind.split(':');
  return mode ? `${base}:${subject}:${mode}` : `${base}:${subject}`;
}

/**
 * brief 8.2 — çizim sonucunu FSRS notuna çevir.
 *
 *   hatasız + ipucu kullanılmadı  → Easy
 *   hatasız                       → Good
 *   1-2 hamle yeniden denendi     → Hard
 *   3+ hata veya ipucu kullanıldı → Again
 */
export function gradeFromAttempt(input: {
  mistakes: number;
  hintUsed: boolean;
  /** Dikte için: "tekrar dinle" sayısı da zorluk sinyali (brief 8.2). */
  replays?: number;
}): Rating.Again | Rating.Hard | Rating.Good | Rating.Easy {
  const { mistakes, hintUsed } = input;
  const replays = input.replays ?? 0;

  if (mistakes >= 3 || hintUsed) return Rating.Again;
  if (mistakes >= 1 || replays >= 2) return Rating.Hard;
  if (replays >= 1) return Rating.Good;
  return Rating.Easy;
}

/** Kart vadesi geçmiş mi. */
export function isDue(card: SrsCard, now = new Date()): boolean {
  return card.fsrs.due.getTime() <= now.getTime();
}

/** Kaç gün gecikmiş (negatifse henüz vadesi gelmemiş). */
export function overdueDays(card: SrsCard, now = new Date()): number {
  return Math.floor((now.getTime() - card.fsrs.due.getTime()) / 86_400_000);
}

/**
 * Ustalık 0..1 — ısı haritası ve patika düğüm rengi bunu kullanır (brief 7.8).
 * FSRS stability'yi doyumlu bir eğriyle 0..1'e sıkıştırır: 60 gün ≈ 0.8.
 */
export function mastery(card: SrsCard): number {
  if (card.fsrs.state === State.New) return 0;
  const s = Math.max(0, card.fsrs.stability);
  return Math.min(1, 1 - Math.exp(-s / 30));
}

export { Rating, State };
