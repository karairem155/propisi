// JSON dışa/içe aktarma — brief 12.3.
// "Gerçek çözüm: JSON dışa aktarma butonu. Biriken tekrar geçmişi bu uygulamanın
//  asıl değeri; manuel yedek her depolama API'sinden kıymetli."
//
// SÜRÜM 2 — YEDEK ARTIK KARTLARI VE AYARLARI DA ALIYOR.
//
// Sürüm 1 yalnız `attempts`, yani ham hamleleri alıyordu. Ham hamle kalibrasyon
// korpusu için değerli ama kullanıcı için değil: IndexedDB silinirse geri
// yüklenen yedekte FSRS zamanlaması, seri, rozetler ve defter ayarları
// olmuyordu. Yani günlük kullanımı ayakta tutan her şey kayıptı ve "yedeğim
// var" yanlış bir güven oluyordu.
//
// Sürüm 1 dosyaları hâlâ okunuyor; kart ve ayar taşımıyorlar, o kadar.

import { allAttempts, db, STORE_ATTEMPTS, STORE_CARDS, STORE_SETTINGS } from './db';
import type { SrsCard } from '../srs/cards';
import { APP_VERSION, type StrokeAttempt } from '../types';

export type Backup = {
  format: 'propisi-backup';
  version: 1 | 2;
  appVersion: string;
  exportedAt: string;
  attempts: StrokeAttempt[];
  /** v2 — FSRS kartları. Tarih alanları JSON'da ISO metne dönüşüyor. */
  cards?: SrsCard[];
  /** v2 — ayar deposunun tamamı: kağıt, hedef, istatistik, rozetler. */
  settings?: Record<string, unknown>;
};

export type BackupCounts = { attempts: number; cards: number; settings: number };

async function allSettings(): Promise<Record<string, unknown>> {
  const database = await db();
  const keys = await database.getAllKeys(STORE_SETTINGS);
  const values = await database.getAll(STORE_SETTINGS);
  const out: Record<string, unknown> = {};
  keys.forEach((k, i) => {
    if (typeof k === 'string') out[k] = values[i];
  });
  return out;
}

export async function buildBackup(): Promise<Backup> {
  const [attempts, cards, settings] = await Promise.all([
    allAttempts(),
    (await db()).getAll(STORE_CARDS) as Promise<SrsCard[]>,
    allSettings(),
  ]);
  return {
    format: 'propisi-backup',
    version: 2,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    attempts,
    cards,
    settings,
  };
}

export async function downloadBackup(): Promise<BackupCounts> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.download = `propisi-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return {
    attempts: backup.attempts.length,
    cards: backup.cards?.length ?? 0,
    settings: Object.keys(backup.settings ?? {}).length,
  };
}

/**
 * JSON tarih taşımıyor — `due` ve `last_review` metin olarak geri geliyor.
 * ts-fsrs bunlara `.getTime()` çağırıyor, yani Date'e çevirmezsek zamanlama
 * ilk tekrarda patlar. Sessiz bozulmanın en kötü türü: yedek "yüklendi"
 * der, uygulama ertesi gün çöker.
 */
function reviveCard(card: SrsCard): SrsCard {
  const fsrs = card.fsrs as SrsCard['fsrs'] & { last_review?: Date | string };
  fsrs.due = new Date(fsrs.due);
  if (fsrs.last_review) fsrs.last_review = new Date(fsrs.last_review);
  return card;
}

/** Aynı id'li kayıtların üstüne yazar. Yüklenen kayıt sayılarını döner. */
export async function importBackup(file: File): Promise<BackupCounts> {
  const parsed: unknown = JSON.parse(await file.text());
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Backup).format !== 'propisi-backup'
  ) {
    throw new Error('Bu dosya bir propisi yedeği değil.');
  }
  const backup = parsed as Backup;
  const attempts = backup.attempts;
  if (!Array.isArray(attempts)) throw new Error('Yedekte attempts dizisi yok.');

  const database = await db();

  const txA = database.transaction(STORE_ATTEMPTS, 'readwrite');
  for (const a of attempts) txA.store.put(a);
  await txA.done;

  let cards = 0;
  if (Array.isArray(backup.cards) && backup.cards.length) {
    const txC = database.transaction(STORE_CARDS, 'readwrite');
    for (const c of backup.cards) {
      txC.store.put(reviveCard(c));
      cards++;
    }
    await txC.done;
  }

  let settings = 0;
  if (backup.settings && typeof backup.settings === 'object') {
    const txS = database.transaction(STORE_SETTINGS, 'readwrite');
    for (const [key, value] of Object.entries(backup.settings)) {
      txS.store.put(value, key);
      settings++;
    }
    await txS.done;
  }

  return { attempts: attempts.length, cards, settings };
}
