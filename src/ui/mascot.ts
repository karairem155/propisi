// Maskot kadrosu.
//
// Karakterler rastgele seçilmedi: her biri brief 7.2'deki temel yazı elemanlarından
// biri (элементы букв). Faz 0 müfredatının ilk dersleri bunlar, ve harfler bunlardan
// kuruluyor. Yani maskot süs değil, öğretilen şeyin kendisi.
//
//   cubuk  — прямая наклонная палочка (düz eğik çizgi)
//   kanca  — крючок (aşağıda yuvarlatmalı çizgi)
//   oval   — овал
//   ilmek  — петелька (ilmek)
//
// Hepsi 100x100 viewBox'ta, kalın yuvarlak uçlu fırça darbesi olarak çizilir —
// gövde silueti elemanın kendi şekli.

export type MascotName = 'cubuk' | 'kanca' | 'oval' | 'ilmek';

/** happy: memnun · open: uyanık · think: kafası karışık · sleep: uykuda · cheer: sevinçli */
export type Mood = 'happy' | 'open' | 'think' | 'sleep' | 'cheer';

export const MASCOTS: Record<MascotName, { color: string; label: string; ru: string }> = {
  cubuk: { color: '#F2A63B', label: 'Çubuk', ru: 'палочка' },
  kanca: { color: '#35C79A', label: 'Kanca', ru: 'крючок' },
  oval: { color: '#F2705F', label: 'Oval', ru: 'овал' },
  ilmek: { color: '#8E7CF0', label: 'İlmek', ru: 'петелька' },
};

const INK = '#14213D';

type Face = { x: number; y: number; eye: number };

/** Gövde çizimi + yüzün oturacağı nokta. */
const BODIES: Record<MascotName, { body: string; face: Face }> = {
  // Eğik çizgi: 65 derecelik tek bir fırça darbesi.
  cubuk: {
    body: '<path d="M64 22 L40 80" stroke-width="32" />',
    face: { x: 56, y: 40, eye: 7 },
  },
  // Kanca: aşağı inip tabanda yuvarlanan çizgi.
  kanca: {
    body: '<path d="M64 22 L50 60 Q45 79 27 73" stroke-width="27" />',
    face: { x: 59, y: 36, eye: 6.5 },
  },
  // Oval: dolu gövde, kadronun en geniş yüzü.
  oval: {
    body: '<ellipse cx="50" cy="53" rx="25" ry="35" stroke="none" fill="currentColor" />',
    face: { x: 50, y: 49, eye: 8 },
  },
  // İlmek: yukarı çıkıp kendi üstünden dönen kapalı ilmek.
  ilmek: {
    body: '<path d="M32 88 C26 58 28 18 52 16 C76 14 78 50 48 58 C32 62 38 78 70 80" stroke-width="18" />',
    face: { x: 53, y: 27, eye: 5 },
  },
};

function eyes(f: Face, mood: Mood): string {
  const { x, y, eye: e } = f;
  const lx = x - e;
  const rx = x + e;
  const r = Math.max(2.4, e * 0.42);
  const w = Math.max(3.4, e * 0.62);
  const sw = Math.max(2.4, e * 0.34);

  // Kapalı memnun göz: yukarı kıvrık yay.
  const arcUp = (cx: number) =>
    `<path d="M${cx - w} ${y} Q${cx} ${y - w * 1.5} ${cx + w} ${y}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
  // Kapalı uykulu göz: yassı, geniş, aşağı kıvrık yay + kirpik ucu.
  // happy'nin yukarı kıvrık yayından net ayrılsın diye daha geniş ve düz.
  const arcDown = (cx: number) =>
    `<path d="M${cx - w * 1.25} ${y - w * 0.15} Q${cx} ${y + w * 0.95} ${cx + w * 1.25} ${y - w * 0.15}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>` +
    `<path d="M${cx + w * 1.25} ${y - w * 0.15} l${w * 0.45} ${w * 0.35}" stroke="${INK}" stroke-width="${sw * 0.8}" fill="none" stroke-linecap="round"/>`;
  const dot = (cx: number) =>
    `<circle cx="${cx}" cy="${y}" r="${r}" fill="${INK}"/>` +
    `<circle cx="${cx + r * 0.42}" cy="${y - r * 0.45}" r="${r * 0.32}" fill="#fff"/>`;

  switch (mood) {
    case 'happy':
      return arcUp(lx) + arcUp(rx);
    case 'sleep':
      return arcDown(lx) + arcDown(rx);
    case 'think':
      return dot(lx) + arcUp(rx);
    default:
      return dot(lx) + dot(rx);
  }
}

