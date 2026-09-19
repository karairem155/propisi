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
