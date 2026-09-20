// Adres değiştirme — tek kapı.
//
// NEDEN VAR: yönlendirici `hashchange` ile çalışıyor (main.ts) ve tarayıcı
// AYNI adrese gidildiğinde bu olayı üretmiyor. Ders listesi bundan sessizce
// kırılmıştı: eleman dersi `#/calis/el-dvojnoj` (kılavuzlu) → aynı adres
// (kılavuzsuz, ezberden) diye kuruluyor, ikinci adıma geçerken hash aynı
// kaldığı için ekran hiç yenilenmiyordu. Kullanıcının gördüğü: "arkaplanda
// harf olmadan deneme kaldırılmış". Aynı tuzak bağlantı ve büyük harf
// derslerinde de vardı.
//
// `go()` adres aynıysa yönlendiriciyi elle dürtüyor.

/** Karşılaştırma için adresi normalleştirir — biri kodlanmış olabilir. */
function norm(hash: string): string {
  const s = hash.startsWith('#') ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Verilen adrese git; aynı adresteysek ekranı yine de yeniden kur. */
export function go(href: string): void {
  if (norm(location.hash) === norm(href)) {
    window.dispatchEvent(new Event('hashchange'));
    return;
  }
  location.hash = href;
}
