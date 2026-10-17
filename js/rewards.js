// Erfahrungspunkte, Level und Abzeichen. Alles wird aus den Daten berechnet, nichts gespeichert.
import {
  sessions, recordEvents, bodyRecordEvents, bodyLoss, sinkingWeekStreak, weekStreak,
  working, volume, dayKey,
} from './stats.js';
import { MUSCLES } from './ui.js';

export const XP = { set: 10, warmup: 2, session: 50, measure: 15, record: 50, bodyRecord: 50, badge: 100 };

export const levelNeed = L => 100 * (L - 1) * L;
export const muscleNeed = L => 25 * (L - 1) * L;
function levelOf(xp, need) {
  let L = 1;
  while (need(L + 1) <= xp) L++;
  const lo = need(L), hi = need(L + 1);
  return { level: L, xp, into: xp - lo, span: hi - lo, pct: (xp - lo) / (hi - lo) * 100, next: hi };
}

const TITLES = [[1, 'Neuling'], [3, 'Anfänger'], [5, 'Stammgast'], [8, 'Eisen'], [12, 'Stahl'], [16, 'Titan'], [20, 'Diamant'], [25, 'Legende']];
export function titleFor(level) {
  let t = TITLES[0][1];
  for (const [l, name] of TITLES) if (level >= l) t = name;
  return t;
}

/** Berechnet alles für die Motivation: Level, Muskel-Level, Abzeichen. */
export function computeRewards(data) {
  const exById = new Map(data.exercises.map(e => [e.id, e]));
  const sets = data.sets.filter(s => exById.has(s.exercise_id));
  const sess = sessions(sets, exById);
  const recs = recordEvents(sets, exById);
  const bodyRecs = bodyRecordEvents(data.body);
  const ws = working(sets);
  const days = new Set(sess.map(s => s.day));
  const totalVol = ws.reduce((a, s) => a + volume(s), 0);
  const measureDays = new Set(data.body.map(m => dayKey(m.measured_at)));
  const steps = data.steps || [];

  const badges = computeBadges({ data, exById, sess, recs, bodyRecs, ws, days, totalVol, measureDays, steps });
  const earned = badges.filter(b => b.done);

  let xp = 0;
  xp += ws.length * XP.set + (sets.length - ws.length) * XP.warmup;
  xp += sess.length * XP.session;
  xp += measureDays.size * XP.measure;
  xp += steps.reduce((a, s) => a + Math.min(15, 5 + Math.floor((s.steps || 0) / 2000) * 2), 0);
  xp += recs.length * XP.record + bodyRecs.length * XP.bodyRecord;
  xp += earned.length * XP.badge;

  const muscleXp = {};
  for (const k of Object.keys(MUSCLES)) muscleXp[k] = 0;
  for (const s of ws) { const g = exById.get(s.exercise_id).muscle_group || 'full'; muscleXp[g] = (muscleXp[g] || 0) + XP.set; }
  for (const r of recs) { const g = r.ex.muscle_group || 'full'; muscleXp[g] += XP.record / 2; }
  const muscles = Object.entries(muscleXp).map(([k, v]) => ({ key: k, ...levelOf(v, muscleNeed) }));

  const lvl = levelOf(xp, levelNeed);
  return { ...lvl, title: titleFor(lvl.level), muscles, badges, earned, records: recs, bodyRecords: bodyRecs, sessions: sess };
}