function mouth(f: Face, mood: Mood): string {
  const { x, y, eye: e } = f;
  const my = y + e * 1.35;
  const m = e * 0.62;
  const sw = Math.max(2.2, e * 0.32);
  const smile = `<path d="M${x - m} ${my} Q${x} ${my + m * 1.25} ${x + m} ${my}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;

  switch (mood) {
    case 'sleep':
      return `<path d="M${x - m * 0.5} ${my} Q${x} ${my + m * 0.7} ${x + m * 0.5} ${my}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
    case 'think':
      // Kararsız ağız: küçük dalga.
      return `<path d="M${x - m} ${my} q${m * 0.5} ${-m * 0.6} ${m} 0 q${m * 0.5} ${m * 0.6} ${m} 0" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
    case 'cheer':
      return `<path d="M${x - m * 1.15} ${my - m * 0.35} a${m * 1.15} ${m * 1.3} 0 0 0 ${m * 2.3} 0 z" fill="${INK}"/>`;
    default:
      return smile;
  }
}

/**
 * Gövdenin üstüne düşen işaretler kendi renginde çizilirse kayboluyor —
 * beyaz hale (paint-order: stroke) her zeminde okunur kılıyor.
 */
function glyph(gx: number, gy: number, size: number, text: string): string {
  return `<text x="${gx}" y="${gy}" font-family="Nunito, sans-serif" font-size="${size}" font-weight="800" fill="${INK}" stroke="#fff" stroke-width="${size * 0.28}" paint-order="stroke" stroke-linejoin="round">${text}</text>`;
}

function extras(f: Face, mood: Mood): string {
  const { x, y, eye: e } = f;
  if (mood === 'think') {
    return glyph(x + e * 2.4, y - e * 0.9, e * 2.8, '?');
  }
  if (mood === 'sleep') {
    return glyph(x + e * 2.1, y - e * 1.5, e * 1.9, 'z') + glyph(x + e * 3.5, y - e * 2.8, e * 1.3, 'z');
  }
  return '';
}

export type MascotOptions = {
  mood?: Mood;
  size?: number;
  /** Gövde rengini ezmek için (varsayılan: karakterin kendi rengi). */
  color?: string;
  title?: string;
};

export function mascotSvg(name: MascotName, opts: MascotOptions = {}): string {
  const mood = opts.mood ?? 'happy';
  const size = opts.size ?? 96;
  const color = opts.color ?? MASCOTS[name].color;
  const { body, face } = BODIES[name];
  const label = opts.title ?? `${MASCOTS[name].label} (${MASCOTS[name].ru})`;

  return `<svg class="mascot" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${label}" style="color:${color}">
    <g stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</g>
    ${eyes(face, mood)}
    ${mouth(face, mood)}
    ${extras(face, mood)}
  </svg>`;
}


// ── 3B kadro ──────────────────────────────────────────────────────────────
//
// Kadro 3B'ye geçiriliyor (teslim edilen illüstrasyonlarla aynı dil olsun diye).
// Geçiş kademeli: aşağıdaki mascot() önce 3B görseli arar, yoksa SVG'ye düşer.
// Yani görseller gelene kadar hiçbir şey bozulmaz, geldikçe kendiliğinden yükselir.
//
// DİKKAT: 3B render küçük boyutta (40-54px) detay kaybeder; SVG orada daha keskin.
// Bu yüzden `preferSvgBelow` eşiğinin altında SVG kullanılmaya devam edilir.

import { art, hasArt, type AssetKey } from './assets';

/** Bu boyutun altında 3B yerine SVG — küçükte vektör daha okunaklı. */
export const PREFER_SVG_BELOW = 44;

function artKey(name: MascotName, mood: Mood): AssetKey | null {
  // `open` için ayrı render üretilmiyor; en yakın hâli happy.
  const m = mood === 'open' ? 'happy' : mood;
  const key = `mascot-${name}-${m}` as AssetKey;
  return hasArt(key) ? key : null;
}

/**
 * Kadronun tercih edilen çizimi: 3B görsel varsa o, yoksa SVG.
 * Çağrı yerleri bunu kullanmalı — mascotSvg() doğrudan çağrılmamalı.
 */
export function mascot(name: MascotName, opts: MascotOptions = {}): string {
  const size = opts.size ?? 96;
  const mood = opts.mood ?? 'happy';
  const key = size >= PREFER_SVG_BELOW ? artKey(name, mood) : null;
  if (key) return art(key, { width: `${size}px`, className: 'mascot mascot--3d' });
  return mascotSvg(name, opts);
}

/** Kadronun tamamı, yan yana duran bir grup olarak — açılış/boş durum ekranları için. */
export function mascotTeam(size = 72, moods?: Partial<Record<MascotName, Mood>>): string {
  const order: MascotName[] = ['cubuk', 'oval', 'ilmek', 'kanca'];
  return `<div class="mascot-team">${order
    .map((n, i) =>
      mascot(n, {
        size: i % 2 === 0 ? size : size * 0.86,
        ...(moods?.[n] ? { mood: moods[n] } : {}),
      }),
    )
    .join('')}</div>`;
}
