// Şekil örtüşme denetimi.
//
// Kullanıcı cursive bilmiyor, dolayısıyla kendi yazdığını değerlendiremez —
// otomatik denetim ilk günden gerekli. Ama tam hamle değerlendirmesi (yön, sıra,
// tepe sayısı) glyph verisi istiyor ve o en uzun iş. Bu modül aradaki boşluğu
// dolduruyor: harfin ŞEKLİNİ fonttan alıp örtüşmeye bakıyor, glyph verisi
// gerektirmiyor.
//
// İki sayı birlikte gerekiyor:
//   İsabet (precision) — yazdığın mürekkebin yüzde kaçı harfin üstünde
//   Kapsama (recall)   — harfin yüzde kaçını geçtin
// Tek başına ikisi de kandırılabilir: her yeri karalarsan kapsama %100 olur,
// tek doğru çizgi çizersen isabet %100 olur.
//
// YAKALAMADIKLARI: yön, hamle sırası, kalem kalkışı. Onlar glyph verisi ister
// (bkz. grading/adapter.ts, Faz 1). Şekli öğrenirken yön ikincil.

export type ShapeResult = {
  /** 0..1 — mürekkebin harfin üstünde kalan oranı. */
  precision: number;
  /** 0..1 — harfin geçilmiş olan oranı. */
  recall: number;
  /** 0..1 — nihai puan; bant kapsamasıyla cezalandırılmış F1. */
  score: number;
  /** En zayıf dikey bandın kapsaması. */
  weakestBand: number;
  /** O bandın yatay konumu (0..1) — geri bildirimde yer göstermek için. */
  weakestAt: number;
  /** Bir bölüm tamamen atlanmış mı (ör. üç tepeden biri). */
  missedSection: boolean;
  /** Atlanan harf bölgeleri kehribar, taşan mürekkep mercan. */
  overlay: HTMLCanvasElement;
};

/**
 * Harfi kaç dikey banda bölüp ayrı ayrı kapsama ölçtüğümüz.
 *
 * NEDEN VAR: yalnız toplam kapsamaya bakınca `ш` yerine iki tepe çizmek %85
 * veriyordu — yani uygulamanın ayırt etmesi gereken EN ÖNEMLİ hata (и/ш,
 * brief 6.1) gözden kaçıyordu. Eksik tepe toplamda küçük bir oran ama kendi
 * bandında sıfır. Bant bazlı bakınca yakalanıyor.
 *
 * Bu, tepe saymanın glyph verisi gerektirmeyen karşılığı.
 */
const BANDS = 9;
/** Bandın "harf var" sayılması için gereken asgari hedef mürekkebi. */
const BAND_MIN_INK = 0.25;

export type ShapeOptions = {
  width: number;
  height: number;
  /** Hedef harfi çizer (dolu). */
  drawTarget: (ctx: CanvasRenderingContext2D) => void;
  /** Kullanıcının mürekkebini çizer (dolu). */
  drawUser: (ctx: CanvasRenderingContext2D) => void;
  /** Kaç piksel sapmaya izin var (CSS px). */
  tolerance?: number;
  /** Örnekleme oranı — hız için küçültülür. */
  scale?: number;
  /**
   * Kılavuz yokken (Kademe 3, dikte) kullanıcı harfi sayfanın başka bir yerine
   * yazabilir. 'translate' hedefi kullanıcının yazdığı yere kaydırıp öyle
   * karşılaştırır — konum hatası şekil hatası sayılmasın.
   *
   * ÖLÇEK BİLEREK NORMALİZE EDİLMİYOR. Brief 6.1 uyarıyor: Procrustes ölçek
   * normalizasyonu iki tepeli `и`yi üç tepeli `ш`ya mükemmel uyduruyor.
   * Kayma güvenli, ölçek değil.
   */
  align?: 'none' | 'translate';
};

const MISSED = [242, 166, 59]; // --amber
const OVERFLOW = [242, 112, 95]; // --coral

