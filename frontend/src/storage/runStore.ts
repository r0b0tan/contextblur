import { openDB, STORE_NAME, promisifyRequest } from './db';
import type { RunRecord } from '../features/transform/types';

export async function saveRun(record: RunRecord): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await promisifyRequest(store.put(record));
}

export async function saveRuns(records: RunRecord[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await Promise.all(records.map((r) => promisifyRequest(store.put(r))));
}

export async function getAllRuns(): Promise<RunRecord[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('created_at');
  const all = await promisifyRequest<RunRecord[]>(
    index.getAll() as IDBRequest<RunRecord[]>,
  );
  // Newest first
  return all.slice().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function getRunById(id: string): Promise<RunRecord | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const result = await promisifyRequest<RunRecord | undefined>(
    store.get(id) as IDBRequest<RunRecord | undefined>,
  );
  return result ?? null;
}

export async function getRunsByBatchId(batchId: string): Promise<RunRecord[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('batch_id');
  const result = await promisifyRequest<RunRecord[]>(
    index.getAll(batchId) as IDBRequest<RunRecord[]>,
  );
  return result;
}

export async function deleteRun(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await promisifyRequest(store.delete(id));
}

export async function clearAllRuns(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await promisifyRequest(store.clear());
}
