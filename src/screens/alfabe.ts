// Alfabe / Izgara — Patika'nın ikinci görünümü. Bkz. docs/ekranlar.md §2.3
//
// Patika sıralı ilerlemedir; burası serbesttir. Aynı müfredat, iki bakış.
// Artık ayrı sekme değil — patika.ts bu dosyanın gridHtml()'ini kullanıyor.
// Hücrenin alt bandı ustalık (FSRS stability); kehribar çerçeve tekrar bekliyor demek.

import { ALPHABET, ELEMENTS, LEVELS, hasCapital, levelOfLetter } from '../data/curriculum';
import { mastery } from '../srs/cards';
import { progressBySubject } from '../srs/scheduler';
import { mascot, type MascotName } from '../ui/mascot';

/**
 * Bölüm başlığı.
 *
 * Burada üç tane tam genişlik 3:2 görsel yuvası vardı ve üçü de ekranı
 * kaplayıp asıl içeriği — harf ızgarasını — katlamanın altına itiyordu.
 * Dekoratif görseli beklemek yerine başlığın kendisi kompaktlaştırıldı:
 * maskot, Türkçe ad, Rusça karşılık ve sayaç tek satırda.
 */
function sectionHead(title: string, ru: string, art: MascotName, count: string): string {
  return `
    <div class="section-head">
      <span class="section-art">${mascot(art, { size: 40, mood: 'happy' })}</span>
      <span class="section-txt"><b>${title}</b><small>${ru}</small></span>
      <span class="section-count">${count}</span>
    </div>`;
}

type Progress = Awaited<ReturnType<typeof progressBySubject>>;

/** Patika'nın Izgara görünümü de bunu kullanıyor. */
export function gridHtml(progress: Progress): string {
    const cell = (ch: string): string => {
      const entry = progress.get(ch);
      const level = levelOfLetter(ch);
      const seen = entry?.seen ?? false;
      const due = entry?.due ?? 0;
      const m = entry ? Math.max(...entry.cards.map(mastery)) : 0;

      const cls = ['letter-cell'];
      if (!seen) cls.push('letter-cell--locked');
      if (due > 0) cls.push('letter-cell--due');

      // Alfabe bir BAŞVURU ekranı: harfin iki biçimi de görünmeli. Yalnız
      // küçüğünü göstermek "bu harf tek biçimli" demek oluyordu. Ъ, Ы, Ь'de
      // büyük biçim yok — hiçbir Rusça kelime onlarla başlamıyor.
      const up = hasCapital(ch) ? ch.toLocaleUpperCase('ru') : '';
      const capSeen = up ? (progress.get(`cap:${up}`)?.seen ?? false) : false;

      return `<div class="${cls.join(' ')}" title="${up}${ch} · ${level?.tag ?? 'grupsuz'}">
        <small>${level ? level.tag.replace('Seviye ', 'S') : '–'}</small>
        <span class="letter-pair"><b class="${capSeen ? '' : 'dim'}">${up || '·'}</b>${ch}</span>
        ${seen ? `<i style="height:${Math.round(m * 100)}%"></i>` : ''}
      </div>`;
    };

    return `
      <div class="note">
        Hücrenin altındaki yeşil bant <b>ustalık</b> (FSRS stability). Kehribar çerçeve
        <b>tekrar bekliyor</b> demek. Gri hücreler henüz açılmadı.
      </div>

      ${sectionHead('Elemanlar', 'элементы букв', 'oval', `${ELEMENTS.length} ders`)}
      <div class="card">
        <div class="element-row">
          ${ELEMENTS.filter((e) => e.mascot)
            .map(
              (e) => `<div class="element-cell">
                ${mascot(e.mascot as MascotName, { size: 52, mood: progress.get(e.id)?.seen ? 'happy' : 'sleep' })}
                <b>${e.name}</b>
                <small>${e.ru}</small>
              </div>`,
            )
            .join('')}
        </div>
      </div>

      ${sectionHead('Harfler', 'буквы', 'cubuk', `${ALPHABET.length} küçük · 30 büyük`)}
      <div class="letter-grid">
        ${ALPHABET.map(cell).join('')}
      </div>

      ${sectionHead('Bağlantılar', 'соединения', 'kanca', `${LEVELS.reduce((n, l) => n + l.joins.length, 0)} çift`)}
      <div class="card">
        ${LEVELS.map(
          (l) => `<div style="margin-bottom:10px">
            <b style="font-size:13px">${l.tag} · ${l.ru}</b>
            <div class="chips" style="margin-top:6px">
              ${l.joins.map((j) => `<span class="chip" style="font-family:var(--cursive);font-size:17px">${j}</span>`).join('')}
            </div>
          </div>`,
        ).join('')}
      </div>
    `;
}

/** Tek başına ekran olarak da açılabiliyor (#/alfabe). */
export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = '<div class="empty-hint">Alfabe yükleniyor…</div>';
  let disposed = false;
  void (async () => {
    const progress = await progressBySubject();
    if (!disposed) root.innerHTML = gridHtml(progress);
  })();
  return () => {
    disposed = true;
  };
}
