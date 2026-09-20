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

/**
 * BÜYÜK HARFLERİN BAŞLANGIÇ NOKTALARI.
 *
 * Küçük harflerin neredeyse tamamı taban çizgisinden yükselen ince bağlantı
 * çizgisiyle başlıyor. Büyük harfte öyle değil: bağlanacağı önceki harf yok,
 * kalem havadan iniyor ve harfin ÜST kısmından başlıyor.
 *
 * Bu fark ölçülebilir bir sonuç doğurdu: yazım animasyonu küçük harf
 * varsayımıyla büyük harfleri ALTTAN açıyordu, yani `А`yı bacağından
 * başlatıyordu. Yanlış yön öğretmek yerine üç kalıp tanımlandı.
 *
 * ⚠️ HEPSİ `sure: false`. Küçük harflerde en azından propisi geleneğinden
 * türetilmiş bir dayanak vardı; burada yalnız harfin geometrisine bakıldı.
 * Denetim: #/dev/yazim → Büyük harfler.
 */
const CAPITAL_PATTERNS: Record<string, { x: number; y: number; note: string }> = {
  // Üst tepeden inen: sivri ya da yuvarlak tepeyle başlayanlar
  tepe: { x: 0.3, y: 0.95, note: 'Tepeden başla, aşağı in' },
  // Üst soldan sağa giden yatay/eğik giriş
  ustSol: { x: 0.12, y: 0.92, note: 'Üst soldan başla' },
  // Ovalin sağ üstü — küçük oval harflerle aynı mantık
  ovalSag: { x: 0.72, y: 0.82, note: 'Ovalin sağ üstünden, saat yönünün tersine' },
};

const CAPITAL_KIND: Record<string, keyof typeof CAPITAL_PATTERNS> = {
  А: 'tepe', Б: 'ustSol', В: 'ustSol', Г: 'ustSol', Д: 'tepe', Е: 'ovalSag',
  Ё: 'ovalSag', Ж: 'tepe', З: 'ustSol', И: 'tepe', Й: 'tepe', К: 'tepe',
  Л: 'tepe', М: 'tepe', Н: 'tepe', О: 'ovalSag', П: 'tepe', Р: 'tepe',
  С: 'ovalSag', Т: 'tepe', У: 'tepe', Ф: 'ovalSag', Х: 'tepe', Ц: 'tepe',
  Ч: 'tepe', Ш: 'tepe', Щ: 'tepe', Э: 'ustSol', Ю: 'tepe', Я: 'ovalSag',
};

export function startOf(ch: string): StartPoint | undefined {
  const own = STARTS[ch];
  if (own) return own;

  const kind = CAPITAL_KIND[ch];
  if (kind) {
    const pat = CAPITAL_PATTERNS[kind]!;
    return { x: pat.x, y: pat.y, sure: false, note: pat.note };
  }
  return undefined;
}

/** Doğrulanması gereken harfler — kontrol sayfası bunları öne alıyor. */
export function unverified(): string[] {
  return Object.entries(STARTS)
    .filter(([, s]) => !s.sure)
    .map(([ch]) => ch);
}
