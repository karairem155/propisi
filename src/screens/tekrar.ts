// Tekrar — uygulamanın giriş sekmesi. Bkz. docs/ekranlar.md §2.1
//
// Eski "Bugün" ekranını tamamen yuttu. Sayfanın tek sorusu var: NE YAPMALIYIM?
//
// Üç blok:
//   1. Kuyruk        — bugün vadesi gelen kartlar (brief 7.0)
//   2. Zorlandıkların — teşhisin EYLEME DÖNÜK kısmı; düğmesi var, kuyruğa ek
//                       oturum kurar. Arşivsel kısım (ısı haritası, zamanla
//                       gelişim) İlerleme ekranında kalır.
//   3. Seri + hedef   — yumuşak hedef, sert limit yok (brief 8.3)
//
// Kuyruk boşken 2. blok sayfanın merkezine geçer: "Bugünlük tamam ✓" tek başına
// ölü ekran, orada "şunları pekiştir" demek çok daha iyi.

import {
  buildQueue,
  allCards,
  isPracticable,
  practiceHref,
  type Queue,
} from '../srs/scheduler';
import type { SrsCard } from '../srs/cards';
import { labelOf } from '../data/labels';
import { getSetting } from '../db/db';
import { statsView, type StatsView } from '../srs/stats';
import { startPlaylist, startSession } from '../srs/session';
import { art } from '../ui/assets';
import { mascot } from '../ui/mascot';

const BUCKETS: Record<string, string> = {
  letter: 'harf',
  element: 'eleman',
  join: 'bağlantı',
  word: 'kelime',
  dictation: 'dikte',
  sentence: 'cümle',
};

/** brief 6.2 — teşhis katmanının kontrol adları. */
export const CHECK_LABELS: Record<string, string> = {
  direction: 'yön',
  start: 'başlangıç noktası',
  humps: 'tepe sayısı',
  length: 'uzunluk',
  shape: 'şekil uyumu',
  lift: 'kalem kaldırma',
  size: 'harf boyutu',
};

type Weak = { subject: string; label: string; isLetter: boolean; total: number; top: string };

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  // Tekrar sayfasına her dönüşte oturum sıfırlanır — özet "bu seri" demek.
  startSession();
  root.innerHTML = '<div class="empty-hint">Kuyruk hazırlanıyor…</div>';

  let disposed = false;

  void (async () => {
    const [queue, cards, goal, stats] = await Promise.all([
      buildQueue(),
      allCards(),
      getSetting<number>('dailyGoal', 20),
      statsView(),
    ]);
    if (disposed) return;

    const weak = weakSpots(cards);
    const firstCard = queue.cards[0];
    const first = firstCard ? practiceHref(firstCard) : undefined;
    root.innerHTML =
      (queue.total ? queueCard(queue, first) : emptyCard(cards.length > 0)) +
      weakCard(weak, queue.total === 0) +
      footerCard(goal, stats);

    // "Bunları çalış" — zayıf konuları vadesine bakmadan arka arkaya açar.
    // Kuyruk vadesi gelenleri verir; bu düğme "bugün sırası olmasa da şunları
    // pekiştir" demek. Sınav değil, tam ders açılıyor (session.ts → exam).
    root.querySelector('#studyWeak')?.addEventListener('click', () => {
      const items = weak
        .map((w) => hrefForSubject(w.subject, cards))
        .filter((h): h is string => h !== null);
      const firstWeak = startPlaylist('Zayıf noktalar', items, '#/ozet');
      if (firstWeak) location.hash = firstWeak;
    });
  })();

  return () => {
    disposed = true;
  };
}

function queueCard(queue: Queue, first?: string): string {
  const items = Object.entries(queue.counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `<div class="queue-item"><b>${n}</b><span>${BUCKETS[k] ?? k}</span></div>`)
    .join('');

  return `
    <div class="queue-card">
      <div class="queue-banner">
        ${art('today-hero', { hideWhenMissing: true })}
        ${queue.overdue.length ? `<span class="overdue-pill">● ${queue.overdue.length} geciken</span>` : ''}
      </div>
      <h3>Tekrar zamanı</h3>
      <p class="fine" style="margin:0 0 12px">Bildiklerini pekiştir, daha da güçlen.</p>
      <div class="queue-grid">${items}</div>
      ${
        first
          ? `<a class="btn primary" style="display:block;width:100%;text-align:center;text-decoration:none"
               href="${first}">Tekrara başla · ${queue.total}</a>`
          : '<button class="primary" style="width:100%" disabled>Tekrara başla</button>'
      }
      <p class="fine">Şu an şekil örtüşmesine bakılıyor; yön ve hamle sırası glyph verisiyle gelecek.</p>
    </div>`;
}

/**
  * Kuyruk boş — ama iki farklı sebeple boş olabilir ve ikisi zıt şey söyler:
  * hiç başlamamışa "bugünlük tamam ✓" demek yanlış yönlendirmedir.
  */