function computeBadges(c) {
  const out = [];
  const add = (id, emoji, title, desc, done, cat) => out.push({ id, emoji, title, desc, done: !!done, cat });
  const nSess = c.days.size;
  for (const n of [1, 10, 25, 50, 100, 200]) add(`train_${n}`, n === 1 ? '🎉' : n >= 100 ? '🏆' : '🔥', n === 1 ? 'Erstes Training' : `${n}. Training`, `${n} Trainingstage`, nSess >= n, 'Training');
  const t = c.totalVol / 1000;
  for (const n of [10, 50, 100, 500, 1000]) add(`tons_${n}`, n >= 500 ? '🐋' : n >= 100 ? '🐘' : '🚗', `${n} Tonnen`, `${n} t bewegt`, t >= n, 'Training');
  const streak = weekStreak(c.days);
  for (const n of [2, 4, 8, 12, 26]) add(`streak_${n}`, n >= 12 ? '⚡' : '📅', `${n} Wochen am Stück`, `${n} Wochen in Folge trainiert`, streak.best >= n, 'Training');
  for (const n of [1, 10, 50]) add(`rec_${n}`, n === 1 ? '🥇' : '🏅', n === 1 ? 'Erster Rekord' : `${n} Rekorde`, `${n} persönliche Rekorde`, c.recs.length >= n, 'Rekorde');
  for (const [k, m] of Object.entries(MUSCLES)) {
    if (k === 'cardio' || k === 'full') continue;
    add(`recmg_${k}`, m.emoji, `Rekord ${m.label}`, `Erster Rekord bei ${m.label}`, c.recs.some(r => (r.ex.muscle_group || 'full') === k), 'Rekorde');
  }
  const gymsVisited = new Set(c.sess.filter(s => s.gym_id).map(s => s.gym_id));
  add('gyms_all', '🗺️', 'Studio-Hopper', 'In allen Studios trainiert', c.data.gyms.length >= 2 && c.data.gyms.every(g => gymsVisited.has(g.id)), 'Training');
  const early = c.sess.some(s => new Date(s.startTs).getHours() < 7);
  const late = c.sess.some(s => new Date(s.endTs).getHours() >= 21);
  add('early', '🌅', 'Frühaufsteher', 'Training vor 7 Uhr', early, 'Training');
  add('late', '🌙', 'Nachteule', 'Training nach 21 Uhr', late, 'Training');
  const km = c.ws.filter(s => c.exById.get(s.exercise_id).kind === 'cardio').reduce((a, s) => a + (s.distance_km || 0), 0);
  for (const n of [10, 50, 100]) add(`km_${n}`, '🏃', `${n} km Cardio`, `${n} km auf Cardio-Geräten`, km >= n, 'Training');

  const loss = bodyLoss(c.data.body, 'weight_kg');
  for (const n of [1, 2, 3, 5, 10]) add(`loss_${n}`, n >= 5 ? '🌟' : '⚖️', `−${n} kg`, `${n} kg leichter seit Beginn (7-Tage-Schnitt)`, loss >= n - 1e-9, 'Körper');
  const fat = bodyLoss(c.data.body, 'fat_pct');
  for (const n of [1, 2, 3, 5]) add(`fat_${n}`, '🔥', `−${n} % Fett`, `${n} Prozentpunkte weniger Fett`, fat >= n - 1e-9, 'Körper');
  const sink = sinkingWeekStreak(c.data.body, 'weight_kg');
  for (const n of [4, 8, 12]) add(`sink_${n}`, '📉', `${n} Wochen leichter`, `${n} Wochen in Folge sinkender Wochenschnitt`, sink.best >= n, 'Körper');
  for (const n of [30, 100]) add(`measure_${n}`, '📏', `${n} Messtage`, `An ${n} Tagen gewogen`, c.measureDays.size >= n, 'Körper');
  add('bodyrec_1', '💎', 'Körper-Rekord', 'Erster Rekord bei Gewicht, Fett oder Muskeln', c.bodyRecs.length >= 1, 'Körper');

  const maxSteps = c.steps.reduce((a, s) => Math.max(a, s.steps || 0), 0);
  const totalSteps = c.steps.reduce((a, s) => a + (s.steps || 0), 0);
  add('steps_10k', '👟', '10 000 Schritte', 'An einem Tag 10 000 Schritte', maxSteps >= 10000, 'Schritte');
  add('steps_20k', '🥾', '20 000 Schritte', 'An einem Tag 20 000 Schritte', maxSteps >= 20000, 'Schritte');
  add('steps_1m', '🌍', 'Millionär', '1 Million Schritte gesamt', totalSteps >= 1e6, 'Schritte');
  return out;
}

