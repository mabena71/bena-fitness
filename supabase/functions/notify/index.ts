// Edge Function "notify": Wochenbilanz am Sonntag 19 Uhr und Erinnerungen um 18 Uhr (Zeit Zürich).
// Wird stündlich von pg_cron aufgerufen (Header x-cron-secret). Der Zeitpunkt wird hier geprüft,
// damit Sommer-/Winterzeit automatisch stimmen.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (z. B. mailto:…), CRON_SECRET.
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase automatisch bereit.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') || 'mailto:noreply@example.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
const TZ = 'Europe/Zurich';
const DAY = 86400000;

function zurichParts(d = new Date()) {
  const f = new Intl.DateTimeFormat('de-CH', { timeZone: TZ, weekday: 'short', hour: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { weekday: p.weekday, hour: +p.hour, date: `${p.year}-${p.month}-${p.day}` };
}
function weekStartOf(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const wd = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wd);
  return d.toISOString().slice(0, 10);
}
const addDays = (s: string, n: number) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const localDate = (iso: string) => zurichParts(new Date(iso)).date;
const fmt1 = (v: number) => new Intl.NumberFormat('de-CH', { maximumFractionDigits: 1 }).format(v);

async function sendTo(userId: string, payload: Record<string, unknown>) {
  const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', userId);
  let sent = 0;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id); // Abo abgelaufen
      else console.warn('push', code, (e as Error).message);
    }
  }
  return sent;
}

async function once(userId: string, kind: string, ref: string) {
  const { error } = await db.from('notify_log').insert({ user_id: userId, kind, ref });
  return !error; // false = schon gesendet (Primärschlüssel verletzt)
}

/** Kennzahlen einer Woche: Trainingstage (ohne Sauna/Aufwärmen), Schritte, Saunagänge, Gewichtsveränderung. */
async function weekMetrics(userId: string, weekStart: string) {
  const from = new Date(addDays(weekStart, -1) + 'T00:00:00Z').toISOString();
  const to = new Date(addDays(weekStart, 8) + 'T00:00:00Z').toISOString();
  const { data: ex } = await db.from('exercises').select('id, kind').eq('user_id', userId);
  const sauna = new Set((ex || []).filter(e => e.kind === 'sauna').map(e => e.id));
  const { data: sets } = await db.from('sets').select('exercise_id, performed_at, is_warmup').eq('user_id', userId).is('deleted_at', null).gte('performed_at', from).lt('performed_at', to);
  const inWeek = (sets || []).filter(s => { const d = localDate(s.performed_at); return d >= weekStart && d < addDays(weekStart, 7); });
  const days = new Set(inWeek.filter(s => !sauna.has(s.exercise_id) && !s.is_warmup).map(s => localDate(s.performed_at))).size;
  const saunaCount = inWeek.filter(s => sauna.has(s.exercise_id)).length;
  const { data: steps } = await db.from('daily_steps').select('steps').eq('user_id', userId).is('deleted_at', null).gte('day', weekStart).lt('day', addDays(weekStart, 7));
  const stepSum = (steps || []).reduce((a, s) => a + (s.steps || 0), 0);
  const avg = async (a: string, b: string) => {
    const { data } = await db.from('body_metrics').select('weight_kg, measured_at').eq('user_id', userId).is('deleted_at', null).not('weight_kg', 'is', null)
      .gte('measured_at', new Date(addDays(a, -1) + 'T00:00:00Z').toISOString()).lt('measured_at', new Date(addDays(b, 1) + 'T00:00:00Z').toISOString());
    const l = (data || []).filter(m => { const d = localDate(m.measured_at); return d >= a && d < b; }).map(m => +m.weight_kg);
    return l.length ? l.reduce((x, y) => x + y, 0) / l.length : null;
  };
  const cur = await avg(weekStart, addDays(weekStart, 7));
  const prev = await avg(addDays(weekStart, -7), weekStart);
  return { days, stepSum, saunaCount, weightDelta: cur != null && prev != null ? cur - prev : null, weightPct: cur != null && prev ? (cur - prev) / prev * 100 : null };
}

async function partnerOf(userId: string) {
  const { data } = await db.from('partnerships').select('*').or(`user_a.eq.${userId},user_b.eq.${userId}`).limit(1);
  const p = data?.[0];
  return p ? (p.user_a === userId ? p.user_b : p.user_a) : null;
}

