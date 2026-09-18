// İlerleme — brief 7.8. Bkz. docs/ekranlar.md §2.4
//
// Veri yoksa ekran boş rapor gösterir; uydurma sayı üretmez.

import { ALPHABET, levelOfLetter } from '../data/curriculum';
import { mastery } from '../srs/cards';
import { allCards } from '../srs/scheduler';
import { countAttempts } from '../db/db';
import { art, type AssetKey } from '../ui/assets';

/** brief 6.2 — teşhis katmanının üreteceği kontrol adları. */
const CHECK_LABELS: Record<string, string> = {
  direction: 'Yön',
  start: 'Başlangıç noktası',
  humps: 'Tepe sayısı',
  length: 'Uzunluk',
  shape: 'Şekil uyumu',
};

export function render(root: HTMLElement): () => void {
  root.className = 'screen';
  root.innerHTML = '<div class="empty-hint">İlerleme hesaplanıyor…</div>';

  let disposed = false;

  void (async () => {
    const [cards, attempts] = await Promise.all([allCards(), countAttempts()]);
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

    root.innerHTML = `
      ${art('progress-hero')}

      <div class="stats" style="margin-top:12px">
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
            : '<div class="empty-hint">Henüz hata verisi yok. Çizim değerlendirmesi Faz 1\'de açılıyor.</div>'
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
            : '<div class="empty-hint">Teşhis katmanı Faz 1\'de devreye giriyor (brief 6.2).</div>'
        }
      </div>

      <h2>Rozetler</h2>
      <div class="card">
        <div class="badge-grid">
          ${(
            [
              ['badge-first-letter', 'İlk harf', byLetter.size >= 1],
              ['badge-streak3', '3 gün seri', false],
              ['badge-streak7', '7 gün seri', false],
              ['badge-100-reviews', '100 tekrar', seen >= 100],
              ['badge-first-group', 'İlk grup', false],
              ['badge-perfect', 'Kusursuz oturum', false],
              ['badge-streak30', '30 gün seri', false],
              ['badge-night', 'Gece çalışması', false],
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
        <p class="fine">Kazanılmamış rozetler soluk. Koşullar Faz 2'de bağlanacak.</p>
      </div>

      <h2>Yazının gelişimi</h2>
      <div class="note">
        Her denemenin ham hamleleri kaydediliyor (brief 6.3) — yani
        <b>ilk haftaki <span style="font-family:'Bad Script',cursive;font-size:19px">ш</span></b>
        ile <b>bugünkü</b> yan yana çizilebilir. Korpus biriktikçe burada açılacak.
      </div>
    `;
  })();

  return () => {
    disposed = true;
  };
}
