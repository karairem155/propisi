// Harflerin başlangıç noktaları.
//
// Tam glyph verisinin (hamle sırası, yön, kalem kalkışı) küçük ama en değerli
// parçası: kalemin NEREDEN başladığı. Karşılığında "buradan başla" uyarısını ve
// yön denetiminin yarısını veriyor — tam median verisinin belki %5'i kadar emek.
//
// ⚠️ BU PEDAGOJİK VERİ, ÖLÇÜM DEĞİL. Propisi geleneğinden türetildi, doğrulanmış
// bir kaynaktan kopyalanmadı. `sure: false` olanlar kaynaklar arasında değişen
// ya da emin olmadığım harfler — önce onlar kontrol edilmeli.
// Toplu kontrol için: #/dev/baslangic
//
// Koordinatlar normalize:
//   x → 0 harfin sol kenarı, 1 sağ kenarı
//   y → 0 taban çizgisi (нижняя линия), 1 satır üstü (верхняя линия)
//       çıkan kuyruklar 1'in, inen kuyruklar 0'ın dışına taşabilir

export type StartPoint = {
  x: number;
  y: number;
  /** false ise doğrulanması gereken harf. */
  sure: boolean;
  note: string;
};

/**
 * Rus el yazısında iki temel başlangıç kalıbı var:
 *   · Taban çizgisinden yükselen ince bağlantı çizgisi — harflerin çoğu
 *   · Ovalin sağ üstünden saat yönünün TERSİNE — oval tabanlı harfler
 */
export const STARTS: Record<string, StartPoint> = {
  // — Taban çizgisinden yükselen —
  и: { x: 0.04, y: 0.0, sure: true, note: 'Tabandan yukarı çık' },
  й: { x: 0.04, y: 0.0, sure: true, note: 'и gibi; kısa işareti en sona' },
  ш: { x: 0.03, y: 0.0, sure: true, note: 'Tabandan yukarı çık, üç tepe' },
  щ: { x: 0.03, y: 0.0, sure: true, note: 'ш gibi; kuyruk en sona' },
  п: { x: 0.04, y: 0.0, sure: true, note: 'Tabandan yukarı çık' },
  т: { x: 0.03, y: 0.0, sure: true, note: 'Tabandan; üç tepe, üstüne çizgi' },
  г: { x: 0.05, y: 0.0, sure: true, note: 'Tabandan yukarı çık' },
  р: { x: 0.06, y: 0.0, sure: true, note: 'Tabandan çık, sonra aşağı in' },
  л: { x: 0.02, y: 0.0, sure: true, note: 'Tabandan küçük kancayla başla' },
  м: { x: 0.02, y: 0.0, sure: true, note: 'л gibi; üç değil iki tepe sonra' },
  я: { x: 0.02, y: 0.0, sure: true, note: 'Tabandan küçük kancayla başla' },
  ц: { x: 0.04, y: 0.0, sure: true, note: 'Tabandan; kuyruk en sona' },
  ч: { x: 0.08, y: 1.0, sure: false, note: 'Üstten mi tabandan mı — kaynaklar değişiyor' },
  у: { x: 0.06, y: 1.0, sure: false, note: 'Üstten iniyor; inen ilmek sonda' },
  н: { x: 0.04, y: 0.0, sure: true, note: 'Tabandan yukarı çık' },
  к: { x: 0.04, y: 0.0, sure: true, note: 'Tabandan yukarı çık' },
  ы: { x: 0.06, y: 1.0, sure: false, note: 'ь + и; ь üstten mi başlıyor' },
  в: { x: 0.12, y: 1.4, sure: false, note: 'Çıkan ilmek en üstten' },
  ь: { x: 0.14, y: 1.0, sure: false, note: 'Dikey çizginin tepesinden' },
  ъ: { x: 0.05, y: 1.0, sure: false, note: 'Küçük üst çıkıntıdan' },
  ю: { x: 0.03, y: 0.0, sure: true, note: 'Önce dikey, sonra oval' },

  // — Ovalin sağ üstünden, saat yönünün tersine —
  о: { x: 0.82, y: 0.82, sure: true, note: 'Sağ üstten, saat yönünün tersine' },
  а: { x: 0.82, y: 0.82, sure: true, note: 'о gibi; dikey çizgi sonra' },
  д: { x: 0.82, y: 0.82, sure: true, note: 'о gibi; inen ilmek sonra' },
  с: { x: 0.86, y: 0.8, sure: true, note: 'Sağ üstten, saat yönünün tersine' },
  б: { x: 0.8, y: 0.84, sure: false, note: 'Ovalden mi çıkan kuyruktan mı' },
  ф: { x: 0.78, y: 0.82, sure: false, note: 'Oval önce mi dikey önce mi' },
  е: { x: 0.08, y: 0.34, sure: false, note: 'Ortadan sağa, sonra yukarı dönüş' },
  з: { x: 0.14, y: 0.86, sure: false, note: 'Sol üstten sağa kıvrılarak' },
  э: { x: 0.14, y: 0.86, sure: false, note: 'Sol üstten sağa kıvrılarak' },

  // — Diğer —
  ж: { x: 0.06, y: 0.72, sure: false, note: 'Önce sol eleman; sıra tartışmalı' },
  х: { x: 0.06, y: 0.92, sure: false, note: 'Sol üstten sağ alta çapraz' },
  ё: { x: 0.08, y: 0.34, sure: false, note: 'е gibi; noktalar en sona' },
};

export function startOf(ch: string): StartPoint | undefined {
  return STARTS[ch];
}

/** Doğrulanması gereken harfler — kontrol sayfası bunları öne alıyor. */
export function unverified(): string[] {
  return Object.entries(STARTS)
    .filter(([, s]) => !s.sure)
    .map(([ch]) => ch);
}
