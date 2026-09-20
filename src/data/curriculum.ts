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
  /**
   * Seslendirmede okunacak metin. Boşsa harfin kendisi okunur — ama o zaman TTS
   * harfin ADINI söylüyor (п → "pe", р → "er"). Öğrenirken gereken harfin
   * ÇIKARDIĞI ses; Rus alfabe kitaplarının yaptığı gibi ünsüzü açık heceyle
   * gösteriyoruz (п → "па", р → "ра"). Ünlülerde ad ile ses aynı, alan boş.
   */
  say?: string;
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
      { ch: 'ш', say: 'ша', hint: '3 tepe — altta ayırt edici çizgi' },
      { ch: 'п', say: 'па' },
      { ch: 'р', say: 'ра', hint: 'inen kuyruk' },
      { ch: 'т', say: 'та', hint: '3 tepe — üstte ayırt edici çizgi' },
      { ch: 'г', say: 'га' },
      { ch: 'й', say: 'ай', derivedFrom: 'и', hint: 'и + kısa işareti' },
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
    letters: [{ ch: 'л', say: 'ла', hint: '2 tepe' }, { ch: 'м', say: 'ма', hint: '3 tepe' }, { ch: 'я' }],
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
    letters: [{ ch: 'у' }, { ch: 'ц', say: 'ца' }, { ch: 'щ', say: 'ща', hint: 'ш + kuyruk' }, { ch: 'ч', say: 'ча' }],
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
      { ch: 'с', say: 'са' },
      { ch: 'е' },
      { ch: 'о' },
      { ch: 'а' },
      { ch: 'д', say: 'да', hint: 'inen ilmek' },
      { ch: 'б', say: 'ба', hint: 'çıkan kuyruk' },
      { ch: 'ё', derivedFrom: 'е', hint: 'е + iki nokta' },
    ],
    // о ve б gövde üstünde bitiyor: üst bağlantı alıştırması burada başlıyor.
    joins: ['ос', 'ао', 'од', 'се', 'ба', 'ом', 'оп'],
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
    letters: [{ ch: 'ь', say: 'мягкий знак' }, { ch: 'ъ', say: 'твёрдый знак' }, { ch: 'ы', hint: 'ь + и' }, { ch: 'в', say: 'ва' }],
    joins: ['ыв', 'вь', 'сь', 'ви', 'ва'],
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
    letters: [{ ch: 'н', say: 'на' }, { ch: 'ю' }, { ch: 'к', say: 'ка' }],
    joins: ['нн', 'юк', 'ко', 'он', 'бу'],
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
    letters: [{ ch: 'з', say: 'за' }, { ch: 'э' }, { ch: 'ж', say: 'жа' }, { ch: 'х', say: 'ха' }, { ch: 'ф', say: 'фа' }],
    joins: ['же', 'зо', 'ху', 'оз', 'вж'],
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

/** Müfredattaki bütün kelimeler: seviye kelimeleri + canavar kelimeler. */
export const ALL_WORDS: string[] = [
  ...new Set([...LEVELS.flatMap((l) => l.words.map((w) => w.ru)), ...HARD_WORDS.map((w) => w.ru)]),
];

/**
 * Harfi içeren kelimeler.
 *
 * Harf avı bunlarsız kurulamıyor ve beş harf (`ё й ф ъ э`) hiçbir kelimede
 * geçmiyor. Alıştırma bunu kendi içinde ele alıyor ama SINAV ele alamaz:
 * sınav adımı boş ekrana düşerse zincir kopar. Adım seçilirken bakılıyor.
 */
export function wordsWith(ch: string): string[] {
  return ALL_WORDS.filter((w) => w.includes(ch));
}

/**
 * BÜYÜK HARF DERSLERİ.
 *
 * NEDEN VAR: cümle alıştırması eklenince ortaya bir tutarsızlık çıktı —
 * "Кот спит на окне." büyük К ile başlıyor ama müfredat yalnız küçük harf
 * öğretiyordu. Kullanıcıya hiç görmediği bir şekli yazdırmak oluyordu.
 *
 * Rus el yazısında büyük harf küçüğünün büyütülmüşü DEĞİL: К, Ж, Э gibi
 * harflerin büyük biçimi ayrı bir şekil ve ayrı bir hamle dizisi. Bu yüzden
 * kendi dersleri var, harflerin arkasına iliştirilmiş değil.
 *
 * Her harfin büyüğü KENDİ seviyesinde öğretiliyor — küçüğünü öğrenip
 * büyüğünü hiç görmemek yarım öğretmek olur.
 *
 * ÜÇ HARFİN BÜYÜĞÜ YOK: `ъ`, `ы`, `ь`. Rusçada hiçbir kelime bu harflerle
 * BAŞLAMAZ, dolayısıyla büyük biçimleri pratikte yazılmaz. Fontta varlar ama
 * öğretmek boş tekrar olurdu. Otuz harf kalıyor.
 */
