// Zugriff auf die Daten in der Form, die Statistik und Belohnungen erwarten,
// plus die Erkennung neuer Level und Abzeichen nach einer Änderung.
import * as db from './db.js';
import { computeRewards } from './rewards.js';
import { toast, confetti, vibrate, esc } from './ui.js';

export function snapshot() {
  return {
    gyms: db.all('gyms').sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    exercises: db.all('exercises'),
    sets: db.all('sets'),
    checks: db.all('day_checks'),
    body: db.all('body_metrics'),
    steps: db.all('daily_steps'),
  };
}

export function profile() {
  return db.all('profiles')[0] || { display_name: '', avatar_emoji: '💪', settings: {} };
}
export async function saveProfile(p) {
  const cur = db.all('profiles')[0];
  return db.put('profiles', { ...(cur || {}), ...p, id: cur ? cur.id : db.currentUser() });
}

export function gymName(id) {
  if (!id) return 'Überall';
  const g = db.get('gyms', id);
  return g ? g.name : '–';
}

export function exerciseSets(exId) {
  return db.all('sets').filter(s => s.exercise_id === exId);
}

let rewardCache = null;
export function rewards() {
  if (!rewardCache) rewardCache = computeRewards(snapshot());
  return rewardCache;
}
db.onChange(() => { rewardCache = null; });

/** Merkt sich den aktuellen Stand (beim Start), ohne Meldungen. */
export async function primeRewards() {
  const r = rewards();
  const seen = await db.getMeta('seenBadges', null);
  if (seen == null) {
    await db.setMeta('seenBadges', r.earned.map(b => b.id));
    await db.setMeta('lastLevel', r.level);
  }
}

/** Nach einer Änderung aufrufen: meldet neue Abzeichen und Level-Aufstiege. */
export async function announceRewards() {
  const r = rewards();
  const seen = new Set(await db.getMeta('seenBadges', []));
  const fresh = r.earned.filter(b => !seen.has(b.id));
  const lastLevel = await db.getMeta('lastLevel', r.level);
  let delay = 0;
  if (r.level > lastLevel) {
    setTimeout(() => {
      confetti(); vibrate([60, 40, 60]);
      toast(`⬆️ Level ${r.level}! Du bist jetzt <b>${esc(r.title)}</b>`, 'level', 4200);
    }, delay);
    delay += 900;
  }
  for (const b of fresh) {
    setTimeout(() => toast(`${b.emoji} Neues Abzeichen: <b>${esc(b.title)}</b>`, 'badge-t', 3600), delay);
    delay += 900;
  }
  if (fresh.length) await db.setMeta('seenBadges', [...seen, ...fresh.map(b => b.id)]);
  if (r.level !== lastLevel) await db.setMeta('lastLevel', r.level);
}
