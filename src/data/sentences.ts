// Cümle alıştırması — müfredatın en üst basamağı.
//
// Harf, bağlantı ve kelime çalışıldıktan sonra sıra gerçek yazıya geliyor:
// büyük harf, kelime arası boşluk, nokta. Tek kelime yazarken hiç
// karşılaşmadığın üç şey.
//
// KISIT: her cümle YALNIZCA o noktaya kadar öğretilmiş harflerden kurulu.
// Öğretilmemiş bir harf, "bunu daha görmedim" demekten başka bir şey
// öğretmiyor. Liste `npm run build` sırasında değil ama `tools/` altındaki
// denetimle doğrulanabiliyor; harfler curriculum.ts'ten türetiliyor.
//
// Büyük harfler kısıtın DIŞINDA sayılıyor: el yazısı büyük harf ayrı bir
// derstir ve müfredatta henüz yok. Cümlenin ilk harfi büyük yazılıyor ama
// değerlendirme küçük harf şekline bakıyor — bu bilinçli bir esneklik.

import { lettersUpTo } from './curriculum';

export type Sentence = {
  id: string;
  ru: string;
  tr: string;
  /** Bu seviyeden sonra açılır. */
  after: string;
  /** Neyi öğretiyor — ekranda ipucu olarak gösteriliyor. */
  note: string;
};

export const SENTENCES: Sentence[] = [
  // ── Grup 4 sonrası: ilk sesli harfler geldi (с е о а д б) ────────────────
  {
    id: 's1',
    ru: 'Мама дома.',
    tr: 'Annem evde.',
    after: 'g4',
    note: 'İlk cümlen: iki kelime, bir nokta.',
  },
  {
    id: 's2',
    ru: 'Тут сад.',
    tr: 'Burada bahçe var.',
    after: 'g4',
    note: 'Kısa ve net — boşluğu doğru bırak.',
  },
  {
    id: 's3',
    ru: 'Папа и мама дома.',
    tr: 'Babam ve annem evde.',
    after: 'g4',
    note: 'Üç kelime. Tek harflik "и" de bir kelimedir.',
  },

  // ── Grup 5 sonrası: ь ъ ы в ─────────────────────────────────────────────
  {
    id: 's4',
    ru: 'Вот дом.',
    tr: 'İşte ev.',
    after: 'g5',
    note: 'в ile başlayan bağlantıya dikkat.',
  },
  {
    id: 's5',
    ru: 'Ты был дома.',
    tr: 'Evdeydin.',
    after: 'g5',
    note: 'ы iki parçadan oluşur: ь ve ı çizgisi.',
  },
  {
    id: 's6',
    ru: 'Вода тёплая.',
    tr: 'Su ılık.',
    after: 'g5',
    note: 'ё iki noktalı — noktaları kelimenin sonunda koy.',
  },

  // ── Grup 6 sonrası: н ю к ───────────────────────────────────────────────
  {
    id: 's7',
    ru: 'Книга на столе.',
    tr: 'Kitap masanın üstünde.',
    after: 'g6',
    note: 'Üç kelime, iki boşluk, bir nokta.',
  },
  {
    id: 's8',
    ru: 'Я люблю маму.',
    tr: 'Annemi seviyorum.',
    after: 'g6',
    note: 'ю ve б aynı kelimede — ikisi de ilmekli.',
  },
  {
    id: 's9',
    ru: 'Окно открыто.',
    tr: 'Pencere açık.',
    after: 'g6',
    note: 'Dört o, dördü de aynı ovalden.',
  },
  {
    id: 's10',
    ru: 'Кот спит на окне.',
    tr: 'Kedi pencerede uyuyor.',
    after: 'g6',
    note: 'Dört kelime — ilk uzun cümlen.',
  },

  // ── Grup 7 sonrası: alfabe tamam ────────────────────────────────────────
  {
    id: 's11',
    ru: 'Хлеб на столе.',
    tr: 'Ekmek masanın üstünde.',
    after: 'g7',
    note: 'х çapraz iki çizgi, tek hamlede.',
  },
  {
    id: 's12',
    ru: 'Жизнь прекрасна.',
    tr: 'Hayat güzel.',
    after: 'g7',
    note: 'ж üç parçalı — en geniş harf.',
  },
  {
    id: 's13',
    ru: 'Звезда на небе.',
    tr: 'Yıldız gökyüzünde.',
    after: 'g7',
    note: 'з ile в karışır; з aşağı iner.',
  },
  {
    id: 's14',
    ru: 'Это мой новый дом.',
    tr: 'Bu benim yeni evim.',
    after: 'g7',
    note: 'Dört kelime, on beş harf. Elini dinlendirmeden yaz.',
  },
  {
    id: 's15',
    ru: 'Я пишу русские буквы каждый день.',
    tr: 'Her gün Rusça harfler yazıyorum.',
    after: 'g7',
    note: 'Beş kelime — müfredatın en uzun cümlesi.',
  },
];

/** Cümlenin kelimeleri — noktalama kelimeye yapışık kalıyor. */
export function wordsOf(sentence: Sentence): string[] {
  return sentence.ru.split(/\s+/).filter(Boolean);
}

/** Bu seviyeye kadar açılmış cümleler. */
export function sentencesUpTo(levelId: string): Sentence[] {
  const order = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7'];
  const limit = order.indexOf(levelId);
  return SENTENCES.filter((s) => order.indexOf(s.after) <= limit);
}

export function findSentence(id: string): Sentence | undefined {
  return SENTENCES.find((s) => s.id === id);
}

/**
 * Cümle yalnız öğretilmiş harflerden mi kurulu?
 *
 * Geliştirme denetimi — `#/dev/cumleler` bunu tabloya döküyor. Büyük harf ve
 * noktalama sayılmıyor (yukarıdaki nota bakın).
 */
export function unknownLetters(sentence: Sentence): string[] {
  const known = lettersUpTo(sentence.after);
  const out = new Set<string>();
  for (const ch of sentence.ru.toLocaleLowerCase('ru')) {
    if (ch === ' ' || ch === '.' || ch === ',' || ch === '!' || ch === '?') continue;
    if (!known.has(ch)) out.add(ch);
  }
  return [...out];
}
