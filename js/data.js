// Zugriff auf die Daten in der Form, die Statistik und Belohnungen erwarten,
// plus die Erkennung neuer Level und Abzeichen nach einer Änderung.
import * as db from './db.js';
import { computeRewards } from './rewards.js';
import { DEFAULT_STEP_GOAL } from './stats.js';
import { toast, confetti, vibrate, esc, MUSCLES, categoryOf } from './ui.js';
import { icon } from './icons.js';

/**
 * Daten für Statistik und Belohnungen. Saunagänge sind getrennt (sauna, saunaExercises),
 * damit sie nicht als Training, Volumen oder Rekord zählen.
 */
export function snapshot() {
  const allEx = db.all('exercises');
  const saunaIds = new Set(allEx.filter(e => e.kind === 'sauna').map(e => e.id));
  const allSets = db.all('sets');
  return {
    gyms: db.all('gyms').sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    exercises: allEx.filter(e => e.kind !== 'sauna'),
    sets: allSets.filter(s => !saunaIds.has(s.exercise_id)),
    saunaExercises: allEx.filter(e => e.kind === 'sauna'),
    sauna: allSets.filter(s => saunaIds.has(s.exercise_id)),
    checks: db.all('day_checks'),
    body: db.all('body_metrics'),
    steps: db.all('daily_steps'),
    stepGoal: stepGoal(),
  };
}

export function profile() {
  return db.all('profiles')[0] || { display_name: '', avatar_emoji: '', settings: {} };
}
/** Persönliches Schritte-Ziel (Standard 10 000). */
export function stepGoal() {
  const g = +profile().settings?.stepGoal;
  return g >= 1000 ? g : DEFAULT_STEP_GOAL;
}
export async function saveProfile(p) {
  const cur = db.all('profiles')[0];
  return db.put('profiles', { ...(cur || {}), ...p, id: cur ? cur.id : db.currentUser() });
}

/** Vorschläge für Sauna-Arten beim Anlegen des eigenen Studios (frei erweiterbar). */
export const SAUNA_SUGGESTIONS = ['Bio-Sauna', 'Dampfbad', 'Finnische Sauna'];

/** Baut Studio und Sauna-Geräte aus der Eingabe: Namen getrimmt, ohne Leere und Doppelte. */
export function studioRecords(name, saunas = [], sort = 0) {
  const gym = { id: db.uuid(), name: String(name || '').trim(), sort, lat: null, lng: null };
  const seen = new Set();
  const rows = [];
  for (const raw of saunas) {
    const n = String(raw || '').trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    rows.push({ id: db.uuid(), gym_id: gym.id, name: n, kind: 'sauna', muscle_group: 'recovery', photo_path: null, notes: '', settings: [], sort_order: null, archived: false });
  }
  return { gym, rows };
}

/** Legt ein Studio samt Saunen an. */
export async function createStudio(name, saunas = []) {
  const { gym, rows } = studioRecords(name, saunas, db.all('gyms').length);
  await db.put('gyms', gym);
  if (rows.length) await db.bulkPut('exercises', rows);
  return gym;
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

/** Die zuletzt erhaltenen Abzeichen (mit Datum, sonst in Listenreihenfolge). */
export async function latestBadges(n = 3) {
  const dates = await db.getMeta('badgeDates', {});
  return [...rewards().earned].map((b, i) => ({ b, k: dates[b.id] || `0-${String(i).padStart(4, '0')}` }))
    .sort((x, y) => (x.k < y.k ? 1 : -1)).slice(0, n).map(x => x.b);
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
      toast(`${icon('trendUp')} Level ${r.level} erreicht: <b>${esc(r.title)}</b>`, 'level', 4200);
    }, delay);
    delay += 900;
  }
  for (const b of fresh) {
    setTimeout(() => toast(`${icon(b.icon)} Neues Abzeichen: <b>${esc(b.title)}</b>`, 'badge-t', 3600), delay);
    delay += 900;
  }
  if (fresh.length) {
    await db.setMeta('seenBadges', [...seen, ...fresh.map(b => b.id)]);
    const dates = await db.getMeta('badgeDates', {});
    for (const b of fresh) dates[b.id] = new Date().toISOString();
    await db.setMeta('badgeDates', dates);
  }
  if (r.level !== lastLevel) await db.setMeta('lastLevel', r.level);
}

/**
 * Einmalige Umstellung alter Muskelgruppen auf Push/Pull/Legs. Läuft bei jedem Start,
 * ändert aber nur Geräte mit alten Werten (wird danach normal synchronisiert).
 * Neu entstehende Abzeichen (z. B. "Rekord Push") werden still als gesehen markiert.
 */
export async function migrateCategories() {
  const old = db.all('exercises').filter(e => e.muscle_group && !MUSCLES[e.muscle_group]);
  if (!old.length) return 0;
  for (const e of old) await db.put('exercises', { id: e.id, muscle_group: categoryOf(e.muscle_group, e.name) }, { silent: true });
  rewardCache = null;
  const seen = new Set(await db.getMeta('seenBadges', []));
  rewards().earned.forEach(b => seen.add(b.id));
  await db.setMeta('seenBadges', [...seen]);
  return old.length;
}
