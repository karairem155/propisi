// İlerleme — brief 7.8. Bkz. docs/ekranlar.md §2.4
//
// Veri yoksa ekran boş rapor gösterir; uydurma sayı üretmez.

import { ALPHABET, levelOfLetter } from '../data/curriculum';
import { mastery } from '../srs/cards';
import { allCards } from '../srs/scheduler';
import { countAttempts } from '../db/db';
import { earnedBadges, statsView, totalReviews } from '../srs/stats';
import { art, type AssetKey } from '../ui/assets';
import { mascot } from '../ui/mascot';
import { CHECK_LABELS as CHECKS } from './tekrar';

/**
 * brief 6.2 — kontrol adları. Tek kaynak tekrar.ts; burada yalnız baş harf
 * büyük yazılıyor. Kendi kopyası vardı ve `lift` (kalem kaldırma) eksikti —
 * bağlantı hataları kırılımda hiç görünmüyordu.
 */
const CHECK_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(CHECKS).map(([k, v]) => [k, v.charAt(0).toLocaleUpperCase('tr') + v.slice(1)]),
);

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = '<div class="empty-hint">İlerleme hesaplanıyor…</div>';

  let disposed = false;

  void (async () => {
    const [cards, attempts, stats, reviews, badges] = await Promise.all([
      allCards(),
      countAttempts(),
      statsView(),
      totalReviews(),
      earnedBadges(),
    ]);
    if (disposed) return;

    // Harf başına en iyi ustalık.
    const byLetter = new Map<string, number>();
    const errorsByLetter = new Map<string, Record<string, number>>();
    const errorTotals: Record<string, number> = {};

    for (const card of cards) {
      if (card.subject.length === 1) {
        byLetter.set(card.subject, Math.max(byLetter.get(card.subject) ?? 0, mastery(card)));
        const bucket = errorsByLetter.get(card.subject) ?? {};
        for (const [k, n] of Object.entries(card.errors)) {
          bucket[k] = (bucket[k] ?? 0) + n;
          errorTotals[k] = (errorTotals[k] ?? 0) + n;
        }
        errorsByLetter.set(card.subject, bucket);
      }
    }

    const weak = [...errorsByLetter.entries()]
      .map(([ch, errs]) => ({ ch, total: Object.values(errs).reduce((a, b) => a + b, 0), errs }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const maxError = Math.max(1, ...Object.values(errorTotals));
    const seen = cards.filter((c) => c.fsrs.reps > 0).length;
    // Geçilen kontrol noktası sayısı — "İlk grup" rozetinin koşulu.
    const groupsPassed = cards.filter((c) => c.kind === 'checkpoint' && c.fsrs.reps > 0).length;

    // Burada 3:2'lik dekoratif bir görsel yuvası vardı ve ekranın yarısını
    // boş bırakıp asıl veriyi — ısı haritasını — aşağı itiyordu. Yerine
    // ekranın kendi verisini taşıyan kompakt bir başlık kondu.
    const pctMastered = Math.round(
      (ALPHABET.filter((ch) => (byLetter.get(ch) ?? 0) > 0.5).length / ALPHABET.length) * 100,
    );
    root.innerHTML = `
      <div class="progress-hero">
        ${mascot('oval', { size: 66, mood: pctMastered > 0 ? 'cheer' : 'open' })}
        <div class="progress-hero-txt">
          <b>${pctMastered}%</b>
          <span>alfabenin ustalaşılan kısmı</span>
          <div class="progress-hero-bar"><i style="width:${pctMastered}%"></i></div>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><b>${byLetter.size}</b><span>açılmış harf</span></div>
        <div class="stat"><b>${seen}</b><span>çalışılmış kart</span></div>
        <div class="stat"><b>${cards.length}</b><span>toplam kart</span></div>
        <div class="stat"><b>${attempts}</b><span>kayıtlı deneme</span></div>
      </div>

      <h2>Harf ısı haritası</h2>
      <div class="card">
        <div class="letter-grid">
          ${ALPHABET.map((ch) => {
            const m = byLetter.get(ch) ?? 0;
            const level = levelOfLetter(ch);
            return `<div class="letter-cell${m === 0 ? ' letter-cell--locked' : ''}"
                title="${ch} · ustalık ${Math.round(m * 100)}%">
              <small>${level ? level.tag.replace('Seviye ', 'S') : '–'}</small>
              <span>${ch}</span>
              ${m > 0 ? `<i style="height:${Math.round(m * 100)}%"></i>` : ''}
            </div>`;
          }).join('')}
        </div>
        <p style="margin:12px 0 0;font-size:12px;color:var(--muted)">
          Renk yüksekliği = FSRS stability'den türetilen ustalık. 60 gün ≈ %80.
        </p>
      </div>

      <h2>Zayıf harf raporu</h2>
      <div class="card">
        ${
          weak.length
            ? `<div class="bars">${weak
                .map((w) => {
                  const top = Object.entries(w.errs).sort((a, b) => b[1] - a[1])[0];
                  return `<div class="bar-row">
                    <em>${w.ch}</em>
                    <div class="bar-track"><i style="width:${Math.round((w.total / weak[0]!.total) * 100)}%"></i></div>
                    <b>${w.total}</b>
                  </div>
                  <div style="font-size:11px;color:var(--muted);margin:-4px 0 4px 43px">
                    ${top ? `${w.total} hatanın ${top[1]}'i ${(CHECK_LABELS[top[0]] ?? top[0]).toLowerCase()} hatası` : ''}
                  </div>`;
                })
                .join('')}</div>`
            : '<div class="empty-hint">Henüz hata verisi yok — birkaç ders sonra dolacak.</div>'
        }
      </div>

      <h2>Hata türü kırılımı</h2>
      <div class="card">
        ${
          Object.keys(errorTotals).length
            ? `<div class="bars">${Object.entries(CHECK_LABELS)
                .map(
                  ([key, label]) => `<div class="bar-row">
                    <span style="font-size:12px;font-weight:700">${label.slice(0, 3)}</span>
                    <div class="bar-track"><i style="width:${Math.round(((errorTotals[key] ?? 0) / maxError) * 100)}%"></i></div>
                    <b>${errorTotals[key] ?? 0}</b>
                  </div>`,
                )
                .join('')}</div>`
            : '<div class="empty-hint">Henüz hata kaydı yok.</div>'
        }
      </div>

      <h2>Rozetler</h2>
      <div class="card">
        <div class="badge-grid">
          ${(
            [
              ['badge-first-letter', 'İlk harf', byLetter.size >= 1],
              ['badge-streak3', '3 gün seri', stats.best >= 3],
              ['badge-streak7', '7 gün seri', stats.best >= 7],
              ['badge-100-reviews', '100 tekrar', reviews >= 100],
              ['badge-first-group', 'İlk grup', groupsPassed >= 1],
              ['badge-perfect', 'Kusursuz oturum', badges.has('perfect')],
              ['badge-streak30', '30 gün seri', stats.best >= 30],
              ['badge-night', 'Gece çalışması', badges.has('night')],
            ] as [AssetKey, string, boolean][]
          )
            .map(
              ([key, label, earned]) => `<div class="badge-cell${earned ? '' : ' locked'}">
                ${art(key, { width: '64px' })}
                <span>${label}</span>
              </div>`,
            )
            .join('')}
        </div>
        <p class="fine">
          Kazanılmamış rozetler soluk.
          ${groupsPassed ? `${groupsPassed} kontrol noktası geçildi.` : 'Henüz kontrol noktası geçilmedi.'}
        </p>
      </div>

      <h2>Yazının gelişimi</h2>
      <div class="note">
        Her denemenin ham hamleleri kaydediliyor (brief 6.3) — yani
        <b>ilk haftaki <span style="font-family:var(--cursive);font-size:19px">ш</span></b>
        ile <b>bugünkü</b> yan yana çizilebilir. Korpus biriktikçe burada açılacak.
      </div>
    `;
  })();

  return () => {
    disposed = true;
  };
}
