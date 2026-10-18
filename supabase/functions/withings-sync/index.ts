// Edge Function "withings-sync": holt Gewicht, Fettanteil, Muskelmasse und Schritte von Withings.
// - stündlich von pg_cron (Header x-cron-secret): einmal pro Nacht um 4 Uhr (Zürich) für alle Verbundenen
// - POST mit Login der App: sofort für die angemeldete Person ("Jetzt holen")
// Beim Bereitstellen "Verify JWT" AUSSCHALTEN (der Cron-Aufruf hat kein Login); die Function prüft selbst.
// Secrets: WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET, CRON_SECRET, optional WITHINGS_START_DAY (Standard 2026-10-11).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CLIENT_ID = Deno.env.get('WITHINGS_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('WITHINGS_CLIENT_SECRET')!;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Feste UUID aus einem Text, damit dieselbe Messung nie doppelt angelegt wird. */
async function stableId(text: string) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = [...h].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

async function withings(path: string, params: Record<string, string>, token?: string) {
  const res = await fetch(`https://wbsapi.withings.net${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: new URLSearchParams(params),
  });
  return res.json();
}

async function freshToken(t: Record<string, any>) {
  if (Date.parse(t.expires_at) > Date.now() + 60000) return t.access_token;
  const j = await withings('/v2/oauth2', { action: 'requesttoken', grant_type: 'refresh_token', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: t.refresh_token });
  if (j.status !== 0) throw new Error(`Token erneuern fehlgeschlagen (${j.status})`);
  await db.from('withings_tokens').update({
    access_token: j.body.access_token, refresh_token: j.body.refresh_token,
    expires_at: new Date(Date.now() + (j.body.expires_in - 60) * 1000).toISOString(),
  }).eq('user_id', t.user_id);
  return j.body.access_token;
}

// Erst Werte ab diesem Tag übernehmen (Zürcher Zeit), ältere Withings-Daten bleiben draussen.
const START_DAY = Deno.env.get('WITHINGS_START_DAY') || '2026-10-11';
/** Mitternacht eines Tages (YYYY-MM-DD) in Zürich als Millisekunden – Sommer- und Winterzeit. */
function zurichMidnight(day: string) {
  const noon = new Date(`${day}T12:00:00Z`);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Zurich', timeZoneName: 'shortOffset' }).format(noon).match(/GMT([+-]\d+)/);
  return Date.parse(`${day}T00:00:00Z`) - (off ? +off[1] : 1) * 3600000;
}
const START_MS = zurichMidnight(START_DAY);

const ymd = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(d); // YYYY-MM-DD

async function syncUser(t: Record<string, any>) {
  const token = await freshToken(t);
  const now = new Date().toISOString();
  let measures = 0, stepDays = 0;

  // Körpermessungen: 1 = Gewicht (kg), 6 = Fettanteil (%), 76 = Muskelmasse (kg)
  const since = t.last_meas_update || Math.floor((Date.now() - 365 * 86400000) / 1000);
  const m = await withings('/measure', { action: 'getmeas', meastypes: '1,6,76', category: '1', lastupdate: String(since) }, token);
  if (m.status !== 0) throw new Error(`Messungen holen fehlgeschlagen (${m.status})`);
  const rows = [];
  for (const g of m.body.measuregrps || []) {
    const val = (type: number) => { const x = g.measures.find((v: any) => v.type === type); return x ? Math.round(x.value * Math.pow(10, x.unit) * 100) / 100 : null; };
    const weight = val(1), fat = val(6), muscle = val(76);
    if (weight == null && fat == null && muscle == null) continue;
    if (g.date * 1000 < START_MS) continue;
    rows.push({
      id: await stableId(`withings:${t.user_id}:${g.grpid}`), user_id: t.user_id, external_id: `withings:${g.grpid}`, source: 'withings',
      measured_at: new Date(g.date * 1000).toISOString(), weight_kg: weight, fat_pct: fat, muscle_kg: muscle,
      updated_at: now, deleted_at: g.deleted ? now : null,
    });
  }
  if (rows.length) {
    const { error } = await db.from('body_metrics').upsert(rows, { onConflict: 'id' });
    if (error) throw new Error(error.message);
    measures = rows.length;
  }

  // Schritte der letzten 14 Tage (Uhr oder Handy-App über Health Connect).
  // Die Tagessumme von Withings enthält Handy-Schritte teils erst spät; darum zusätzlich die
  // Minutenwerte von heute und gestern zusammenzählen und pro Tag den grösseren Wert nehmen.
  const perDay = new Map<string, number>();
  const take = (day: string, n: number) => { if (day >= START_DAY && n > (perDay.get(day) || 0)) perDay.set(day, n); };
  const a = await withings('/v2/measure', { action: 'getactivity', startdateymd: ymd(new Date(Math.max(START_MS, Date.now() - 14 * 86400000))), enddateymd: ymd(new Date()), data_fields: 'steps' }, token);
  if (a.status === 0) for (const act of a.body.activities || []) if (act.steps) take(act.date, act.steps);
  const debug: Record<string, unknown> = { daily: (a.body?.activities || []).map((x: any) => [x.date, x.steps, x.brand, x.is_tracker]) };
  for (const back of [1, 0]) {
    const day = ymd(new Date(Date.now() - back * 86400000));
    const from = zurichMidnight(day) / 1000;
    const i = await withings('/v2/measure', { action: 'getintradayactivity', startdate: String(from), enddate: String(Math.min(from + 86399, Math.floor(Date.now() / 1000))), data_fields: 'steps' }, token);
    if (i.status !== 0) { debug[`intra_${day}`] = `status ${i.status}`; continue; }
    let sum = 0;
    for (const v of Object.values(i.body?.series || {}) as any[]) sum += v.steps || 0;
    debug[`intra_${day}`] = sum;
    take(day, sum);
  }
  console.log('Schritte', t.user_id, JSON.stringify(debug));
  if (perDay.size) {
    const { data: existing } = await db.from('daily_steps').select('id, day').eq('user_id', t.user_id).is('deleted_at', null);
    const byDay = new Map((existing || []).map(r => [r.day, r.id]));
    const steps = [];
    for (const [day, n] of perDay) steps.push({ id: byDay.get(day) || await stableId(`withings-steps:${t.user_id}:${day}`), user_id: t.user_id, day, steps: n, source: 'withings', updated_at: now });
    const { error } = await db.from('daily_steps').upsert(steps, { onConflict: 'id' });
    if (error) throw new Error(error.message);
    stepDays = steps.length;
  }

  await db.from('withings_tokens').update({ last_meas_update: m.body.updatetime || Math.floor(Date.now() / 1000), last_sync: now, last_error: null }).eq('user_id', t.user_id);
  return { measures, stepDays };
}

async function run(t: Record<string, any>) {
  try { return await syncUser(t); }
  catch (e) {
    await db.from('withings_tokens').update({ last_error: (e as Error).message }).eq('user_id', t.user_id);
    return { error: (e as Error).message };
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Nächtlicher Lauf
  if (req.headers.get('x-cron-secret')) {
    if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'forbidden' }, 403);
    const hour = +new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', hour12: false }).format(new Date());
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* leer */ }
    if (hour !== 4 && !body.force) return json({ ok: true, skipped: true });
    const { data: all } = await db.from('withings_tokens').select('*');
    const results = [];
    for (const t of all || []) results.push(await run(t));
    return json({ ok: true, results });
  }

  // "Jetzt holen" aus der App
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u } = await db.auth.getUser(jwt);
  if (!u.user) return json({ error: 'nicht angemeldet' }, 401);
  const { data: t } = await db.from('withings_tokens').select('*').eq('user_id', u.user.id).maybeSingle();
  if (!t) return json({ error: 'Withings ist nicht verbunden.' }, 400);
  return json({ ok: true, ...(await run(t)) });
});
