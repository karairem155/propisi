// Oturum durumu — bir "Tekrara başla"dan özete kadar olan seri.
//
// Hash yönlendirmesi sayfayı yeniden yüklemediği için modül düzeyinde tutmak
// yeterli. Sayfa yenilenirse oturum sıfırlanır; kayıp yok, çünkü her kartın
// sonucu zaten FSRS'e ve denemeler tablosuna yazılmış oluyor. Buradaki veri
// sadece "bu oturumda ne yaptın" özetini üretmek için.

export type SessionEntry = {
  subject: string;
  label: string;
  score: number;
  /** Değerlendirmede düşen kontroller — özetteki kırılım bundan. */
  checks: string[];
  at: number;
};

export type Session = {
  startedAt: number;
  entries: SessionEntry[];
};

let session: Session = { startedAt: Date.now(), entries: [] };

export function startSession(): void {
  session = { startedAt: Date.now(), entries: [] };
}

export function pushResult(entry: SessionEntry): void {
  session.entries.push(entry);
}

export function currentSession(): Session {
  return session;
}

export type SessionSummary = {
  count: number;
  /** 0..1 ortalama puan. */
  average: number;
  best: SessionEntry | null;
  worst: SessionEntry | null;
  /** Kontrol adı → kaç kez düştü. Brief 6.2'nin oturum sonu karşılığı. */
  checks: Record<string, number>;
  /** Dakika cinsinden süre. */
  minutes: number;
};

export function summarize(): SessionSummary {
  const e = session.entries;
  const checks: Record<string, number> = {};
  for (const x of e) {
    for (const c of x.checks) checks[c] = (checks[c] ?? 0) + 1;
  }

  const sorted = [...e].sort((a, b) => b.score - a.score);
  return {
    count: e.length,
    average: e.length ? e.reduce((n, x) => n + x.score, 0) / e.length : 0,
    best: sorted[0] ?? null,
    worst: sorted.length > 1 ? (sorted[sorted.length - 1] ?? null) : null,
    checks,
    minutes: Math.max(1, Math.round((Date.now() - session.startedAt) / 60000)),
  };
}

/** Bu oturumda zaten çalışılmış konular — aynı kartı arka arkaya vermemek için. */
export function seenSubjects(): Set<string> {
  return new Set(session.entries.map((x) => x.subject));
}

// ── Sınav listesi ────────────────────────────────────────────────────────────
//
// Kontrol noktası, mevcut alıştırma ekranlarını SIRAYLA çalıştırır. Kendi soru
// tiplerini yazmıyor — sınav, o seviyede öğrenilenin aynısını karışık sırayla
// ister. Sıradaki adımı kuyruk değil bu liste belirler (srs/flow.ts).

type Playlist = {
  name: string;
  /**
   * Sınav listesi mi yoksa çalışma serisi mi.
   *
   * İkisi de aynı zincirleme mekanizmasını kullanıyor ama çalışma ekranında
   * ZIT davranıyorlar: sınavda tek kılavuzsuz deneme, çalışmada yedi
   * denemelik tam ders. Tek bir "liste açık mı" bayrağı bu ikisini karıştırır.
   */
  exam: boolean;
  items: string[];
  /** Adım başına kısa tür adı ("Yazım", "Dikte") — sonuç ekranı için. */
  labels: string[];
  /**
   * Adım başına çalışma ekranı kipi.
   *
   * Aynı `#/calis/и` adresi ders içinde iki kez geçiyor: bir kez kılavuzla
   * (`trace`), bir kez ezberden (`memory`). Adres ikisini ayırt edemiyor,
   * kip listede taşınıyor.
   */
  modes: (string | undefined)[];
  index: number;
  /** Liste bitince gidilecek yer — sonuç ekranı. */
  finishHref: string;
  /** Liste başlarken oturumda kaç sonuç vardı; not bunun sonrasından hesaplanır. */
  entryMark: number;
};

let playlist: Playlist | null = null;

export function startPlaylist(
  name: string,
  items: string[],
  finishHref: string,
  opts: { exam?: boolean; labels?: string[]; modes?: (string | undefined)[] } = {},
): string | null {
  if (!items.length) return null;
  playlist = {
    name,
    exam: opts.exam ?? false,
    items,
    labels: opts.labels ?? [],
    modes: opts.modes ?? [],
    index: 0,
    finishHref,
    entryMark: session.entries.length,
  };
  return items[0]!;
}

export function playlistActive(): boolean {
  return playlist !== null;
}

/** Çalışma ekranı buna bakıp ders ile sınav arasında seçim yapıyor. */
export function examActive(): boolean {
  return playlist?.exam === true;
}

/** Şu anki adımın kipi — `trace`, `memory` ya da tanımsız (tam ders). */
export function playlistMode(): string | undefined {
  return playlist?.modes[playlist.index];
}

/** Sıradaki adıma geç. Liste bittiyse `null` — çağıran bitiş adresine gider. */
export function advancePlaylist(): string | null {
  if (!playlist) return null;
  playlist.index++;
  return playlist.items[playlist.index] ?? null;
}

export function playlistProgress(): {
  name: string;
  index: number;
  total: number;
  finishHref: string;
} {
  if (!playlist) return { name: '', index: 0, total: 0, finishHref: '#/ozet' };
  return {
    name: playlist.name,
    index: playlist.index,
    total: playlist.items.length,
    finishHref: playlist.finishHref,
  };
}

/**
 * Adım türleri, liste KURULDUĞU andaki hâliyle.
 *
 * NEDEN SAKLANIYOR: sonuç ekranı sınavı yeniden kurup adım adlarını oradan
 * okuyordu. Ama sınavın kendisi kartları ilerlettiği için ustalık sıralaması
 * değişiyor ve ikinci kurulum BAŞKA harfler seçiyordu — kullanıcı `и` yazmışken
 * sonuçta "Yazım · п" görüyordu.
 */
export function playlistLabels(): string[] {
  return playlist?.labels ?? [];
}

/** Sınav sırasında toplanan sonuçlar — sonuç ekranı notu buradan hesaplar. */
export function playlistResults(): SessionEntry[] {
  if (!playlist) return [];
  return session.entries.slice(playlist.entryMark);
}

export function endPlaylist(): void {
  playlist = null;
}
