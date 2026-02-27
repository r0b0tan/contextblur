const DB_NAME = 'contextblur_runs';
const DB_VERSION = 1;
export const STORE_NAME = 'runs';

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('mode', 'mode', { unique: false });
        store.createIndex('batch_id', 'batch_id', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export function dbTransaction(
  storeName: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  return openDB().then((db) => {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  });
}

export function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
