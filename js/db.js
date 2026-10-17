// Lokale Datenbank: alle Daten liegen im Speicher und werden in IndexedDB gespiegelt.
// Jede Änderung landet zusätzlich in der "outbox", die später (Etappe 3) zu Supabase hochgeladen wird.

export const TABLES = ['gyms', 'exercises', 'sets', 'day_checks', 'body_metrics', 'daily_steps', 'profiles'];
const EXTRA = ['outbox', 'photos', 'meta'];

let idb = null;
let dbName = null;
let userId = 'local';
const mem = {};
const listeners = new Set();
const photoUrls = new Map();

function req(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function open(name, uid) {
  if (idb) idb.close();
  dbName = name;
  userId = uid;
  photoUrls.forEach(u => URL.revokeObjectURL(u));
  photoUrls.clear();
  const r = indexedDB.open(name, 1);
  r.onupgradeneeded = () => {
    const d = r.result;
    for (const t of [...TABLES, ...EXTRA]) {
      if (!d.objectStoreNames.contains(t)) d.createObjectStore(t, { keyPath: t === 'meta' || t === 'outbox' || t === 'photos' ? 'key' : 'id' });
    }
  };
  idb = await req(r);
  for (const t of TABLES) {
    const rows = await req(idb.transaction(t).objectStore(t).getAll());
    mem[t] = new Map(rows.map(x => [x.id, x]));
  }
}

export function currentDbName() { return dbName; }
export function currentUser() { return userId; }

export async function deleteDatabase(name) {
  if (dbName === name && idb) { idb.close(); idb = null; }
  await req(indexedDB.deleteDatabase(name));
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(table, row) { listeners.forEach(fn => { try { fn(table, row); } catch (e) { console.error(e); } }); }

/** Alle nicht gelöschten Zeilen einer Tabelle. */
export function all(table) {
  const out = [];
  for (const r of mem[table].values()) if (!r.deleted_at) out.push(r);
  return out;
}
export function get(table, id) {
  const r = mem[table].get(id);
  return r && !r.deleted_at ? r : null;
}

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/** Legt an oder ändert (Merge mit bestehender Zeile). Gibt die gespeicherte Zeile zurück. */
export async function put(table, data, { silent = false, keepTimestamps = false } = {}) {
  const now = new Date().toISOString();
  const prev = data.id ? mem[table].get(data.id) : null;
  const row = { ...(prev || {}), ...data };
  if (!row.id) row.id = uuid();
  if (!row.user_id) row.user_id = userId;
  if (!row.created_at) row.created_at = now;
  if (!keepTimestamps || !row.updated_at) row.updated_at = now;
  mem[table].set(row.id, row);
  const tx = idb.transaction([table, 'outbox'], 'readwrite');
  tx.objectStore(table).put(row);
  tx.objectStore('outbox').put({ key: `${table}:${row.id}`, table, id: row.id, at: now });
  await txDone(tx);
  if (!silent) emit(table, row);
  return row;
}

/** Mehrere Zeilen auf einmal (für Demo-Daten und Importe). */
export async function bulkPut(table, rows) {
  const now = new Date().toISOString();
  const tx = idb.transaction([table, 'outbox'], 'readwrite');
  const st = tx.objectStore(table);
  const ob = tx.objectStore('outbox');
  for (const data of rows) {
    const row = { created_at: now, updated_at: now, user_id: userId, ...data };
    if (!row.id) row.id = uuid();
    mem[table].set(row.id, row);
    st.put(row);
    ob.put({ key: `${table}:${row.id}`, table, id: row.id, at: now });
  }
  await txDone(tx);
  emit(table, null);
}

export async function remove(table, id) {
  return put(table, { id, deleted_at: new Date().toISOString() });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// --- Outbox ---------------------------------------------------------------
export async function outbox() { return req(idb.transaction('outbox').objectStore('outbox').getAll()); }
export async function pendingCount() { return req(idb.transaction('outbox').objectStore('outbox').count()); }
export async function clearOutbox(keys) {
  const tx = idb.transaction('outbox', 'readwrite');
  keys.forEach(k => tx.objectStore('outbox').delete(k));
  await txDone(tx);
}
/** Für Supabase-Sync: Zeile vom Server übernehmen, ohne sie erneut in die Outbox zu legen. */
export async function applyRemote(table, row) {
  const local = mem[table].get(row.id);
  if (local && local.updated_at > row.updated_at) return false;
  mem[table].set(row.id, row);
  const tx = idb.transaction(table, 'readwrite');
  tx.objectStore(table).put(row);
  await txDone(tx);
  return true;
}
export function rawRow(table, id) { return mem[table].get(id) || null; }

// --- Meta (Schlüssel/Wert) -----------------------------------------------
const metaCache = new Map();
export async function getMeta(key, fallback = null) {
  if (metaCache.has(key)) return metaCache.get(key);
  const r = await req(idb.transaction('meta').objectStore('meta').get(key));
  const v = r ? r.value : fallback;
  metaCache.set(key, v);
  return v;
}
export async function setMeta(key, value) {
  metaCache.set(key, value);
  const tx = idb.transaction('meta', 'readwrite');
  tx.objectStore('meta').put({ key, value });
  await txDone(tx);
}
export function clearMetaCache() { metaCache.clear(); }

// --- Fotos ---------------------------------------------------------------
export async function putPhoto(key, blob) {
  const tx = idb.transaction(['photos', 'outbox'], 'readwrite');
  tx.objectStore('photos').put({ key, blob, at: new Date().toISOString() });
  tx.objectStore('outbox').put({ key: `photo:${key}`, table: 'photo', id: key, at: new Date().toISOString() });
  await txDone(tx);
  if (photoUrls.has(key)) URL.revokeObjectURL(photoUrls.get(key));
  photoUrls.set(key, URL.createObjectURL(blob));
}
export async function getPhotoBlob(key) {
  const r = await req(idb.transaction('photos').objectStore('photos').get(key));
  return r ? r.blob : null;
}
/** Liefert eine Objekt-URL für das Foto oder null. */
export async function photoUrl(key) {
  if (!key) return null;
  if (photoUrls.has(key)) return photoUrls.get(key);
  const blob = await getPhotoBlob(key);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  photoUrls.set(key, u);
  return u;
}
export async function savePhotoFromRemote(key, blob) {
  const tx = idb.transaction('photos', 'readwrite');
  tx.objectStore('photos').put({ key, blob, at: new Date().toISOString() });
  await txDone(tx);
}