export function scoreShape(opts: ShapeOptions): ShapeResult {
  const scale = opts.scale ?? 0.34;
  const w = Math.max(1, Math.round(opts.width * scale));
  const h = Math.max(1, Math.round(opts.height * scale));
  const tol = Math.max(1, Math.round((opts.tolerance ?? 14) * scale));

  const target = rasterize(w, h, scale, opts.drawTarget);
  let user = rasterize(w, h, scale, opts.drawUser);

  if (opts.align === 'translate') {
    const shift = centerDelta(target, user, w, h);
    if (shift) user = translate(user, w, h, shift.dx, shift.dy);
  }

  const targetTol = dilate(target, w, h, tol);
  const userTol = dilate(user, w, h, tol);

  let userInk = 0;
  let userHit = 0;
  let targetInk = 0;
  let targetHit = 0;

  for (let i = 0; i < target.length; i++) {
    if (user[i]) {
      userInk++;
      if (targetTol[i]) userHit++;
    }
    if (target[i]) {
      targetInk++;
      if (userTol[i]) targetHit++;
    }
  }

  const precision = userInk ? userHit / userInk : 0;
  const recall = targetInk ? targetHit / targetInk : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const bands = bandCoverage(target, userTol, w, h);
  const weakest = bands.reduce((acc, b) => (b.covered < acc.covered ? b : acc), {
    covered: 1,
    at: 0.5,
  });
  const missedSection = weakest.covered < 0.5;

  // Tamamen atlanan bölüm varsa F1 ne olursa olsun puan tavanlanır.
  const score = missedSection ? Math.min(f1, 0.45 + weakest.covered * 0.2) : f1;

  return {
    precision,
    recall,
    score,
    weakestBand: weakest.covered,
    weakestAt: weakest.at,
    missedSection,
    overlay: buildOverlay(opts.width, opts.height, w, h, target, user, targetTol, userTol),
  };
}


/** Maskenin mürekkep sınırlarının orta noktası. */
function inkCenter(
  mask: Uint8Array,
  w: number,
  h: number,
): { cx: number; cy: number } | null {
  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return null;
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/** Kullanıcının yazdığı yeri hedefin üstüne taşımak için gereken kayma. */
function centerDelta(
  target: Uint8Array,
  user: Uint8Array,
  w: number,
  h: number,
): { dx: number; dy: number } | null {
  const t = inkCenter(target, w, h);
  const u = inkCenter(user, w, h);
  if (!t || !u) return null;
  return { dx: Math.round(t.cx - u.cx), dy: Math.round(t.cy - u.cy) };
}

function translate(mask: Uint8Array, w: number, h: number, dx: number, dy: number): Uint8Array {
  if (!dx && !dy) return mask;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= h) continue;
    for (let x = 0; x < w; x++) {
      const sx = x - dx;
      if (sx < 0 || sx >= w) continue;
      out[y * w + x] = mask[sy * w + sx]!;
    }
  }
  return out;
}

/** Çizim geri çağrısını küçültülmüş bir maskeye rasterleştirir. */
function rasterize(
  w: number,
  h: number,
  scale: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Uint8Array {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#000';
  draw(ctx);

  const data = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 3; i < mask.length; i++, p += 4) {
    mask[i] = data[p]! > 40 ? 1 : 0; // alfa kanalı yeter
  }
  return mask;
}

/**
 * Hedefi dikey bantlara bölüp her bandın ayrı kapsamasını ölçer.
 * Yeterince hedef mürekkebi olmayan bantlar (kenar boşlukları) atlanır.
 */
