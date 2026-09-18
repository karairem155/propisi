// Müfredat tanımı — brief Bölüm 7.2, 7.7, 11.1, 11.2.
//
// Patika, Alfabe ve tekrar kuyruğu hep bu dosyadan beslenir. Tek kaynak.
//
// ⚠️ İKİ SIRALAMA VAR VE BİRBİRİNDEN FARKLI (brief 11.1 vs 11.2):
//
//   · Grup sırası (11.1)      — ortak yazım elementine göre. Brief 14, Faz 1'i
//                               buna göre kuruyor (pilot = Grup 1).
//   · Ders sırası (11.2)      — Тихомиров: о, а, с, у, ш, л, м, р, п, к, и, н...
//                               Sesli harfleri öne alır ki kelime hemen kurulabilsin.
//
// Patika grup sırasını izliyor (brief 14 öyle diyor). Bunun bedeli: Grup 1-3'te
// neredeyse hiç sesli harf yok (и, я, у), kelime çalışması ancak Grup 4'te
// (с е о а д б) açılıyor. Aşağıdaki kelime listeleri bu kısıtla seçildi —
// her kelime yalnızca o noktaya kadar öğrenilmiş harfleri içeriyor.
//
// ё ve й hiçbir grupta geçmiyor (7 grup 31 harf kapsıyor, alfabe 33). İkisi de
// türev harf: ё = е + iki nokta, й = и + kısa işareti. Taban harflerinin grubuna
// "türev ders" olarak bağlandılar.

export type ElementLesson = {
  id: string;
  name: string;
  ru: string;
  /** Hangi maskot bu elemanı temsil ediyor (ui/mascot.ts). */
  mascot?: 'cubuk' | 'kanca' | 'oval' | 'ilmek';
};

export type WordItem = {
  ru: string;
  tr: string;
  /** Vurgulu hecenin harf indeksi (brief 7.4 — ударение). */
  stress: number;
};

export type LetterItem = {
  ch: string;
  /** Türev harf mi (ё, й) — kendi dersi var ama taban harfe bağlı. */
  derivedFrom?: string;
  /** Kısa Türkçe ipucu; brief 4.2 commonMistakes'in özeti. */
  hint?: string;
};

export type Level = {
  id: string;
  tag: string;
  name: string;
  ru: string;
  letters: LetterItem[];
  joins: string[];
  words: WordItem[];
  /** Kelime dersi bu seviyede açılabiliyor mu (sesli harf kısıtı). */
  wordsReady: boolean;
};

/** Faz 0 — добукварный период. Harflerden ÖNCE gelir (brief 7.2). */
export const ELEMENTS: ElementLesson[] = [
  { id: 'el-stroka', name: 'Satır', ru: 'рабочая строка' },
  { id: 'el-naklon', name: 'Eğik çizgi', ru: 'наклонная палочка', mascot: 'cubuk' },
  { id: 'el-kryuchok', name: 'Kanca', ru: 'крючок', mascot: 'kanca' },
  { id: 'el-dvojnoj', name: 'İki ucu yuvarlak', ru: 'закругление сверху и снизу' },
  { id: 'el-oval', name: 'Oval', ru: 'овал и полуовал', mascot: 'oval' },
  { id: 'el-petlya', name: 'İlmek', ru: 'петелька', mascot: 'ilmek' },
  { id: 'el-bordyur', name: 'Bordür', ru: 'чередование овалов', mascot: 'oval' },
];