function emptyCard(everStarted: boolean): string {
  if (!everStarted) {
    return `
      <div class="queue-card" style="text-align:center">
        ${mascot('cubuk', { size: 92, mood: 'open' })}
        <h3 style="margin-top:12px">Hoş geldin</h3>
        <p class="fine">
          Tekrar kuyruğu ders açtıkça dolar. İlk ders <b>elemanlar</b> —
          harfler bu şekillerden kuruluyor.
        </p>
        <a class="btn primary" style="display:block;width:100%;text-align:center;text-decoration:none"
           href="#/calis/el-naklon">İlk derse başla</a>
        <p class="fine" style="margin-bottom:0">
          Bütün müfredat <a href="#/patika">Patika</a>'da.
        </p>
      </div>`;
  }
  return `
    <div class="queue-card" style="text-align:center">
      ${art('today-empty', { width: '150px', className: 'art-center' })}
      <h3 style="margin-top:12px">Bugünlük tamam ✓</h3>
      <p class="fine">Vadesi gelen kart yok.</p>
      <a class="btn ghost" style="display:block;width:100%;text-align:center;text-decoration:none"
         href="#/patika">Patikadan yeni ders aç</a>
    </div>`;
}

/**
 * Teşhisin eyleme dönük kısmı. `focus` true ise (kuyruk boşsa) sayfanın
 * merkezi bu blok olur — ölü ekran yerine yapacak iş gösterir.
 */
function weakCard(weak: Weak[], focus: boolean): string {
  if (!weak.length) {
    return `
      <div class="card">
        <b style="font-size:15px">Zorlandıkların</b>
        <div class="empty-hint" style="padding:12px 0 4px">
          Henüz hata verisi yok — birkaç ders sonra burada hangi harfte
          zorlandığın çıkacak.
        </div>
      </div>`;
  }

  const max = weak[0]!.total;
  return `
    <div class="card"${focus ? ' style="border:2px solid var(--amber)"' : ''}>
      <b style="font-size:15px">Zorlandıkların</b>
      <p class="fine" style="margin:2px 0 12px">
        ${focus ? 'Kuyruk boş — pekiştirmek için iyi zaman.' : 'Son oturumlardaki hatalar.'}
      </p>
      <div class="bars">
        ${weak
          .map(
            (w) => `<div class="bar-row">
              ${w.isLetter ? `<em>${w.label}</em>` : `<span class="bar-name">${w.label}</span>`}
              <div class="bar-track"><i style="width:${Math.round((w.total / max) * 100)}%"></i></div>
              <b>${w.total}</b>
            </div>
            <div class="bar-note">${w.top}</div>`,
          )
          .join('')}
      </div>
      <button class="ghost" style="width:100%;margin-top:12px" id="studyWeak">Bunları çalış</button>
      <a href="#/ilerleme" class="card-link">Tüm tekrarları gör ›</a>
    </div>`;
}

function footerCard(goal: number, stats: StatsView): string {
  const pct = Math.min(100, Math.round((stats.today / Math.max(1, goal)) * 100));
  const peak = Math.max(1, ...stats.week.map((d) => d.count));
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <span style="font-weight:800">🔥 ${stats.streak} gün${stats.best > stats.streak ? ` <span class="fine">· en iyi ${stats.best}</span>` : ''}</span>
        <span class="fine">${stats.today} / ${goal} kart</span>
      </div>
      <div class="goal-bar"><i style="width:${pct}%"></i></div>
      <div class="week-strip">
        ${stats.week
          .map(
            (d) => `<i style="height:${Math.max(3, Math.round((d.count / peak) * 26))}px;
              opacity:${d.count ? 1 : 0.28}" title="${d.day}: ${d.count}"></i>`,
          )
          .join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        <span class="fine">Sert limit yok — hedef yalnızca öneri.</span>
        <a href="#/ilerleme" style="color:var(--sky-ink);font-weight:800;font-size:13px;text-decoration:none">
          tüm istatistikler ›
        </a>
      </div>
    </div>

    <div class="card" style="display:flex;align-items:center;gap:14px">
      <span class="badge">${mascot('oval', { size: 40, mood: 'sleep' })}</span>
      <span class="fine">
        Değerlendirme şekil örtüşmesine bakıyor. Yön ve hamle sırası
        henüz ölçülmüyor — onlar harf çizim verisiyle gelecek.
      </span>
    </div>`;
}

/** Konunun en uygun alıştırma adresi — en gecikmiş kartı hangisiyse o. */
function hrefForSubject(subject: string, cards: SrsCard[]): string | null {
  const own = cards
    .filter((c) => c.subject === subject && isPracticable(c))
    .sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());
  return own[0] ? practiceHref(own[0]) : null;
}

/** Hata sayaçlarından en çok zorlanılan 5 konu. */
function weakSpots(cards: { subject: string; errors: Record<string, number> }[]): Weak[] {
  const bySubject = new Map<string, Record<string, number>>();
  for (const card of cards) {
    if (!Object.keys(card.errors).length) continue;
    const bucket = bySubject.get(card.subject) ?? {};
    for (const [k, n] of Object.entries(card.errors)) bucket[k] = (bucket[k] ?? 0) + n;
    bySubject.set(card.subject, bucket);
  }

  return [...bySubject.entries()]
    .map(([subject, errs]) => {
      const total = Object.values(errs).reduce((a, b) => a + b, 0);
      const [key, n] = Object.entries(errs).sort((a, b) => b[1] - a[1])[0]!;
      return {
        subject,
        ...labelOf(subject),
        total,
        top: `${total} hatanın ${n}'i ${CHECK_LABELS[key] ?? key} hatası`,
      };
    })
    .filter((w) => w.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

/** Sekme rozeti için — main.ts kullanıyor. */
export async function dueCount(): Promise<number> {
  return (await buildQueue()).total;
}
