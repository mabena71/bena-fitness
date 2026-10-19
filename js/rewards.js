// Erfahrungspunkte, Level und Abzeichen. Alles wird aus den Daten berechnet, nichts gespeichert.
import {
  sessions, recordEvents, bodyRecordEvents, bodyLoss, sinkingWeekStreak, weekStreak,
  working, volume, dayKey, stepStats, DEFAULT_STEP_GOAL,
} from './stats.js';
import { MUSCLES, categoryOf } from './ui.js';

export const XP = { set: 10, warmup: 2, session: 50, measure: 15, record: 50, bodyRecord: 50, badge: 100, sauna: 5, stepGoal: 20 };

export const levelNeed = L => 100 * (L - 1) * L;
export const muscleNeed = L => 25 * (L - 1) * L;
function levelOf(xp, need) {
  let L = 1;
  while (need(L + 1) <= xp) L++;
  const lo = need(L), hi = need(L + 1);
  return { level: L, xp, into: xp - lo, span: hi - lo, pct: (xp - lo) / (hi - lo) * 100, next: hi };
}

// Ränge mit Stufen: innerhalb eines Rangs zählt jede Level-Stufe hoch (Anfänger I, II …).
const RANKS = [[1, 'Neuling'], [3, 'Anfänger'], [5, 'Stammgast'], [8, 'Eisen'], [12, 'Stahl'], [16, 'Titan'], [20, 'Diamant'], [25, 'Legende']];
function roman(n) {
  let out = '';
  for (const [v, r] of [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { out += r; n -= v; }
  return out;
}
/** Rang zum Level: Name, Stufe, Titel ("Anfänger II") und der nächste Rang. */
export function rankFor(level) {
  let i = 0;
  RANKS.forEach(([from], k) => { if (level >= from) i = k; });
  const [from, name] = RANKS[i];
  const sub = level - from + 1, next = RANKS[i + 1];
  return { name, sub, of: next ? next[0] - from : null, title: `${name} ${roman(sub)}`, next: next ? { name: next[1], at: next[0] } : null };
}
/** Alle Ränge mit Level-Bereich und Stufen, für die Übersicht. */
export function allRanks() {
  return RANKS.map(([from, name], i) => {
    const to = RANKS[i + 1] ? RANKS[i + 1][0] - 1 : null;
    return { name, from, to, stages: to ? Array.from({ length: to - from + 1 }, (_, k) => roman(k + 1)) : null };
  });
}
export function titleFor(level) { return rankFor(level).title; }

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
  const stepInfo = stepStats(steps, data.stepGoal || DEFAULT_STEP_GOAL);

  const badges = computeBadges({ data, exById, sess, recs, bodyRecs, ws, days, totalVol, measureDays, steps, stepInfo });
  const earned = badges.filter(b => b.done);

  let xp = 0;
  xp += ws.length * XP.set + (sets.length - ws.length) * XP.warmup;
  xp += sess.length * XP.session;
  xp += measureDays.size * XP.measure;
  xp += steps.reduce((a, s) => a + Math.min(15, 5 + Math.floor((s.steps || 0) / 2000) * 2), 0);
  xp += stepInfo.goalDays * XP.stepGoal;
  xp += recs.length * XP.record + bodyRecs.length * XP.bodyRecord;
  xp += earned.length * XP.badge;
  xp += (data.sauna || []).length * XP.sauna;

  const muscleXp = {};
  for (const k of Object.keys(MUSCLES)) muscleXp[k] = 0;
  for (const s of ws) { const g = categoryOf(exById.get(s.exercise_id).muscle_group, exById.get(s.exercise_id).name); muscleXp[g] = (muscleXp[g] || 0) + XP.set; }
  for (const r of recs) { const g = categoryOf(r.ex.muscle_group, r.ex.name); muscleXp[g] += XP.record / 2; }
  const muscles = Object.entries(muscleXp).map(([k, v]) => ({ key: k, ...levelOf(v, muscleNeed) }));

  const lvl = levelOf(xp, levelNeed);
  const near = badges.filter(b => !b.done && b.prog && b.prog[0] > 0).sort((a, b) => b.prog[0] / b.prog[1] - a.prog[0] / a.prog[1])[0] || null;
  return { ...lvl, title: titleFor(lvl.level), rank: rankFor(lvl.level), near, muscles, badges, earned, records: recs, bodyRecords: bodyRecs, sessions: sess, steps: stepInfo };
}

function computeBadges(c) {
  const out = [];
  const add = (id, icon, title, desc, done, cat, prog) => out.push({ id, icon, title, desc, done: !!done, cat, prog: prog || null });
  const nSess = c.days.size;
  for (const n of [1, 10, 25, 50, 100, 200]) add(`train_${n}`, n >= 100 ? 'trophy' : 'flame', n === 1 ? 'Erstes Training' : `${n}. Training`, n === 1 ? '1 Trainingstag' : `${n} Trainingstage`, nSess >= n, 'Training', [nSess, n]);
  const t = c.totalVol / 1000;
  for (const n of [10, 50, 100, 500, 1000]) add(`tons_${n}`, 'weight', `${n} Tonnen`, `${n} t bewegt`, t >= n, 'Training', [Math.floor(t), n]);
  const streak = weekStreak(c.days);
  for (const n of [2, 4, 8, 12, 26]) add(`streak_${n}`, n >= 12 ? 'zap' : 'calendar', `${n} Wochen am Stück`, `${n} Wochen in Folge trainiert`, streak.best >= n, 'Training', [streak.best, n]);
  for (const n of [1, 10, 50]) add(`rec_${n}`, 'award', n === 1 ? 'Erster Rekord' : `${n} Rekorde`, `${n} persönliche Rekorde`, c.recs.length >= n, 'Rekorde', [c.recs.length, n]);
  for (const [k, m] of Object.entries(MUSCLES)) {
    if (k === 'cardio' || k === 'recovery') continue;
    add(`recmg_${k}`, 'target', `Rekord ${m.label}`, `Erster Rekord bei ${m.label}`, c.recs.some(r => (categoryOf(r.ex.muscle_group, r.ex.name)) === k), 'Rekorde');
  }
  const gymsVisited = new Set(c.sess.filter(s => s.gym_id).map(s => s.gym_id));
  add('gyms_all', 'map', 'Studio-Hopper', 'In allen Studios trainiert', c.data.gyms.length >= 2 && c.data.gyms.every(g => gymsVisited.has(g.id)), 'Training');
  const early = c.sess.some(s => new Date(s.startTs).getHours() < 7);
  const late = c.sess.some(s => new Date(s.endTs).getHours() >= 21);
  add('early', 'sunrise', 'Frühaufsteher', 'Training vor 7 Uhr', early, 'Training');
  add('late', 'moon', 'Nachteule', 'Training nach 21 Uhr', late, 'Training');
  const km = c.ws.filter(s => c.exById.get(s.exercise_id).kind === 'cardio').reduce((a, s) => a + (s.distance_km || 0), 0);
  for (const n of [10, 50, 100]) add(`km_${n}`, 'route', `${n} km Cardio`, `${n} km auf Cardio-Geräten`, km >= n, 'Training', [Math.floor(km), n]);

  const loss = bodyLoss(c.data.body, 'weight_kg');
  for (const n of [1, 2, 3, 5, 10]) add(`loss_${n}`, n >= 5 ? 'star' : 'trendDown', `−${n} kg`, `${n} kg leichter seit Beginn (7-Tage-Schnitt)`, loss >= n - 1e-9, 'Körper');
  const fat = bodyLoss(c.data.body, 'fat_pct');
  for (const n of [1, 2, 3, 5]) add(`fat_${n}`, 'trendDown', `−${n} % Fett`, `${n} Prozentpunkte weniger Fett`, fat >= n - 1e-9, 'Körper');
  const sink = sinkingWeekStreak(c.data.body, 'weight_kg');
  for (const n of [4, 8, 12]) add(`sink_${n}`, 'calendar', `${n} Wochen leichter`, `${n} Wochen in Folge sinkender Wochenschnitt`, sink.best >= n, 'Körper');
  for (const n of [30, 100]) add(`measure_${n}`, 'scale', `${n} Messtage`, `An ${n} Tagen gewogen`, c.measureDays.size >= n, 'Körper', [c.measureDays.size, n]);
  add('bodyrec_1', 'gem', 'Körper-Rekord', 'Erster Rekord bei Gewicht, Fett oder Muskeln', c.bodyRecs.length >= 1, 'Körper');

  const saunaCount = (c.data.sauna || []).length;
  for (const n of [1, 10, 25, 50, 100]) add(`sauna_${n}`, 'steam', n === 1 ? 'Erster Saunagang' : `${n} Saunagänge`, n === 1 ? '1 Saunagang' : `${n} Saunagänge`, saunaCount >= n, 'Sauna', [saunaCount, n]);
  const saunaTypes = new Set((c.data.sauna || []).map(s => s.exercise_id));
  add('sauna_all', 'steam', 'Sauna-Kenner', 'Alle Saunen ausprobiert', (c.data.saunaExercises || []).length >= 2 && (c.data.saunaExercises || []).every(e => saunaTypes.has(e.id)), 'Sauna');

  const maxSteps = c.steps.reduce((a, s) => Math.max(a, s.steps || 0), 0);
  const totalSteps = c.steps.reduce((a, s) => a + (s.steps || 0), 0);
  add('steps_10k', 'steps', "10'000 Schritte", "An einem Tag 10'000 Schritte", maxSteps >= 10000, 'Schritte');
  add('steps_20k', 'steps', "20'000 Schritte", "An einem Tag 20'000 Schritte", maxSteps >= 20000, 'Schritte');
  add('steps_1m', 'globe', 'Millionär', '1 Million Schritte gesamt', totalSteps >= 1e6, 'Schritte');
  const si = c.stepInfo, goal = si.goal.toLocaleString('de-CH');
  for (const n of [3, 7, 14, 30, 60, 100]) add(`stepstreak_${n}`, n >= 30 ? 'zap' : 'flame', `${n} Tage in Folge`, `${n} Tage in Folge mindestens ${goal} Schritte`, si.best >= n, 'Schritte', [si.best, n]);
  for (const n of [10, 50, 100, 365]) add(`stepdays_${n}`, 'steps', `${n} Zieltage`, `An ${n} Tagen mindestens ${goal} Schritte`, si.goalDays >= n, 'Schritte', [si.goalDays, n]);
  add('stepweek_1', 'star', 'Perfekte Woche', `Montag bis Sonntag jeden Tag mindestens ${goal} Schritte`, si.perfectWeeks >= 1, 'Schritte');
  return out;
}

