// Konu kimliği → okunur etiket.
//
// Element kartlarının konusu `el-oval` gibi bir kimlik; ham hâliyle el yazısı
// fontuyla basılınca kırık görünüyordu. Üç ekran aynı dönüşümü istediği için
// tekrar ekranından buraya taşındı.

import { ELEMENTS, LEVELS } from './curriculum';

export type Label = {
  label: string;
  /** El yazısı fontuyla basılabilir mi — kimlikler basılmamalı. */
  isLetter: boolean;
};

export function labelOf(subject: string): Label {
  if (subject.length === 1) return { label: subject, isLetter: true };

  const el = ELEMENTS.find((e) => e.id === subject);
  if (el) return { label: el.name, isLetter: false };

  const lvl = LEVELS.find((l) => `joins-${l.id}` === subject || `words-${l.id}` === subject);
  if (lvl) {
    return {
      label: subject.startsWith('joins') ? `${lvl.ru} bağlantıları` : `${lvl.ru} kelimeleri`,
      isLetter: false,
    };
  }

  const cp = checkpointLevel(subject);
  if (cp) return { label: `${cp} kontrol noktası`, isLetter: false };

  return { label: subject, isLetter: subject.length <= 3 };
}

/** `cp-g3` → 'Seviye 3', `cp-elements` → 'Seviye 0'. Değilse null. */
export function checkpointLevel(subject: string): string | null {
  if (subject === 'cp-elements') return 'Seviye 0';
  const lvl = LEVELS.find((l) => `cp-${l.id}` === subject);
  return lvl ? lvl.tag : null;
}
