// Görsel yuvaları.
//
// Görseller ayrı üretiliyor. Bu dosya her yuvanın nerede durduğunu, ne göstereceğini
// ve hangi oranda olması gerektiğini tutar. Dosya henüz gelmediyse yerine numaralı bir
// yer tutucu çizilir — böylece hangi görselin nereye gideceği ekranda görünür ve
// eksik dosya 404 üretmez.
//
// GÖRSEL GELDİĞİNDE YAPILACAK TEK ŞEY:
//   1. dosyayı  public/art/<anahtar>.png  olarak koy
//   2. aşağıdaki PRESENT listesine anahtarı ekle
// Başka hiçbir yeri değiştirmeye gerek yok.

export type Ratio = '1:1' | '3:2' | '16:9' | '9:16';
export type Bg = 'blue' | 'white' | 'transparent';

type Spec = { no: string; alt: string; ratio: Ratio; bg: Bg };

export const ASSETS = {
  // A · Kurulum / karşılama
  'onboard-welcome': { no: '01', alt: 'Kadro el sallıyor', ratio: '16:9', bg: 'blue' },
  'onboard-scribble': { no: '02', alt: 'Scribble kapatma', ratio: '9:16', bg: 'white' },
  'onboard-voice': { no: '03', alt: 'Ses uyarısı', ratio: '9:16', bg: 'white' },
  'onboard-install': { no: '04', alt: 'Ana ekrana ekleme', ratio: '9:16', bg: 'white' },

  // B · Bugün
  'today-hero': { no: '05', alt: 'Defterin başında kadro', ratio: '16:9', bg: 'blue' },
  'today-empty': { no: '06', alt: 'Bugünlük tamam', ratio: '9:16', bg: 'white' },
  'today-streak': { no: '07', alt: 'Seri', ratio: '9:16', bg: 'white' },
  'goal-complete': { no: '08', alt: 'Hedef tamamlandı', ratio: '9:16', bg: 'white' },

  // C · Patika
  'level-badge-0': { no: '10', alt: 'Seviye 0 arması', ratio: '1:1', bg: 'transparent' },
  'level-badge-1': { no: '11', alt: 'Seviye 1 arması', ratio: '1:1', bg: 'transparent' },
  'level-badge-2': { no: '12', alt: 'Seviye 2 arması', ratio: '1:1', bg: 'transparent' },
  'level-badge-3': { no: '13', alt: 'Seviye 3 arması', ratio: '1:1', bg: 'transparent' },
  'level-badge-4': { no: '14', alt: 'Seviye 4 arması', ratio: '1:1', bg: 'transparent' },
  'level-badge-5': { no: '15', alt: 'Seviye 5 arması', ratio: '1:1', bg: 'transparent' },
  'level-badge-6': { no: '16', alt: 'Seviye 6 arması', ratio: '1:1', bg: 'transparent' },
  'level-badge-7': { no: '17', alt: 'Seviye 7 arması', ratio: '1:1', bg: 'transparent' },
  'node-locked': { no: '18', alt: 'Kilit', ratio: '1:1', bg: 'transparent' },
  'level-complete': { no: '19', alt: 'Seviye tamamlandı', ratio: '16:9', bg: 'blue' },

  // D · Alfabe

  // E · İlerleme
  'badge-streak3': { no: '24', alt: '3 gün seri', ratio: '1:1', bg: 'transparent' },
  'badge-streak7': { no: '25', alt: '7 gün seri', ratio: '1:1', bg: 'transparent' },
  'badge-streak30': { no: '26', alt: '30 gün seri', ratio: '1:1', bg: 'transparent' },
  'badge-first-letter': { no: '27', alt: 'İlk harf', ratio: '1:1', bg: 'transparent' },
  'badge-first-group': { no: '28', alt: 'İlk grup', ratio: '1:1', bg: 'transparent' },
  'badge-100-reviews': { no: '29', alt: '100 tekrar', ratio: '1:1', bg: 'transparent' },
  'badge-perfect': { no: '30', alt: 'Kusursuz oturum', ratio: '1:1', bg: 'transparent' },
  'badge-night': { no: '31', alt: 'Gece çalışması', ratio: '1:1', bg: 'transparent' },

  // F · Alıştırma / geri bildirim
  'feedback-correct': { no: '32', alt: 'Doğru', ratio: '1:1', bg: 'transparent' },
  'feedback-wrong': { no: '33', alt: 'Tekrar dene', ratio: '1:1', bg: 'transparent' },
  'feedback-hint': { no: '34', alt: 'İpucu', ratio: '1:1', bg: 'transparent' },

  // G · Maskot kadrosu (3B) — ui/mascot.ts bunları kullanır, yoksa SVG'ye düşer
  'mascot-cubuk-happy': { no: '36', alt: 'Çubuk — memnun', ratio: '1:1', bg: 'transparent' },
  'mascot-cubuk-cheer': { no: '37', alt: 'Çubuk — sevinçli', ratio: '1:1', bg: 'transparent' },
  'mascot-cubuk-think': { no: '38', alt: 'Çubuk — kafası karışık', ratio: '1:1', bg: 'transparent' },
  'mascot-cubuk-sleep': { no: '39', alt: 'Çubuk — uykuda', ratio: '1:1', bg: 'transparent' },
  'mascot-kanca-happy': { no: '40', alt: 'Kanca — memnun', ratio: '1:1', bg: 'transparent' },
  'mascot-kanca-cheer': { no: '41', alt: 'Kanca — sevinçli', ratio: '1:1', bg: 'transparent' },
  'mascot-kanca-think': { no: '42', alt: 'Kanca — kafası karışık', ratio: '1:1', bg: 'transparent' },
  'mascot-kanca-sleep': { no: '43', alt: 'Kanca — uykuda', ratio: '1:1', bg: 'transparent' },
  'mascot-oval-happy': { no: '44', alt: 'Oval — memnun', ratio: '1:1', bg: 'transparent' },
  'mascot-oval-cheer': { no: '45', alt: 'Oval — sevinçli', ratio: '1:1', bg: 'transparent' },
  'mascot-oval-think': { no: '46', alt: 'Oval — kafası karışık', ratio: '1:1', bg: 'transparent' },
  'mascot-oval-sleep': { no: '47', alt: 'Oval — uykuda', ratio: '1:1', bg: 'transparent' },
  'mascot-ilmek-happy': { no: '48', alt: 'İlmek — memnun', ratio: '1:1', bg: 'transparent' },
  'mascot-ilmek-cheer': { no: '49', alt: 'İlmek — sevinçli', ratio: '1:1', bg: 'transparent' },
  'mascot-ilmek-think': { no: '50', alt: 'İlmek — kafası karışık', ratio: '1:1', bg: 'transparent' },
  'mascot-ilmek-sleep': { no: '51', alt: 'İlmek — uykuda', ratio: '1:1', bg: 'transparent' },
} as const satisfies Record<string, Spec>;

