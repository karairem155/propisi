// Oturum özeti — kuyruk bitince.
//
// Brief 6.2'ye göre teşhisin en etkili anı burası: hata taze, bağlam açık.
// "Bugün 3 kez şekil uyumu" demek, aynı bilgiyi bir istatistik ekranında
// göstermekten çok daha güçlü. Bu yüzden kontrol kırılımı Tekrar sayfasına
// değil buraya konuyor.

import { currentSession, summarize } from '../srs/session';
import { buildQueue, practiceHref } from '../srs/scheduler';
import { awardBadge, statsView } from '../srs/stats';
import { CHECK_LABELS } from './tekrar';
import { art } from '../ui/assets';

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  const s = summarize();

  if (!s.count) {
    root.innerHTML = `
      <div class="card" style="text-align:center">
        <h3 style="margin:0 0 6px">Oturum yok</h3>
        <p class="fine" style="margin:0 0 14px">Henüz bir tekrar yapmadın.</p>
        <a class="btn primary" href="#/" style="display:inline-block;text-decoration:none">Tekrara dön</a>
      </div>`;
    return () => {};
  }

  const pct = (v: number) => Math.round(v * 100);
  const checkRows = Object.entries(s.checks).sort((a, b) => b[1] - a[1]);
  const maxCheck = Math.max(1, ...checkRows.map(([, n]) => n));

  root.innerHTML = `
    <div class="card" style="text-align:center">
      ${art('goal-complete', { width: '130px', className: 'art-center' })}
      <h3 style="margin:10px 0 2px">Oturum bitti</h3>
      <p class="fine" style="margin:0">${s.count} kart · ${s.minutes} dakika</p>
    </div>

    <div class="stats">
      <div class="stat"><b>${pct(s.average)}</b><span>ortalama puan</span></div>
      <div class="stat"><b>${s.count}</b><span>çalışılan kart</span></div>
      <div class="stat" id="streakStat"><b>—</b><span>seri</span></div>
    </div>

    ${
      checkRows.length
        ? `<h2>Bu oturumdaki hatalar</h2>
           <div class="card">
             <div class="bars">
               ${checkRows
                 .map(
                   ([key, n]) => `<div class="bar-row">
                     <span class="bar-name">${CHECK_LABELS[key] ?? key}</span>
                     <div class="bar-track"><i style="width:${Math.round((n / maxCheck) * 100)}%"></i></div>
                     <b>${n}</b>
                   </div>`,
                 )
                 .join('')}
             </div>
             <p class="fine">
               Şu an yalnızca şekil örtüşmesi denetleniyor. Yön ve hamle sırası
               glyph verisiyle gelecek.
             </p>
           </div>`
        : `<div class="ok">Bu oturumda hiç hata yok. 👏</div>`
    }

    <h2>Kartlar</h2>
    <div class="card">
      <div class="bars">
        ${currentSession()
          .entries.map(
            (e) => `<div class="bar-row">
              ${
                e.subject.length === 1
                  ? `<em>${e.label}</em>`
                  : `<span class="bar-name">${e.label}</span>`
              }
              <div class="bar-track"><i style="width:${pct(e.score)}%;background:${
                e.score >= 0.72 ? 'var(--mint)' : 'var(--coral)'
              }"></i></div>
              <b>${pct(e.score)}</b>
            </div>`,
          )
          .join('')}
      </div>
    </div>

    <div class="row" style="margin-top:14px">
      <a class="btn primary on-blue" id="again" href="#/" style="flex:1;text-align:center;text-decoration:none">Bitir</a>
    </div>
  `;

  // "Kusursuz oturum" rozeti — oturum kapanınca kaybolan bir bilgi, sonradan
  // hesaplanamıyor (bkz. srs/stats.ts → MomentBadge).
  if (s.count >= 3 && !checkRows.length && s.average >= 0.85) {
    void awardBadge('perfect');
  }

  let disposed = false;
  void (async () => {
    const [stats, queue] = await Promise.all([statsView(), buildQueue()]);
    if (disposed) return;
    const stat = root.querySelector<HTMLElement>('#streakStat b');
    if (stat) stat.textContent = `🔥 ${stats.streak}`;

    // Kuyrukta hâlâ kart varsa devam etme yolu sun.
    const firstCard = queue.cards[0];
    if (firstCard) {
      root.querySelector('.row')!.insertAdjacentHTML(
        'afterbegin',
        `<a class="btn ghost" href="${practiceHref(firstCard)}"
           style="flex:1;text-align:center;text-decoration:none">Devam et · ${queue.total}</a>`,
      );
    }
  })();

  return () => {
    disposed = true;
  };
}
