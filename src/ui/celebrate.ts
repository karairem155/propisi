// Kutlama ve tepki hareketleri.
//
// Doğru yazınca hiçbir şey olmuyordu: puan beliriyordu, o kadar. Sonuç doğru
// ama deneyim ölü — kullanıcının bunu doğrudan söylemesi gerekti.
//
// Üç şey yapıyoruz ve üçü de HAFİF: kütüphane yok, kare kare JS yok. Parçacık
// patlaması ve sallanma CSS animasyonu, sayaç tek bir rAF döngüsü. Hepsi
// `prefers-reduced-motion` altında kendiliğinden susuyor — hareket duyarlılığı
// olan biri için titreşen ekran erişilebilirlik sorunudur, süs değil.

const BURST_COLORS = ['#f2a63b', '#35c79a', '#f2705f', '#8e7cf0', '#ffffff'];

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Bir öğenin üstünden parçacık patlaması.
 * Öğe `position` taşımıyorsa kapsayıcıya değil sayfaya göre konumlanır.
 */
export function burst(anchor: Element, count = 14): void {
  if (reducedMotion()) return;
  const rect = anchor.getBoundingClientRect();
  if (!rect.width) return;

  const layer = document.createElement('div');
  layer.className = 'burst-layer';
  layer.style.left = `${rect.left + rect.width / 2}px`;
  layer.style.top = `${rect.top + rect.height / 2}px`;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    // Yukarı yarım daireye yay: aşağı düşen konfeti ekranın altına gidiyor.
    const angle = -Math.PI + (Math.PI * (i + 0.5)) / count + (Math.random() - 0.5) * 0.3;
    const dist = 46 + Math.random() * 54;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    p.style.setProperty('--rot', `${(Math.random() - 0.5) * 240}deg`);
    p.style.setProperty('--delay', `${Math.random() * 60}ms`);
    p.style.background = BURST_COLORS[i % BURST_COLORS.length]!;
    if (i % 3 === 0) p.style.borderRadius = '2px';
    layer.appendChild(p);
  }

  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1100);
}

/** Yanlış cevapta kısa yatay sallanma. */
export function shake(el: Element): void {
  if (reducedMotion()) return;
  el.classList.remove('is-shaking');
  // Reflow: sınıf aynı karede geri eklenirse animasyon yeniden başlamıyor.
  void (el as HTMLElement).offsetWidth;
  el.classList.add('is-shaking');
  setTimeout(() => el.classList.remove('is-shaking'), 480);
}

/** Doğru cevapta kısa zıplama — maskot ya da rozet için. */
export function pop(el: Element): void {
  if (reducedMotion()) return;
  el.classList.remove('is-popping');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('is-popping');
  setTimeout(() => el.classList.remove('is-popping'), 620);
}

/**
 * Sayıyı 0'dan hedefe saydırır.
 *
 * Puanın anında belirmesi ile sayılarak gelmesi arasındaki fark, sonucun
 * "hesaplandığı" hissini veriyor. Hareket kapalıysa doğrudan yazılır.
 */
export function countUp(el: HTMLElement, to: number, ms = 620): void {
  if (reducedMotion()) {
    el.textContent = String(to);
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    // easeOutCubic — hızlı başlayıp hedefe yumuşak oturuyor.
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(to * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
