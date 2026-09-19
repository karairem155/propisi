// Alıştırma sonrası nereye gidileceği — tek yerden.
//
// Beş alıştırma ekranı da bitince "sıradaki" hesaplıyordu ve hepsi aynı kodu
// kopyalıyordu. Kontrol noktası bunu bozdu: sınav sırasında sıradaki kart
// kuyruktan değil SINAV LİSTESİNDEN gelmeli. Karar buraya taşındı.

import { buildQueue, practiceHref } from './scheduler';
import { advancePlaylist, playlistActive, playlistProgress, seenSubjects } from './session';

export type NextStep = {
  href: string;
  label: string;
  /** Kuyrukta kalan (sınavda anlamsız). */
  total: number;
};

/**
 * Bir alıştırma bitti; sırada ne var?
 *   · Sınav listesi açıksa listenin sırası
 *   · Değilse kuyrukta bu oturumda görülmemiş ilk kart
 *   · O da yoksa oturum özeti
 */
export async function nextAfter(current: string): Promise<NextStep> {
  if (playlistActive()) {
    const href = advancePlaylist();
    const p = playlistProgress();
    if (href) {
      return { href, label: `${p.name} · ${p.index + 1}/${p.total}`, total: p.total };
    }
    // Liste bitti — bitiş adresine git (sonuç ekranı).
    return { href: p.finishHref, label: 'Sonucu gör', total: 0 };
  }

  const queue = await buildQueue();
  const seen = seenSubjects();
  const next = queue.cards.find((c) => c.subject !== current && !seen.has(c.subject));
  if (next) {
    return { href: practiceHref(next), label: `Devam · ${queue.total}`, total: queue.total };
  }
  return { href: '#/ozet', label: 'Oturumu bitir', total: 0 };
}
