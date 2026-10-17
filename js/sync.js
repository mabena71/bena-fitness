// Etappe 3: Login und Abgleich mit Supabase.
// Prinzip: Alles wird zuerst lokal gespeichert (db.js), Änderungen landen in der Outbox.
// sync() lädt die Outbox hoch (upsert) und holt danach alles, was andere Geräte seit dem
// letzten Abruf geschrieben haben (synced_at > letzter Stand). Bei Konflikten gewinnt die
// jüngere Änderung (updated_at).
import * as db from './db.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, cloudConfigured } from './config.js';

const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const BUCKET = 'photos';

// Spalten, die in Supabase existieren (alles andere bleibt lokal)
const COLUMNS = {
  gyms: ['name', 'sort', 'lat', 'lng', 'geo_acc', 'photo_path'],
  exercises: ['gym_id', 'name', 'kind', 'muscle_group', 'photo_path', 'notes', 'settings', 'step', 'sort_order', 'archived'],
  sets: ['exercise_id', 'performed_at', 'weight_kg', 'reps', 'duration_min', 'distance_km', 'feel', 'is_warmup', 'note'],
  day_checks: ['day', 'gym_id', 'energy'],
  body_metrics: ['measured_at', 'weight_kg', 'fat_pct', 'muscle_kg', 'waist_cm', 'source', 'external_id'],
  daily_steps: ['day', 'steps', 'source'],
  profiles: ['display_name', 'avatar_emoji', 'settings'],
};
const COMMON = ['id', 'user_id', 'created_at', 'updated_at', 'deleted_at'];

let client = null;
let running = null;
let timer = null;
const listeners = new Set();
export const status = { state: 'idle', lastSync: null, error: null, pending: 0 };

export function onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function setStatus(patch) { Object.assign(status, patch); listeners.forEach(fn => { try { fn(status); } catch (e) { console.error(e); } }); }

/** Nur für Tests: simulierten Server einsetzen. */
export function __setClient(c) { client = c; }

export async function getClient() {
  if (client) return client;
  if (!cloudConfigured()) throw new Error('Supabase ist noch nicht eingerichtet.');
  if (!client) {
    const { createClient } = await import(SUPABASE_ESM);
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bena-fitness-auth' } });
  }
  return client;
}

export async function currentSession() {
  if (!cloudConfigured() && !client) return null;
  const c = await getClient();
  const { data } = await c.auth.getSession();
  return data.session || null;
}

export async function signIn(email, password) {
  const c = await getClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-Mail oder Passwort stimmt nicht.' : error.message);
  return data.session;
}

export async function signOut() {
  stopAutoSync();
  if (!client) return;
  await client.auth.signOut();
}