export const CAPITALS: Record<string, string[]> = {
  g1: ['И', 'Ш', 'П', 'Р', 'Т', 'Г', 'Й'],
  g2: ['Л', 'М', 'Я'],
  g3: ['У', 'Ц', 'Щ', 'Ч'],
  g4: ['С', 'Е', 'О', 'А', 'Д', 'Б', 'Ё'],
  g5: ['В'],
  g6: ['Н', 'Ю', 'К'],
  g7: ['З', 'Э', 'Ж', 'Х', 'Ф'],
};

/** Büyük biçimi öğretilen harfler — Alfabe ızgarası bunu gösteriyor. */
export function hasCapital(lower: string): boolean {
  const up = lower.toLocaleUpperCase('ru');
  return Object.values(CAPITALS).some((list) => list.includes(up));
}

/** `cap:К` biçimindeki konu kimliğinden harfi çıkarır. */
export function capitalOf(subject: string): string | null {
  return subject.startsWith('cap:') ? (subject.slice(4) || null) : null;
}

/** Büyük harfin hangi seviyede öğretildiği. */
export function levelOfCapital(ch: string): string | undefined {
  return Object.keys(CAPITALS).find((id) => CAPITALS[id]!.includes(ch));
}

// ── Bağlantı türleri — безотрывное письмо'nun asıl kuralı ───────────────────
//
// Kullanıcı uyardı: "nasıl birleştiği de önemli cursive'de". Doğru; Rus el
// yazısında iki bağlantı türü var ve hangisinin kullanılacağı ÖNCEKİ HARFİN
// NEREDE BİTTİĞİNE bağlı — tahmin değil, mekanik bir kural:
//
//   · Üst bağlantı (верхнее соединение) — önceki harf GÖVDE ÜSTÜNDE bitiyorsa.
//     Böyle biten altı harf var: о б в ъ ы ь
//   · Alt bağlantı (нижнее соединение) — diğer bütün harfler taban çizgisinde
//     bitiyor, bağlantı çizgisi tabandan yükseliyor.
//
// Fark görsel değil motor: üst bağlantıda kalem yukarıdan ineriyor, altta
// tabandan tırmanıyor. Yanlışını yapan kalemi kaldırmak zorunda kalıyor.

/** Gövde üstünde biten harfler — sonraki harfe ÜSTTEN bağlanırlar. */
export const ENDS_HIGH = new Set(['о', 'б', 'в', 'ъ', 'ы', 'ь']);

export type JoinKind = 'ust' | 'alt';

export function joinKind(pair: string): JoinKind {
  return ENDS_HIGH.has(pair[0] ?? '') ? 'ust' : 'alt';
}

export const JOIN_LABEL: Record<JoinKind, { name: string; ru: string; hint: string }> = {
  ust: {
    name: 'Üst bağlantı',
    ru: 'верхнее соединение',
    hint: 'Önceki harf gövde üstünde bitiyor — bağlantı yukarıdan iniyor.',
  },
  alt: {
    name: 'Alt bağlantı',
    ru: 'нижнее соединение',
    hint: 'Önceki harf tabanda bitiyor — bağlantı tabandan yükseliyor.',
  },
};

/**
 * Kelime kaç hamlede yazılmalı?
 *
 * Rus el yazısında kelime TEK HAMLEDE yazılır. İstisna, harfin gövdesinden
 * ayrı işareti olanlar: `й`nin kısa işareti ve `ё`nün iki noktası. Bunlar
 * kelime bittikten sonra ekleniyor, yani her biri bir hamle daha.
 */
export function expectedStrokes(word: string): number {
  let extra = 0;
  for (const ch of word) {
    if (ch === 'й' || ch === 'Й') extra += 1;
    if (ch === 'ё' || ch === 'Ё') extra += 2;
  }
  return 1 + extra;
}

/** Bir harf çiftinin hangi seviyede öğretildiği. */
export function findJoin(pair: string): { pair: string; level: Level } | undefined {
  for (const level of LEVELS) {
    if (level.joins.includes(pair)) return { pair, level };
  }
  return undefined;
}

/** Bir kelimenin hangi seviyede öğretildiği ve kayıtlı bilgileri. */
export function findWord(ru: string): { word: WordItem; level: Level } | undefined {
  for (const level of LEVELS) {
    const word = level.words.find((w) => w.ru === ru);
    if (word) return { word, level };
  }
  return undefined;
}

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
