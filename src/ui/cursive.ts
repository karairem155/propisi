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
    id: 'russkopis',
    family: "'Russkopis', cursive",
    label: 'Russkopis',
    note: 'Gerçek Rus el yazısı biçimleri: т "m" gibi, д "g" gibi, г "r" gibi. Kelimeler tek parça.',
    license: 'X11 · MihailJP, George Douros',
  },
  {
    id: 'marck',
    family: "'Marck Script', cursive",
    label: 'Marck Script',
    note: 'El yazısına benzer ama harfler ayrı duruyor; т ve д matbu biçimli.',
    license: 'OFL 1.1 · Denis Masharov',
  },
  {
    id: 'bad',
    family: "'Bad Script', cursive",
    label: 'Bad Script',
    note: 'б в г д ж к т ф matbu biçimin italiği, harfler ayrı.',
    license: 'OFL 1.1 · Roman Shchyukin',
  },
];

/**
 * Varsayılan Russkopis — ölçülen tek font ki kelimeyi tek parça basıyor.
 *
 * DÜZELTME: bir önceki sürümde Marck Script'i "harfleri birleştiriyor" diye
 * etiketleyip varsayılan yapmıştım. Ekran görüntüsüne bakarak karar vermiştim
 * ve yanlıştı. Kullanıcı "kelimeler ayrı ayrı gösteriliyor" deyince ÖLÇTÜM:
 * kelimeyi basıp mürekkepsiz sütun aralıklarını saydım.
 *
 *                 мама  шишка  лишишь  тигр  окно  книга  молоко
 *   Bad Script      3     4      5      1     3     4      4
 *   Marck Script    3     4      4      2     3     4      5
 *   Russkopis       0     0      0      0     0     0      0
 *
 * Bu yüzden "birleştiriyor mu" bilgisi artık ELLE YAZILMIYOR —
 * `measureJoins()` her açılışta ölçüyor ve seçim ekranı onu gösteriyor.
 *
 * Ayar anahtarı değişti: eski anahtarda Marck seçili kalmış olabilir ve o
 * seçim yanlış bilgiyle yapılmıştı. Herkes bir kez yeni varsayılana geçiyor.
 */
const DEFAULT_ID = 'russkopis';
const KEY = 'cursiveFont.v2';

/**
 * Font kelimeyi tek parça basıyor mu? Ölçerek.
 *
 * Kelime tuvale basılıyor, mürekkep olmayan sütun aralıkları sayılıyor.
 * Birleşik yazıda harfler arasında boş sütun kalmaz. Döndürülen sayı, örnek
 * kelimelerdeki toplam kopukluk — 0 ise font birleştiriyor.
 */
export async function measureJoins(font: CursiveFont): Promise<number> {
  await document.fonts.load(`400 100px ${font.family}`, 'мамашишкалиш');
  const words = ['мама', 'шишка', 'лишишь', 'окно'];
  let total = 0;
  for (const w of words) {
    const cv = document.createElement('canvas');
    cv.width = 900;
    cv.height = 200;
    const c = cv.getContext('2d', { willReadFrequently: true })!;
    c.font = `400 100px ${font.family}`;
    c.fillText(w, 20, 130);
    const d = c.getImageData(0, 0, 900, 200).data;
    const col: boolean[] = [];
    for (let x = 0; x < 900; x++) {
      let ink = false;
      for (let y = 0; y < 200; y++) {
        if (d[(y * 900 + x) * 4 + 3]! > 60) {
          ink = true;
          break;
        }
      }
      col.push(ink);
    }
    const first = col.indexOf(true);
    const last = col.lastIndexOf(true);
    let gap = false;
    for (let x = first; x <= last; x++) {
      if (!col[x] && !gap) {
        total++;
        gap = true;
      }
      if (col[x]) gap = false;
    }
  }
  return total;
}

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