function toRemote(table, row, uid) {
  const out = {};
  for (const k of [...COMMON, ...COLUMNS[table]]) if (k in row) out[k] = row[k] === undefined ? null : row[k];
  out.user_id = uid;
  if (table === 'profiles') out.id = uid;
  if (out.photo_path) out.photo_path = out.photo_path.replace(/^[^/]+\//, `${uid}/`);
  return out;
}

async function push(c, uid) {
  const entries = await db.outbox();
  if (!entries.length) return 0;
  const done = [];
  // Zeilen tabellenweise in Blöcken hochladen
  for (const table of db.TABLES) {
    const list = entries.filter(e => e.table === table);
    for (let i = 0; i < list.length; i += 200) {
      const chunk = list.slice(i, i + 200);
      const rows = chunk.map(e => db.rawRow(table, e.id)).filter(Boolean).map(r => toRemote(table, r, uid));
      if (rows.length) {
        const { error } = await c.from(table).upsert(rows, { onConflict: 'id' });
        if (error) throw new Error(`${table}: ${error.message}`);
      }
      done.push(...chunk);
    }
  }
  // Fotos
  for (const e of entries.filter(x => x.table === 'photo')) {
    const blob = await db.getPhotoBlob(e.id);
    if (blob) {
      const { error } = await c.storage.from(BUCKET).upload(`${uid}/${e.id}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw new Error(`Foto: ${error.message}`);
    }
    done.push(e);
  }
  // Nur Einträge entfernen, die seit dem Lesen nicht erneut geändert wurden
  const now = new Map((await db.outbox()).map(e => [e.key, e.at]));
  await db.clearOutbox(done.filter(e => now.get(e.key) === e.at).map(e => e.key));
  return done.length;
}

async function pull(c) {
  let changed = 0;
  for (const table of db.TABLES) {
    let since = await db.getMeta(`pull:${table}`, '1970-01-01T00:00:00Z');
    for (;;) {
      const { data, error } = await c.from(table).select('*').gt('synced_at', since).order('synced_at', { ascending: true }).limit(1000);
      if (error) throw new Error(`${table}: ${error.message}`);
      if (!data.length) break;
      for (const r of data) {
        const { synced_at, ...row } = r;
        // Zeitstempel ins gleiche Format wie lokal bringen (ISO mit Z), damit Vergleiche stimmen
        for (const k of ['created_at', 'updated_at', 'deleted_at', 'performed_at', 'measured_at']) if (row[k]) row[k] = new Date(row[k]).toISOString();
        if (await db.applyRemote(table, row)) changed++;
        since = synced_at;
      }
      await db.setMeta(`pull:${table}`, since);
      if (data.length < 1000) break;
    }
  }
  // Fehlende Fotos nachladen
  for (const table of ['gyms', 'exercises']) {
    for (const row of db.all(table)) {
      if (!row.photo_path) continue;
      const key = table === 'gyms' ? `gym-${row.id}` : row.id;
      if (await db.getPhotoBlob(key)) continue;
      const { data, error } = await c.storage.from(BUCKET).download(row.photo_path);
      if (!error && data) await db.savePhotoFromRemote(key, data);
    }
  }
  return changed;
}

/** Ein Abgleich. Mehrere gleichzeitige Aufrufe teilen sich denselben Lauf. */
export function sync() {
  if (running) return running;
  running = (async () => {
    try {
      // innerhalb von try, damit "running" im finally immer zurückgesetzt wird
      if (!navigator.onLine) { setStatus({ state: 'offline', pending: await db.pendingCount() }); return { offline: true }; }
      setStatus({ state: 'syncing', error: null });
      const c = await getClient();
      const session = await currentSession();
      if (!session) throw new Error('Nicht angemeldet.');
      const pushed = await push(c, session.user.id);
      const pulled = await pull(c);
      if (pulled) db.notifyRemote();
      await db.setMeta('initialPullDone', true);
      setStatus({ state: 'ok', lastSync: new Date().toISOString(), pending: await db.pendingCount() });
      return { pushed, pulled };
    } catch (e) {
      console.warn('Sync:', e);
      setStatus({ state: 'error', error: e.message, pending: await db.pendingCount() });
      return { error: e.message };
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Automatischer Abgleich: beim Start, bei Netz, nach Änderungen (verzögert) und alle 2 Minuten. */
export function startAutoSync() {
  stopAutoSync();
  const soon = () => { clearTimeout(timer); timer = setTimeout(() => sync(), 3000); };
  const unsub = db.onChange(t => { if (t !== 'remote') soon(); });
  const onOnline = () => sync();
  const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  const iv = setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 120000);
  stopAutoSync.fn = () => { unsub(); clearTimeout(timer); clearInterval(iv); window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisible); };
  sync();
}
export function stopAutoSync() { if (stopAutoSync.fn) { stopAutoSync.fn(); stopAutoSync.fn = null; } }

/** Datenbank-Funktion aufrufen (Paar-Challenge usw.). */
export async function rpc(name, args = {}) {
  const c = await getClient();
  const { data, error } = await c.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

/** Edge Function aufrufen (Withings, Push). */
export async function callFunction(name, body = {}) {
  const c = await getClient();
  const { data, error } = await c.functions.invoke(name, { body });
  if (error) throw new Error(error.message || 'Fehler beim Aufruf');
  return data;
}
