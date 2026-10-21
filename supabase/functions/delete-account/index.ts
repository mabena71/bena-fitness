// Edge Function "delete-account": eigenes Konto mit allen Daten endgültig löschen (Store-Pflicht).
// POST {confirm:"LÖSCHEN"} mit Login der App → löscht Fotos (photos/<uid>/…), alle Zeilen der
// Person in allen Tabellen (inkl. Withings-Tokens) und zuletzt das Konto in auth.users.
// Die Function prüft das Login selbst; "Verify JWT" darf wie bei den anderen AUS sein.
// Braucht keine eigenen Secrets: SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase
// in jeder Function automatisch bereit (nie in eine Datei oder ins Frontend kopieren).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const BUCKET = 'photos';
// Tabellen mit Spalte user_id (Reihenfolge egal, es gibt keine Fremdschlüssel untereinander)
const USER_TABLES = [
  'sets', 'exercises', 'day_checks', 'gyms', 'body_metrics', 'daily_steps', 'profiles',
  'push_subscriptions', 'notify_log', 'withings_tokens', 'withings_states', 'partner_invites',
];
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function userFrom(req: Request) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  return data.user || null;
}

/** Alle Dateipfade unter einem Ordner (auch Unterordner). */
async function listFiles(prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`Fotos auflisten: ${error.message}`);
    for (const f of data || []) {
      const path = `${prefix}/${f.name}`;
      if (f.id) out.push(path); else out.push(...await listFiles(path)); // id null = Ordner
    }
    if (!data || data.length < 1000) return out;
  }
}

// Fehlt eine Tabelle (z. B. Skript noch nicht eingespielt), ist das kein Grund abzubrechen
const missing = (e: { code?: string; message?: string }) => e.code === '42P01' || /does not exist|schema cache/i.test(e.message || '');

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'nur POST' }, 405);
  const user = await userFrom(req);
  if (!user) return json({ error: 'nicht angemeldet' }, 401);
  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* leer */ }
  if (body.confirm !== 'LÖSCHEN') return json({ error: 'Bestätigung fehlt' }, 400);
  const uid = user.id;

  try {
    // 1. Fotos
    const files = await listFiles(uid);
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await db.storage.from(BUCKET).remove(files.slice(i, i + 100));
      if (error) throw new Error(`Fotos löschen: ${error.message}`);
    }
    // 2. Daten in allen Tabellen
    for (const t of USER_TABLES) {
      const { error } = await db.from(t).delete().eq('user_id', uid);
      if (error && !missing(error)) throw new Error(`${t}: ${error.message}`);
    }
    const p = await db.from('partnerships').delete().or(`user_a.eq.${uid},user_b.eq.${uid}`);
    if (p.error && !missing(p.error)) throw new Error(`partnerships: ${p.error.message}`);
    // eigene Einladungen weg; wo die Person selbst eingeladen wurde, bleibt der Code ohne Verweis
    const inv = await db.from('invites').delete().eq('created_by', uid);
    if (inv.error && !missing(inv.error)) throw new Error(`invites: ${inv.error.message}`);
    // 3. Konto (was noch übrig wäre, löscht "on delete cascade")
    const { error } = await db.auth.admin.deleteUser(uid);
    if (error) throw new Error(`Konto: ${error.message}`);
    console.log('Konto gelöscht', uid, `${files.length} Fotos`);
    return json({ ok: true, photos: files.length });
  } catch (e) {
    console.error('delete-account', uid, e);
    return json({ error: (e as Error).message }, 500);
  }
});
