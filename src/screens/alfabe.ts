// Alfabe / Izgara — Patika'nın ikinci görünümü. Bkz. docs/ekranlar.md §2.3
//
// Patika sıralı ilerlemedir; burası serbesttir. Aynı müfredat, iki bakış.
// Artık ayrı sekme değil — patika.ts bu dosyanın gridHtml()'ini kullanıyor.
// Hücrenin alt bandı ustalık (FSRS stability); kehribar çerçeve tekrar bekliyor demek.

import { ALPHABET, ELEMENTS, LEVELS, levelOfLetter } from '../data/curriculum';
import { mastery } from '../srs/cards';
import { progressBySubject } from '../srs/scheduler';
import { art } from '../ui/assets';
import { mascot, type MascotName } from '../ui/mascot';

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

      return `<div class="${cls.join(' ')}" title="${ch} · ${level?.tag ?? 'grupsuz'}">
        <small>${level ? level.tag.replace('Seviye ', 'S') : '–'}</small>
        <span>${ch}</span>
        ${seen ? `<i style="height:${Math.round(m * 100)}%"></i>` : ''}
      </div>`;
    };

    return `
      <div class="note">
        Hücrenin altındaki yeşil bant <b>ustalık</b> (FSRS stability). Kehribar çerçeve
        <b>tekrar bekliyor</b> demek. Gri hücreler henüz açılmadı.
      </div>

      <h2>Elemanlar</h2>
      ${art('section-elements')}
      <div class="card" style="margin-top:10px">
        <div class="row" style="justify-content:space-around">
          ${ELEMENTS.filter((e) => e.mascot)
            .map(
              (e) => `<div style="text-align:center">
                ${mascot(e.mascot as MascotName, { size: 56, mood: progress.get(e.id)?.seen ? 'happy' : 'sleep' })}
                <div style="font-size:12px;font-weight:800;margin-top:2px">${e.name}</div>
                <div style="font-size:11px;color:var(--muted)">${e.ru}</div>
              </div>`,
            )
            .join('')}
        </div>
      </div>

      <h2>Harfler · 33</h2>
      ${art('section-letters')}
      <div style="margin-top:10px" class="letter-grid">
        ${ALPHABET.map(cell).join('')}
      </div>

      <h2>Bağlantılar</h2>
      ${art('section-joins')}
      <div class="card" style="margin-top:10px">
        ${LEVELS.map(
          (l) => `<div style="margin-bottom:10px">
            <b style="font-size:13px">${l.tag} · ${l.ru}</b>
            <div class="chips" style="margin-top:6px">
              ${l.joins.map((j) => `<span class="chip" style="font-family:'Bad Script',cursive;font-size:17px">${j}</span>`).join('')}
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