export type AssetKey = keyof typeof ASSETS;

/**
 * Gelen dosyalar. Buraya eklenmeyen anahtar için istek atılmaz — eksik görsel
 * 404 üretmesin diye kapı burası.
 *
 * 19 Eylül 2026: 29 görsel teslim alındı (3B render, WebP) ve LİSTE TAMAM —
 * her yuvanın dosyası var, hiçbir ekranda yer tutucu kalmadı.
 *
 * Teslim edilmeyen altı yuva kaldırıldı, çünkü hiçbiri gerekmiyordu:
 * `path-bg-tile` ve `session-summary` hiç kullanılmıyordu; `section-*` ve
 * `progress-hero` ise tam genişlik 3:2 dekoratif görsellerdi ve asıl içeriği
 * (harf ızgarası, ısı haritası) katlamanın altına itiyorlardı. Yerlerine
 * ekranın kendi verisini taşıyan kompakt başlıklar kondu.
 */
export const PRESENT: AssetKey[] = [
  'onboard-welcome', 'onboard-scribble', 'onboard-voice', 'onboard-install',
  'today-hero', 'today-empty', 'today-streak', 'goal-complete',
  'level-badge-0', 'level-badge-1', 'level-badge-2', 'level-badge-3',
  'level-badge-4', 'level-badge-5', 'level-badge-6', 'level-badge-7',
  'node-locked', 'level-complete',
  'badge-streak3', 'badge-streak7', 'badge-streak30', 'badge-first-letter',
  'badge-first-group', 'badge-100-reviews', 'badge-perfect', 'badge-night',
  'feedback-correct', 'feedback-wrong', 'feedback-hint',
];

const present = new Set<AssetKey>(PRESENT);

export function hasArt(key: AssetKey): boolean {
  return present.has(key);
}

export function artCount(): { ready: number; total: number } {
  return { ready: present.size, total: Object.keys(ASSETS).length };
}

export type ArtOptions = {
  /** Yuvanın CSS genişliği (varsayılan: %100). */
  width?: string;
  /** Yer tutucu gösterme, hiç çizme. */
  hideWhenMissing?: boolean;
  className?: string;
};

/** Görsel varsa <img>, yoksa numaralı yer tutucu. */
export function art(key: AssetKey, opts: ArtOptions = {}): string {
  const spec = ASSETS[key];
  const width = opts.width ?? '100%';
  const cls = opts.className ? ` ${opts.className}` : '';

  if (present.has(key)) {
    return `<img class="art-slot art-slot--img${cls}" src="art/${key}.webp" alt="${spec.alt}"
      style="width:${width};aspect-ratio:${spec.ratio.replace(':', '/')}" loading="lazy">`;
  }
  if (opts.hideWhenMissing) return '';

  return `<div class="art-slot art-slot--empty art-slot--${spec.bg}${cls}"
    style="width:${width};aspect-ratio:${spec.ratio.replace(':', '/')}"
    title="${spec.alt}">
    <b>${spec.no}</b>
    <span>${key}</span>
    <small>${spec.ratio} · ${spec.bg}</small>
  </div>`;
}
