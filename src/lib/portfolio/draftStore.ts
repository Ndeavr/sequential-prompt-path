/**
 * Brouillon local « Montrez vos réalisations » — survit à la connexion
 * (SMS, courriel, Google), au retour arrière et au rechargement.
 *
 * - Photos déjà nettoyées (sanitizeImage : EXIF/géolocalisation retirés)
 *   gardées dans IndexedDB sur l'appareil seulement; rien n'est téléversé
 *   avant compte + consentement.
 * - Repli localStorage (data URL) si IndexedDB est indisponible.
 * - Expire après 24 h et s'efface après une soumission réussie.
 */
import {
  blobToDataUrl, clearDraftLocally, dataUrlToBlob, emptyDraft, MAX_PHOTOS, readDraftLocally, saveDraftLocally, type PortfolioDraft,
} from "@/lib/portfolio/freePortfolio";

export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const DB_NAME = "unpro_portfolio";
const STORE = "drafts";
const KEY = "current";
const META_KEY = "unpro_portfolio_draft_meta_v1";

interface DbRecord { photos: Blob[]; savedAt: number }

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await openDb();
  if (!db) throw new Error("idb_unavailable");
  return new Promise<T | undefined>((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    } catch (e) { db.close(); reject(e); }
  });
}

export function isExpired(savedAt: number | undefined, now = Date.now()): boolean {
  return !savedAt || now - savedAt > DRAFT_TTL_MS;
}

export interface LoadedDraft { draft: PortfolioDraft; photos: Blob[] }

/** Enregistre le brouillon. Retourne false si les photos n'ont pas pu être gardées. */
export async function persistDraft(draft: PortfolioDraft, photos: Blob[]): Promise<boolean> {
  const savedAt = Date.now();
  try { localStorage.setItem(META_KEY, JSON.stringify({ savedAt })); } catch { /* noop */ }
  try {
    await idb("readwrite", (s) => s.put({ photos: photos.slice(0, MAX_PHOTOS), savedAt } satisfies DbRecord, KEY));
    saveDraftLocally(draft, []);
    return true;
  } catch {
    // Repli : data URL dans localStorage (peut dépasser le quota → photos non gardées).
    const urls = await Promise.all(photos.map((b) => blobToDataUrl(b))).catch(() => [] as string[]);
    return saveDraftLocally(draft, urls) && urls.length === photos.length;
  }
}

export async function loadDraft(now = Date.now()): Promise<LoadedDraft | null> {
  let savedAt: number | undefined;
  try { savedAt = JSON.parse(localStorage.getItem(META_KEY) ?? "{}").savedAt; } catch { savedAt = undefined; }
  const stored = readDraftLocally();
  if (!stored) return null;
  if (isExpired(savedAt, now)) { await clearDraft(); return null; }
  let photos: Blob[] = [];
  try {
    const rec = (await idb<DbRecord>("readonly", (s) => s.get(KEY) as IDBRequest<DbRecord>)) ?? null;
    if (rec && !isExpired(rec.savedAt, now)) photos = (rec.photos ?? []).slice(0, MAX_PHOTOS);
  } catch { /* IndexedDB indisponible */ }
  if (!photos.length && stored.photos.length) {
    photos = await Promise.all(stored.photos.map((u) => dataUrlToBlob(u))).catch(() => [] as Blob[]);
  }
  return { draft: { ...emptyDraft(), ...stored.draft }, photos };
}

export async function clearDraft(): Promise<void> {
  clearDraftLocally();
  try { localStorage.removeItem(META_KEY); } catch { /* noop */ }
  try { await idb("readwrite", (s) => s.delete(KEY)); } catch { /* noop */ }
}