function crown(a: Awaited<ReturnType<typeof weekMetrics>>, b: Awaited<ReturnType<typeof weekMetrics>>) {
  let pa = 0, pb = 0;
  if (a.days !== b.days) a.days > b.days ? pa++ : pb++;
  if ((a.stepSum || b.stepSum) && a.stepSum !== b.stepSum) a.stepSum > b.stepSum ? pa++ : pb++;
  if (a.weightPct != null && b.weightPct != null && Math.abs(a.weightPct - b.weightPct) > 1e-9) a.weightPct < b.weightPct ? pa++ : pb++;
  return pa > pb ? 'a' : pb > pa ? 'b' : null;
}

async function settingsOf(userId: string) {
  const { data } = await db.from('profiles').select('display_name, settings').eq('id', userId).maybeSingle();
  const s = (data?.settings || {}) as Record<string, unknown>;
  return { name: data?.display_name || '', weekly: s.pushWeekly !== false, reminders: s.pushReminders !== false };
}

async function weekly(today: string) {
  const weekStart = weekStartOf(today);
  const { data: users } = await db.from('push_subscriptions').select('user_id');
  let n = 0;
  for (const userId of [...new Set((users || []).map(u => u.user_id))]) {
    const cfg = await settingsOf(userId);
    if (!cfg.weekly || !(await once(userId, 'weekly', weekStart))) continue;
    const m = await weekMetrics(userId, weekStart);
    const parts = [`${m.days} ${m.days === 1 ? 'Training' : 'Trainings'}`];
    if (m.weightDelta != null) parts.push(`${m.weightDelta > 0 ? '+' : '−'}${fmt1(Math.abs(m.weightDelta))} kg`);
    if (m.stepSum) parts.push(`${new Intl.NumberFormat('de-CH').format(m.stepSum)} Schritte`);
    if (m.saunaCount) parts.push(`${m.saunaCount} Saunagänge`);
    const partner = await partnerOf(userId);
    if (partner) {
      const pm = await weekMetrics(partner, weekStart);
      const w = crown(m, pm);
      const pName = (await settingsOf(partner)).name || 'Partner';
      parts.push(w === 'a' ? 'Krone an dich!' : w === 'b' ? `Krone an ${pName}` : 'Challenge unentschieden');
    }
    n += await sendTo(userId, { title: 'Deine Woche', body: parts.join(' · '), tag: 'weekly', url: './#/rewards' });
  }
  return n;
}

async function reminders(today: string) {
  const { data: users } = await db.from('push_subscriptions').select('user_id');
  let n = 0;
  for (const userId of [...new Set((users || []).map(u => u.user_id))]) {
    const cfg = await settingsOf(userId);
    if (!cfg.reminders) continue;
    const { data: ex } = await db.from('exercises').select('id').eq('user_id', userId).neq('kind', 'sauna');
    const ids = (ex || []).map(e => e.id);
    if (ids.length) {
      const { data: last } = await db.from('sets').select('performed_at').eq('user_id', userId).is('deleted_at', null).in('exercise_id', ids).order('performed_at', { ascending: false }).limit(1);
      if (last?.[0]) {
        const days = Math.floor((Date.now() - Date.parse(last[0].performed_at)) / DAY);
        if (days >= 5 && await once(userId, 'no-training', localDate(last[0].performed_at))) {
          n += await sendTo(userId, { title: 'Zeit fürs Studio?', body: `Dein letztes Training ist ${days} Tage her.`, tag: 'reminder-training', url: './' });
        }
      }
    }
    const { data: lastM } = await db.from('body_metrics').select('measured_at').eq('user_id', userId).is('deleted_at', null).order('measured_at', { ascending: false }).limit(1);
    if (lastM?.[0]) {
      const days = Math.floor((Date.now() - Date.parse(lastM[0].measured_at)) / DAY);
      if (days >= 7 && await once(userId, 'no-weight', localDate(lastM[0].measured_at))) {
        n += await sendTo(userId, { title: 'Wieder einmal wiegen?', body: `Deine letzte Messung ist ${days} Tage her.`, tag: 'reminder-weight', url: './#/body' });
      }
    }
  }
  return n;
}

Deno.serve(async req => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* leer */ }
  const now = zurichParts();
  const force = body.force as string | undefined; // zum Testen: {"force":"weekly"} oder {"force":"reminders"}
  const out: Record<string, number> = {};
  if (force === 'weekly' || (now.weekday.startsWith('So') && now.hour === 19)) out.weekly = await weekly(now.date);
  if (force === 'reminders' || now.hour === 18) out.reminders = await reminders(now.date);
  return Response.json({ ok: true, at: now, ...out });
});
