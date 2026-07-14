/**
 * Recent-files memory, stored locally in IndexedDB. Nothing ever leaves the
 * device; the list is capped and can be cleared from the picker UI.
 */

export interface RecentFileMeta {
  id: string;
  name: string;
  size: number;
  addedAt: number;
  thumbnail: string | null;
}

interface RecentRecord extends RecentFileMeta {
  blob: Blob;
}

const DB_NAME = "pdf-toolbox";
const STORE = "recent-files";
const MAX_RECENTS = 8;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        t.onerror = () => {
          db.close();
          reject(t.error ?? new Error("IndexedDB transaction failed"));
        };
      }),
  );
}

/** Remember a file. Dedupes on name+size; trims the list to the cap. */
export async function saveRecent(
  name: string,
  bytes: Uint8Array,
  thumbnail: string | null,
): Promise<void> {
  try {
    const all = (await tx("readonly", (s) => s.getAll())) as RecentRecord[];
    const record: RecentRecord = {
      id: `${name}:${bytes.byteLength}`,
      name,
      size: bytes.byteLength,
      addedAt: Date.now(),
      thumbnail,
      blob: new Blob([bytes], { type: "application/pdf" }),
    };
    await tx("readwrite", (s) => s.put(record));
    const stale = all
      .filter((r) => r.id !== record.id)
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(MAX_RECENTS - 1);
    for (const r of stale) await tx("readwrite", (s) => s.delete(r.id));
  } catch {
    // Recents are best-effort; private-mode browsers may block IndexedDB.
  }
}

export async function listRecents(): Promise<RecentFileMeta[]> {
  try {
    const all = (await tx("readonly", (s) => s.getAll())) as RecentRecord[];
    return all
      .sort((a, b) => b.addedAt - a.addedAt)
      .map(({ blob: _blob, ...meta }) => meta);
  } catch {
    return [];
  }
}

export async function loadRecent(id: string): Promise<File | null> {
  try {
    const record = (await tx("readonly", (s) => s.get(id))) as RecentRecord | undefined;
    if (!record) return null;
    return new File([record.blob], record.name, { type: "application/pdf" });
  } catch {
    return null;
  }
}

export async function clearRecents(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    // ignore
  }
}
