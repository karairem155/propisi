// Maskot galerisi — geliştirme ekranı.
// Karakterleri ve ruh hâllerini yan yana görmek için; şekil ayarı buradan yapılır.
// Faz 1'de bu klasöre kalibrasyon ekranı da gelecek (brief 6.3).

import { MASCOTS, mascot, type MascotName, type Mood } from '../ui/mascot';

const MOODS: { key: Mood; label: string; use: string }[] = [
  { key: 'happy', label: 'happy', use: 'varsayılan, nötr anlar' },
  { key: 'open', label: 'open', use: 'dikkat, yönerge veriyor' },
  { key: 'think', label: 'think', use: 'hata — brief 6.2 geri bildirimi' },
  { key: 'cheer', label: 'cheer', use: 'doğru hamle, seri' },
  { key: 'sleep', label: 'sleep', use: 'tekrar kuyruğu boş' },
];

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  const names = Object.keys(MASCOTS) as MascotName[];

  root.innerHTML = `
    <div class="note">
      Her karakter bir temel yazı elemanı (<code>элементы букв</code>, brief 7.2).
      Ruh hâlleri değerlendirme sonucuna bağlanacak: <b>cheer</b> doğru hamle,
      <b>think</b> hatalı hamle, <b>sleep</b> tekrar kuyruğu boş.
    </div>

    ${names
      .map(
        (n) => `
      <h2>${MASCOTS[n].label} <span style="opacity:.6;font-weight:600">· ${MASCOTS[n].ru}</span></h2>
      <div class="card">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:10px;text-align:center">
          ${MOODS.map(
            (m) => `<div>
              ${mascot(n, { mood: m.key, size: 84 })}
              <div style="font-size:12px;font-weight:800;margin-top:2px">${m.label}</div>
              <div style="font-size:11px;color:var(--muted);line-height:1.25">${m.use}</div>
            </div>`,
          ).join('')}
        </div>
      </div>`,
      )
      .join('')}

    <h2>Tek renk denemesi</h2>
    <div class="card">
      <p style="color:var(--muted);font-size:13px">
        Kadro tek renge indirildiğinde de okunabilmeli — silüetler birbirinden ayrı mı?
      </p>
      <div class="row" style="justify-content:space-around">
        ${names.map((n) => mascot(n, { size: 76, color: 'var(--blue)' })).join('')}
      </div>
    </div>
  `;

  return () => {};
}