function bandCoverage(
  target: Uint8Array,
  userTol: Uint8Array,
  w: number,
  h: number,
): { covered: number; at: number }[] {
  const ink = new Array<number>(BANDS).fill(0);
  const hit = new Array<number>(BANDS).fill(0);

  // Bantlar harfin sınırlarına göre bölünür, tuvale göre değil.
  let minX = w;
  let maxX = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (target[y * w + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  if (maxX < minX) return [{ covered: 1, at: 0.5 }];
  const span = maxX - minX + 1;

  for (let y = 0; y < h; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * w + x;
      if (!target[i]) continue;
      const b = Math.min(BANDS - 1, Math.floor(((x - minX) / span) * BANDS));
      ink[b]!++;
      if (userTol[i]) hit[b]!++;
    }
  }

  const peak = Math.max(...ink);
  const out: { covered: number; at: number }[] = [];
  for (let b = 0; b < BANDS; b++) {
    if (ink[b]! < peak * BAND_MIN_INK) continue;
    out.push({ covered: hit[b]! / ink[b]!, at: (b + 0.5) / BANDS });
  }
  return out.length ? out : [{ covered: 1, at: 0.5 }];
}

/**
 * Yarıçap r kadar genişletir — tolerans bandı.
 * İki geçişli (yatay + dikey) maksimum filtresi; küçük ızgarada yeterince hızlı.
 */
function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const pass1 = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let on = 0;
      const from = Math.max(0, x - r);
      const to = Math.min(w - 1, x + r);
      for (let k = from; k <= to; k++) {
        if (mask[row + k]) {
          on = 1;
          break;
        }
      }
      pass1[row + x] = on;
    }
  }

  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let on = 0;
      const from = Math.max(0, y - r);
      const to = Math.min(h - 1, y + r);
      for (let k = from; k <= to; k++) {
        if (pass1[k * w + x]) {
          on = 1;
          break;
        }
      }
      out[y * w + x] = on;
    }
  }
  return out;
}

/** Görsel geri bildirim: atladığın yerler ve taştığın yerler. */
function buildOverlay(
  cssW: number,
  cssH: number,
  w: number,
  h: number,
  target: Uint8Array,
  user: Uint8Array,
  targetTol: Uint8Array,
  userTol: Uint8Array,
): HTMLCanvasElement {
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sctx = small.getContext('2d')!;
  const img = sctx.createImageData(w, h);

  for (let i = 0, p = 0; i < target.length; i++, p += 4) {
    if (target[i] && !userTol[i]) {
      // Harfin atlanmış kısmı.
      img.data[p] = MISSED[0]!;
      img.data[p + 1] = MISSED[1]!;
      img.data[p + 2] = MISSED[2]!;
      img.data[p + 3] = 210;
    } else if (user[i] && !targetTol[i]) {
      // Harfin dışına taşmış mürekkep.
      img.data[p] = OVERFLOW[0]!;
      img.data[p + 1] = OVERFLOW[1]!;
      img.data[p + 2] = OVERFLOW[2]!;
      img.data[p + 3] = 190;
    }
  }
  sctx.putImageData(img, 0, 0);

  // Küçük ızgarayı tam boya büyüt — yumuşak geçiş daha okunaklı.
  const out = document.createElement('canvas');
  out.width = cssW;
  out.height = cssH;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = true;
  octx.drawImage(small, 0, 0, cssW, cssH);
  return out;
}

/**
 * Puanı Türkçe geri bildirime çevirir.
 * `noun` element derslerinde "harf" dememek için — orada çizilen şey bir şekil.
 */
export function shapeMessage(
  r: ShapeResult,
  noun: 'harf' | 'şekil' | 'kelime' = 'harf',
): { title: string; detail: string } {
  // Atlanan bölüm en ciddi hata — önce o söylenir.
  if (r.missedSection) {
    const where =
      r.weakestAt < 0.34 ? 'başındaki' : r.weakestAt > 0.66 ? 'sonundaki' : 'ortasındaki';
    return {
      title: 'Bir bölümü atladın',
      detail: `${cap(noun)}in ${where} kısmı boş kaldı — kehribar bölgeye bak. Tamamını geç.`,
    };
  }
  if (r.score >= 0.85) {
    return { title: 'Çok iyi', detail: `${cap(noun)}in üstünden temiz geçtin.` };
  }
  if (r.recall < 0.65 && r.precision >= 0.7) {
    return {
      title: 'Eksik kaldı',
      detail: `${cap(noun)}in bir kısmını atladın — kehribar bölgeler geçmediğin yerler.`,
    };
  }
  if (r.precision < 0.6) {
    return {
      title: 'Çizgiden çıktın',
      detail: `Mürekkebin çoğu ${noun}in dışında kaldı — mercan bölgeler taşan yerler.`,
    };
  }
  if (r.score >= 0.7) {
    return { title: 'İyi', detail: 'Neredeyse tam — kehribar yerleri de geç.' };
  }
  return { title: 'Tekrar dene', detail: 'Kılavuzun üstünden yavaşça geç.' };
}

function cap(s: string): string {
  return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
}
