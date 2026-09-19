// IndexedDB — brief 3 ve 12.3.
//
// DİKKAT (brief 12.4): ana ekrana eklenen uygulama, Safari sekmesinden AYRI bir
// depolama kavanozu kullanır (WebKit bug 181849). Safari'de oluşturduğun test verisi
// kurulu uygulamada görünmez. Geliştirme ve testi kurulu uygulamanın içinde yap.

import { openDB, type IDBPDatabase } from 'idb';
import type { StrokeAttempt } from '../types';

const DB_NAME = 'propisi';
const DB_VERSION = 2;

export const STORE_ATTEMPTS = 'attempts';
export const STORE_SETTINGS = 'settings';
export const STORE_CARDS = 'cards';

let handle: Promise<IDBPDatabase> | null = null;

export function db(): Promise<IDBPDatabase> {
  handle ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_ATTEMPTS)) {
        const store = database.createObjectStore(STORE_ATTEMPTS, { keyPath: 'id' });
        store.createIndex('ts', 'ts');
        store.createIndex('target', 'target');
      }
      if (!database.objectStoreNames.contains(STORE_SETTINGS)) {
        database.createObjectStore(STORE_SETTINGS);
      }
      // v2 — FSRS kartları (brief 8.1).
      if (!database.objectStoreNames.contains(STORE_CARDS)) {
        const cards = database.createObjectStore(STORE_CARDS, { keyPath: 'id' });
        cards.createIndex('levelId', 'levelId');
        cards.createIndex('subject', 'subject');
      }
    },
  });
  return handle;
}

export async function saveAttempt(attempt: StrokeAttempt): Promise<void> {
  (await db()).put(STORE_ATTEMPTS, attempt);
}

export async function allAttempts(): Promise<StrokeAttempt[]> {
  const rows = (await (await db()).getAllFromIndex(STORE_ATTEMPTS, 'ts')) as StrokeAttempt[];
  return rows.reverse(); // en yeni önce
}

export async function attemptsFor(target: string): Promise<StrokeAttempt[]> {
  return (await (await db()).getAllFromIndex(STORE_ATTEMPTS, 'target', target)) as StrokeAttempt[];
}

export async function countAttempts(): Promise<number> {
  return (await db()).count(STORE_ATTEMPTS);
}

export async function clearAttempts(): Promise<void> {
  (await db()).clear(STORE_ATTEMPTS);
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const value = (await (await db()).get(STORE_SETTINGS, key)) as T | undefined;
  return value ?? fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  (await db()).put(STORE_SETTINGS, value, key);
}

/**
 * Ayarı tamamen kaldırır. `setSetting(key, null)` kaydı bırakıyor ve yedek
 * artık ayarları da taşıdığı için o boş kayıtlar dosyaya giriyor.
 */
export async function delSetting(key: string): Promise<void> {
  (await db()).delete(STORE_SETTINGS, key);
}

/**
 * brief 12.3 — Safari 15.2+. Garanti değil, cihaz depolama baskısında LRU tahliye
 * hâlâ mümkün. Asıl güvence JSON dışa aktarma butonudur.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  try {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return null;
  }
}