/** Harf grupları — brief 11.1. Sıra budur. */
export const LEVELS: Level[] = [
  {
    id: 'g1',
    tag: 'Seviye 1',
    name: 'Temel bağlantı',
    ru: 'и ш п р т г',
    letters: [
      { ch: 'и', hint: '2 tepe' },
      { ch: 'ш', hint: '3 tepe — altta ayırt edici çizgi' },
      { ch: 'п' },
      { ch: 'р', hint: 'inen kuyruk' },
      { ch: 'т', hint: '3 tepe — üstte ayırt edici çizgi' },
      { ch: 'г' },
      { ch: 'й', derivedFrom: 'и', hint: 'и + kısa işareti' },
    ],
    joins: ['ши', 'иш', 'ти', 'пи', 'ир'],
    words: [
      { ru: 'три', tr: 'üç', stress: 2 },
      { ru: 'тигр', tr: 'kaplan', stress: 1 },
      { ru: 'шип', tr: 'diken', stress: 1 },
      { ru: 'пир', tr: 'ziyafet', stress: 1 },
    ],
    wordsReady: true,
  },
  {
    id: 'g2',
    tag: 'Seviye 2',
    name: 'Saat yönünün tersi',
    ru: 'л м я',
    letters: [{ ch: 'л', hint: '2 tepe' }, { ch: 'м', hint: '3 tepe' }, { ch: 'я' }],
    joins: ['ли', 'ми', 'мя', 'ля'],
    words: [
      { ru: 'мир', tr: 'dünya · barış', stress: 1 },
      { ru: 'имя', tr: 'isim', stress: 0 },
      { ru: 'миля', tr: 'mil', stress: 0 },
    ],
    wordsReady: true,
  },
  {
    id: 'g3',
    tag: 'Seviye 3',
    name: 'İlmek bazlı',
    ru: 'у ц щ ч',
    letters: [{ ch: 'у' }, { ch: 'ц' }, { ch: 'щ', hint: 'ш + kuyruk' }, { ch: 'ч' }],
    joins: ['чи', 'щи', 'цу', 'лу'],
    words: [
      { ru: 'мяч', tr: 'top', stress: 1 },
      { ru: 'щит', tr: 'kalkan', stress: 1 },
      { ru: 'луч', tr: 'ışın', stress: 1 },
      { ru: 'уши', tr: 'kulaklar', stress: 0 },
    ],
    wordsReady: true,
  },
  {
    id: 'g4',
    tag: 'Seviye 4',
    name: 'Oval ve yarım oval',
    ru: 'с е о а д б',
    letters: [
      { ch: 'с' },
      { ch: 'е' },
      { ch: 'о' },
      { ch: 'а' },
      { ch: 'д', hint: 'inen ilmek' },
      { ch: 'б', hint: 'çıkan kuyruk' },
      { ch: 'ё', derivedFrom: 'е', hint: 'е + iki nokta' },
    ],
    joins: ['ос', 'ао', 'од', 'се', 'ба'],
    words: [
      { ru: 'мама', tr: 'anne', stress: 1 },
      { ru: 'дом', tr: 'ev', stress: 1 },
      { ru: 'сад', tr: 'bahçe', stress: 1 },
      { ru: 'роса', tr: 'çiy', stress: 3 },
    ],
    wordsReady: true,
  },
  {
    id: 'g5',
    tag: 'Seviye 5',
    name: 'Küçük ilmekli',
    ru: 'ь ъ ы в',
    letters: [{ ch: 'ь' }, { ch: 'ъ' }, { ch: 'ы', hint: 'ь + и' }, { ch: 'в' }],
    joins: ['ыв', 'вь', 'сь'],
    words: [
      { ru: 'вода', tr: 'su', stress: 3 },
      { ru: 'сыр', tr: 'peynir', stress: 1 },
      { ru: 'дверь', tr: 'kapı', stress: 2 },
    ],
    wordsReady: true,
  },
  {
    id: 'g6',
    tag: 'Seviye 6',
    name: 'Yön değişimi',
    ru: 'н ю к',
    letters: [{ ch: 'н' }, { ch: 'ю' }, { ch: 'к' }],
    joins: ['нн', 'юк', 'ко'],
    words: [
      { ru: 'окно', tr: 'pencere', stress: 3 },
      { ru: 'книга', tr: 'kitap', stress: 1 },
      { ru: 'рука', tr: 'el', stress: 3 },
    ],
    wordsReady: true,
  },
  {
    id: 'g7',
    tag: 'Seviye 7',
    name: 'Saat yönü',
    ru: 'з э ж х ф',
    letters: [{ ch: 'з' }, { ch: 'э' }, { ch: 'ж' }, { ch: 'х' }, { ch: 'ф' }],
    joins: ['же', 'зо', 'ху'],
    words: [
      { ru: 'хлеб', tr: 'ekmek', stress: 2 },
      { ru: 'жизнь', tr: 'hayat', stress: 1 },
      { ru: 'звезда', tr: 'yıldız', stress: 5 },
    ],
    wordsReady: true,
  },
];

/**
 * "Canavar" kelimeler — brief 6.1 ve 7.3.
 * Rus el yazısının asıl zorluğu: и, л, м, ш, щ, ы aynı temel elementten oluşur,
 * bu kelimeler neredeyse tek bir tekrarlayan şekle iner. Uygulamanın değer
 * ürettiği yer burası.
 */
export const HARD_WORDS: { ru: string; tr: string; after: string; why: string }[] = [
  { ru: 'мщу', tr: 'öç alıyorum', after: 'g3', why: 'лицу ile el yazısında tamamen aynı' },
  { ru: 'лицу', tr: 'yüze', after: 'g3', why: 'мщу ile el yazısında tamamen aynı' },
  { ru: 'лишишь', tr: 'mahrum edersin', after: 'g5', why: 'neredeyse tek elementten ibaret' },
  { ru: 'шиншилла', tr: 'çinçilla', after: 'g6', why: 'klasik zorluk kelimesi' },
  { ru: 'волшебник', tr: 'sihirbaz', after: 'g7', why: 'лш / ми ayrımı' },
];

/** Alfabedeki 33 harf, standart sırada — Alfabe ızgarası bunu kullanır. */
export const ALPHABET = [...'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'];

/** Bir harfin hangi seviyede öğretildiği. */
export function levelOfLetter(ch: string): Level | undefined {
  return LEVELS.find((l) => l.letters.some((x) => x.ch === ch));
}

/** Seviyeye kadar (dahil) öğrenilmiş harfler. */
export function lettersUpTo(levelId: string): Set<string> {
  const out = new Set<string>();
  for (const level of LEVELS) {
    for (const l of level.letters) out.add(l.ch);
    if (level.id === levelId) break;
  }
  return out;
}

export function totalLessons(): number {
  return (
    ELEMENTS.length +
    LEVELS.reduce((n, l) => n + l.letters.length + (l.joins.length ? 1 : 0) + (l.words.length ? 1 : 0) + 1, 0)
  );
}
