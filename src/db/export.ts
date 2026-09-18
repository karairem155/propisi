// JSON dışa/içe aktarma — brief 12.3.
// "Gerçek çözüm: JSON dışa aktarma butonu. Biriken tekrar geçmişi bu uygulamanın
//  asıl değeri; manuel yedek her depolama API'sinden kıymetli."

import { allAttempts, db, STORE_ATTEMPTS } from './db';
import { APP_VERSION, type StrokeAttempt } from '../types';

export type Backup = {
  format: 'propisi-backup';
  version: 1;
  appVersion: string;
  exportedAt: string;
  attempts: StrokeAttempt[];
};

export async function buildBackup(): Promise<Backup> {
  return {
    format: 'propisi-backup',
    version: 1,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    attempts: await allAttempts(),
  };
}

export async function downloadBackup(): Promise<number> {
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
  return backup.attempts.length;
}

/** Aynı id'li kayıtların üstüne yazar. Eklenen/güncellenen sayısını döner. */
export async function importBackup(file: File): Promise<number> {
  const parsed: unknown = JSON.parse(await file.text());
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Backup).format !== 'propisi-backup'
  ) {
    throw new Error('Bu dosya bir propisi yedeği değil.');
  }
  const attempts = (parsed as Backup).attempts;
  if (!Array.isArray(attempts)) throw new Error('Yedekte attempts dizisi yok.');

  const database = await db();
  const tx = database.transaction(STORE_ATTEMPTS, 'readwrite');
  for (const a of attempts) tx.store.put(a);
  await tx.done;
  return attempts.length;
}
