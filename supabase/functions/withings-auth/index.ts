// Edge Function "withings-auth": Withings mit dem eigenen Konto verbinden (OAuth 2).
// POST {action:"start"} mit Login der App  → liefert die Withings-Anmeldeadresse
// GET  ?code=…&state=…  (Rückleitung von Withings) → speichert die Tokens, leitet zur App zurück
// Beim Bereitstellen "Verify JWT" AUSSCHALTEN (die Rückleitung von Withings hat kein Login);
// der POST prüft das Login selbst.
// Secrets: WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET, WITHINGS_REDIRECT_URI (= Adresse dieser Function),
//          APP_URL (z. B. https://mabena71.github.io/bena-fitness/)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CLIENT_ID = Deno.env.get('WITHINGS_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('WITHINGS_CLIENT_SECRET')!;
const REDIRECT = Deno.env.get('WITHINGS_REDIRECT_URI')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://mabena71.github.io/bena-fitness/';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function userFrom(req: Request) {
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  return data.user || null;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);

  // Rückleitung von Withings
  if (req.method === 'GET' && url.searchParams.get('state')) {
    const back = (status: string) => Response.redirect(`${APP_URL}#/settings?withings=${status}`, 302);
    const state = url.searchParams.get('state')!;
    const code = url.searchParams.get('code');
    const { data: st } = await db.from('withings_states').select('*').eq('state', state).maybeSingle();
    await db.from('withings_states').delete().eq('state', state);
    if (!st || !code || Date.now() - Date.parse(st.created_at) > 15 * 60000) return back('abgelaufen');
    const res = await fetch('https://wbsapi.withings.net/v2/oauth2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'requesttoken', grant_type: 'authorization_code', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: REDIRECT }),
    });
    const j = await res.json();
    if (j.status !== 0) { console.warn('withings token', j); return back('fehler'); }
    const b = j.body;
    await db.from('withings_tokens').upsert({
      user_id: st.user_id, withings_userid: String(b.userid), access_token: b.access_token, refresh_token: b.refresh_token,
      expires_at: new Date(Date.now() + (b.expires_in - 60) * 1000).toISOString(), scope: b.scope, last_error: null,
    });
    return back('ok');
  }

  if (req.method === 'POST') {
    const user = await userFrom(req);
    if (!user) return new Response(JSON.stringify({ error: 'nicht angemeldet' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
    const state = crypto.randomUUID().replace(/-/g, '');
    await db.from('withings_states').insert({ state, user_id: user.id });
    const auth = new URL('https://account.withings.com/oauth2_user/authorize2');
    auth.search = new URLSearchParams({ response_type: 'code', client_id: CLIENT_ID, scope: 'user.metrics,user.activity', redirect_uri: REDIRECT, state }).toString();
    return new Response(JSON.stringify({ url: auth.toString() }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  return new Response('not found', { status: 404, headers: cors });
});
