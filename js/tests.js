// Tests für die reinen Rechenfunktionen. Aufruf: tests.html im Browser öffnen.
import {
  sessions, isRecord, recordEvents, ghostCompare, comeback, prefill, rolling, bodyRecordEvents,
  weekStreak, sinkingWeekStreak, roundStep, dayKey, addDays, analyze, saunaStats,
} from './stats.js';
import { levelNeed, computeRewards } from './rewards.js';
import * as fun from './fun.js';
import { distanceM, nearestGym } from './geo.js';

const results = [];
function test(name, fn) {
  try { fn(); results.push([name, true]); } catch (e) { results.push([name, false, e.message]); }
}
function eq(a, b, msg = '') {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${msg} erwartet ${B}, erhalten ${A}`);
}
function ok(v, msg = 'Bedingung nicht erfüllt') { if (!v) throw new Error(msg); }

const at = (daysAgo, h = 18, m = 0) => { const d = addDays(new Date(), -daysAgo); d.setHours(h, m, 0, 0); return d.toISOString(); };
const ex = (id, kind = 'machine', gym = 'g1') => ({ id, kind, gym_id: gym, muscle_group: 'legs', name: id });
let n = 0;
const set = (exercise_id, performed_at, weight_kg, reps, extra = {}) => ({ id: `s${++n}`, exercise_id, performed_at, weight_kg, reps, is_warmup: false, ...extra });

test('Trainings: gleicher Tag, Lücke über 3 Stunden ergibt zwei Trainings', () => {
  const exById = new Map([['a', ex('a')]]);
  const s = sessions([set('a', at(1, 8), 50, 10), set('a', at(1, 9), 50, 10), set('a', at(1, 13), 50, 10)], exById);
  eq(s.length, 2);
  eq(s[0].sets.length, 2);
});

test('Trainings: verschiedene Studios am selben Tag sind getrennt', () => {
  const exById = new Map([['a', ex('a', 'machine', 'g1')], ['b', ex('b', 'machine', 'g2')]]);
  eq(sessions([set('a', at(1, 8), 50, 10), set('b', at(1, 8, 30), 50, 10)], exById).length, 2);
});

test('Trainings: Übung "Überall" zählt zum Studio-Training am selben Tag', () => {
  const exById = new Map([['a', ex('a', 'machine', 'g1')], ['p', ex('p', 'bodyweight', null)]]);
  const s = sessions([set('a', at(1, 8), 50, 10), set('p', at(1, 8, 20), null, 15)], exById);
  eq(s.length, 1);
  eq(s[0].gym_id, 'g1');
});

test('Dauer: erster bis letzter Satz plus 2 Minuten', () => {
  const exById = new Map([['a', ex('a')]]);
  const s = sessions([set('a', at(1, 18, 0), 50, 10), set('a', at(1, 18, 45), 50, 10)], exById);
  eq(s[0].durationMin, 47);
});

test('Rekord: allererster Tag ist kein Rekord', () => {
  const prev = [set('a', at(0, 8), 50, 10)];
  ok(!isRecord(set('a', at(0, 9), 60, 10), prev, 'machine'));
});

test('Rekord: mehr Gewicht als früher ist ein Rekord', () => {
  const prev = [set('a', at(3), 50, 10)];
  ok(isRecord(set('a', at(0), 52.5, 8), prev, 'machine'));
});

test('Rekord: gleiches Gewicht, mehr Wiederholungen ist ein Rekord', () => {
  const prev = [set('a', at(3), 50, 10)];
  ok(isRecord(set('a', at(0), 50, 11), prev, 'machine'));
  ok(!isRecord(set('a', at(0), 50, 10), prev, 'machine'), 'gleich ist kein Rekord');
});

test('Rekord: Aufwärmsätze zählen nicht', () => {
  const prev = [set('a', at(3), 50, 10), set('a', at(3), 80, 5, { is_warmup: true })];
  ok(isRecord(set('a', at(0), 60, 8), prev, 'machine'), 'Aufwärmsatz mit 80 darf nicht der Bestwert sein');
  ok(!isRecord(set('a', at(0), 90, 8, { is_warmup: true }), prev, 'machine'), 'Aufwärmsatz ist nie Rekord');
});

test('Rekord: Cardio nach Distanz', () => {
  const prev = [set('c', at(3), null, null, { distance_km: 3, duration_min: 20 })];
  ok(isRecord(set('c', at(0), null, null, { distance_km: 3.2, duration_min: 20 }), prev, 'cardio'));
});

test('Rekord-Ereignisse stimmen mit isRecord überein', () => {
  const exById = new Map([['a', ex('a')]]);
  const list = [set('a', at(10), 50, 10), set('a', at(7), 52.5, 10), set('a', at(7), 52.5, 10), set('a', at(3), 52.5, 12), set('a', at(1), 50, 15)];
  const ev = recordEvents(list, exById);
  eq(ev.map(e => [e.set.weight_kg, e.set.reps]), [[52.5, 10], [52.5, 12]]);
});

test('Geister: mehr Gewicht mit weniger Wiederholungen gilt als besser', () => {
  eq(ghostCompare({ weight_kg: 45, reps: 10 }, { weight_kg: 40, reps: 12 }, 'machine'), 1);
  eq(ghostCompare({ weight_kg: 40, reps: 10 }, { weight_kg: 40, reps: 12 }, 'machine'), -1);
  eq(ghostCompare({ weight_kg: 40, reps: 12 }, { weight_kg: 40, reps: 12 }, 'machine'), 0);
});

test('Comeback: unter 14 Tagen nichts, ab 14 Tagen −10 %, ab 28 Tagen −20 %', () => {
  eq(comeback([set('a', at(13), 50, 10)]), null);
  eq(comeback([set('a', at(14), 50, 10)]).factor, 0.9);
  eq(comeback([set('a', at(30), 50, 10)]).factor, 0.8);
});

test('Vorbelegung: Comeback rundet auf den Gewichtsschritt', () => {
  const p = prefill([set('a', at(20), 50, 10)], ex('a'));
  eq(p.weight_kg, 45);
  ok(p.comeback);
});

test('Vorbelegung: heute schon trainiert, dann kein Abschlag', () => {
  const p = prefill([set('a', at(20), 50, 10), set('a', at(0, 0, 1), 47.5, 9)], ex('a'));
  eq(p.weight_kg, 47.5);
  eq(p.comeback, undefined);
});

test('Runden auf Gewichtsschritt', () => {
  eq(roundStep(46.3, 2.5), 47.5);
  eq(roundStep(9.4, 1), 9);
});

test('7-Tage-Schnitt', () => {
  const m = [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ measured_at: at(7 - i, 7), weight_kg: 80 + i }));
  const r = rolling(m, 'weight_kg');
  eq(r[0].avg, 80);
  eq(r[6].avg, 83);
  eq(r[7].avg, 84, 'Messung von vor 7 Tagen fällt raus');
});

test('Körper-Rekord: höchstens einer pro Woche und Wert', () => {
  const m = Array.from({ length: 30 }, (_, i) => ({ measured_at: at(29 - i, 7), weight_kg: 90 - i * 0.2 }));
  const ev = bodyRecordEvents(m).filter(e => e.field === 'weight_kg');
  ok(ev.length >= 2 && ev.length <= 4, `Anzahl ${ev.length}`);
  for (let i = 1; i < ev.length; i++) ok(new Date(ev[i].t) - new Date(ev[i - 1].t) >= 7 * 86400000 - 3600000, 'Abstand unter 7 Tagen');
});

test('Wochenserie: aktuelle und beste Serie', () => {
  const days = [0, 7, 14, 35, 42].map(d => dayKey(addDays(new Date(), -d)));
  const s = weekStreak(days);
  eq(s.current, 3);
  ok(s.best >= 3);
});

test('Sinkender Wochenschnitt zählt aufeinanderfolgende Wochen', () => {
  const m = [];
  for (let w = 0; w < 5; w++) m.push({ measured_at: at(35 - w * 7, 7), weight_kg: 90 - w });
  eq(sinkingWeekStreak(m).best, 4);
});

test('Level-Grenzen', () => {
  eq(levelNeed(1), 0);
  eq(levelNeed(2), 200);
  eq(levelNeed(10), 9000);
});

test('Belohnungen: erstes Training gibt Abzeichen und Punkte', () => {
  const r = computeRewards({ gyms: [{ id: 'g1' }], exercises: [ex('a')], sets: [set('a', at(1), 50, 10)], body: [], steps: [] });
  ok(r.earned.some(b => b.id === 'train_1'));
  ok(r.xp >= 10 + 50 + 100, `XP ${r.xp}`);
});

test('Statistik: Fortschritt in Prozent', () => {
  const data = { gyms: [], exercises: [ex('a')], sets: [set('a', at(20), 50, 10), set('a', at(1), 60, 10)], checks: [], body: [], steps: [] };
  const a = analyze(data, addDays(new Date(), -30));
  eq(Math.round(a.progress[0].pct), 20);
});

test('Lustige Vergleiche liefern Text', () => {
  ok(fun.heavy(38000).includes('wie'));
  ok(fun.loss(1) === 'eine Ananas', fun.loss(1));
  ok(fun.distance(42.2) === 'ein Marathon', fun.distance(42.2));
});

test('Standort: Entfernung und nächstes Studio', () => {
  const a = { lat: 47.5, lng: 8.724 }, b = { lat: 47.501, lng: 8.724 };
  const d = distanceM(a, b);
  ok(d > 105 && d < 117, `Distanz ${d}`);
  const gyms = [{ id: 'x', ...a }, { id: 'y', lat: 47.4, lng: 8.5 }, { id: 'z', lat: null, lng: null }];
  eq(nearestGym(gyms, { lat: 47.5005, lng: 8.724, acc: 10 }).gym.id, 'x');
  eq(nearestGym(gyms, { lat: 47.52, lng: 8.724, acc: 10 }), null);
});

test('Sauna: Statistik zählt Gänge und Minuten, Training bleibt unberührt', () => {
  const sx = { id: 'sx', kind: 'sauna', gym_id: 'g1', name: 'Bio-Sauna' };
  const data = { gyms: [{ id: 'g1' }], exercises: [ex('a')], sets: [set('a', at(2), 50, 10)], saunaExercises: [sx],
    sauna: [set('sx', at(2, 20), null, null, { duration_min: 12 }), set('sx', at(2, 21), null, null, { duration_min: 10 })], body: [], steps: [], checks: [] };
  const sa = saunaStats(data, addDays(new Date(), -7));
  eq([sa.count, sa.minutes, sa.days], [2, 22, 1]);
  const r = computeRewards(data);
  ok(r.earned.some(b => b.id === 'sauna_1'), 'Abzeichen erster Saunagang');
  eq(r.sessions.length, 1, 'Sauna ist kein zusätzliches Training');
});

// Abgleich gegen simulierten Server (asynchron)
try {
  const { runSyncTests } = await import('./tests-sync.js');
  for (const [name, pass, msg] of await runSyncTests()) results.push([`Sync: ${name}`, pass, msg]);
} catch (e) { results.push(['Sync-Tests liefen durch', false, e.message]); }

const out = document.getElementById('out');
out.innerHTML = results.map(([name, pass, msg]) => `<li class="${pass ? 'ok' : 'fail'}">${pass ? '✓' : '✗'} ${name}${msg ? ` – ${msg}` : ''}</li>`).join('');
const failed = results.filter(r => !r[1]).length;
document.getElementById('sum').innerHTML = failed ? `<b class="fail">${failed} von ${results.length} Tests fehlgeschlagen</b>` : `<b class="ok">Alle ${results.length} Tests bestanden</b>`;
window.testResult = { total: results.length, failed, results };
