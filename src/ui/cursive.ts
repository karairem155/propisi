// El yazısı fontu — seçilebilir, çünkü ÖĞRETİMİN KENDİSİ.
//
// Bu font tipografi değil: kılavuzun şekli, değerlendirmenin hedefi ve yazım
// animasyonu hep buradan çıkıyor. Yanlış font yanlış harf öğretir ve yanlış
// harfe göre not verir.
//
// NEDEN SEÇİLEBİLİR OLDU: kullanıcı "çoğu harf gerçek cursive değil" dedi.
// Harfleri büyük basıp baktım, haklıydı — Bad Script'te `б в г д ж к т ф`
// matbu biçimin italiği. Hangi fontun doğru propisi olduğuna Rusça öğrenen
// karar vermeli; benim görevim seçimi ucuz hâle getirmek.
//
// Ayar tek yerde: `--cursive` CSS değişkeni ve `cursiveFamily()`. Tuval de
// CSS de aynı değeri okuyor, yani kılavuz ile ekrandaki metin hiç ayrışmıyor.

import { getSetting, setSetting } from '../db/db';

export type CursiveFont = {
  id: string;
  /** CSS font-family değeri. */
  family: string;
  label: string;
  /** Neyi iyi, neyi kötü yaptığı — seçim ekranında gösteriliyor. */
  note: string;
  license: string;
};

/**
 * Aday fontlar.
 *
 * Gerçek okul propisi fontu (ParaType «Прописи», ПараГраф 1997) TİCARİ bir
 * üründür ve paratype.ru'dan satılıyor; depoya konamaz. Satın alınırsa
 * `src/ui/fonts/` içine konup buraya bir satır eklemek yeterli — başka
 * hiçbir yer değişmiyor.
 */
export const CURSIVE_FONTS: CursiveFont[] = [
  {
    id: 'marck',
    family: "'Marck Script', cursive",
    label: 'Marck Script',
    note: 'в, д, б harflerinde bağlantılı biçim. El yazısına daha yakın.',
    license: 'OFL 1.1 · Denis Masharov',
  },
  {
    id: 'bad',
    family: "'Bad Script', cursive",
    label: 'Bad Script',
    note: 'Bazı harfler (б в г д ж к т ф) matbu biçimin italiği.',
    license: 'OFL 1.1 · Roman Shchyukin',
  },
];

const DEFAULT_ID = 'marck';
const KEY = 'cursiveFont';

let current: CursiveFont = CURSIVE_FONTS.find((f) => f.id === DEFAULT_ID) ?? CURSIVE_FONTS[0]!;

/** Tuvale çizerken kullanılan font ailesi. CSS'teki `--cursive` ile aynı. */
export function cursiveFamily(): string {
  return current.family;
}

export function currentCursive(): CursiveFont {
  return current;
}

function apply(font: CursiveFont): void {
  current = font;
  document.documentElement.style.setProperty('--cursive', font.family);
}

/** Açılışta bir kez — ayar okunmadan önce varsayılan geçerli. */
export async function initCursive(): Promise<void> {
  const id = await getSetting<string>(KEY, DEFAULT_ID);
  const font = CURSIVE_FONTS.find((f) => f.id === id);
  apply(font ?? current);
}

export async function setCursive(id: string): Promise<void> {
  const font = CURSIVE_FONTS.find((f) => f.id === id);
  if (!font) return;
  apply(font);
  await setSetting(KEY, id);
}
