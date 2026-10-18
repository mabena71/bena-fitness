// Beispieldaten für den Demo-Modus: ca. 10 Wochen Training in drei Studios plus Körperwerte.
import * as db from './db.js';
import { addDays, dayKey } from './stats.js';

export const DEFAULT_GYMS = ['Bellevue', 'Archhöfe', 'Win4'];
/** Erhöhen, wenn sich die Demo-Daten ändern: bestehende Demos werden dann neu erzeugt. */
export const DEMO_VERSION = 2;
export const WIN4_SAUNAS = ['Bio-Sauna', 'Dampfbad', 'Hot-Sauna'];

/** Legt die drei Saunen im Win4 einmalig an (auch bei bestehenden Tagebüchern). */
export async function ensureDefaultSaunas() {
  if (await db.getMeta('saunasSeeded')) return;
  const win = db.all('gyms').find(g => g.name.trim().toLowerCase() === 'win4');
  if (!win) return;
  const existing = new Set(db.all('exercises').filter(e => e.gym_id === win.id).map(e => e.name.toLowerCase()));
  const rows = WIN4_SAUNAS.filter(n => !existing.has(n.toLowerCase()))
    .map(name => ({ id: db.uuid(), gym_id: win.id, name, kind: 'sauna', muscle_group: 'recovery', photo_path: null, notes: '', settings: [], sort_order: null, archived: false }));
  if (rows.length) await db.bulkPut('exercises', rows);
  await db.setMeta('saunasSeeded', true);
}

/** Legt für einen neuen Benutzer die drei Studios an (falls noch keine existieren). */
export async function ensureDefaultGyms() {
  if (db.all('gyms').length) return;
  await db.bulkPut('gyms', DEFAULT_GYMS.map((name, i) => ({ id: db.uuid(), name, sort: i, lat: null, lng: null })));
}

function rng(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

export async function seedDemo() {
  const R = rng(42);
  const gyms = DEFAULT_GYMS.map((name, i) => ({ id: db.uuid(), name, sort: i, lat: null, lng: null }));
  const [bel, arc, win] = gyms;
  const E = (gym, name, kind, muscle, start, inc, settings = [], extra = {}) => ({
    id: db.uuid(), gym_id: gym ? gym.id : null, name, kind, muscle_group: muscle, photo_path: null,
    notes: extra.notes || '', settings, sort_order: extra.sort ?? null, archived: false, step: extra.step,
    _start: start, _inc: inc, _reps: extra.reps || 12,
  });
  const exercises = [
    E(bel, 'Beinpresse', 'machine', 'legs', 70, 12, [{ label: 'Sitz', value: '5' }, { label: 'Lehne', value: '3' }], { sort: 1 }),
    E(bel, 'Latzug', 'machine', 'back', 40, 6, [{ label: 'Knie-Polster', value: '4' }], { sort: 2 }),
    E(bel, 'Brustpresse', 'machine', 'chest', 35, 6, [{ label: 'Sitz', value: '6' }], { sort: 3 }),
    E(bel, 'Rudern sitzend', 'machine', 'back', 40, 5, [{ label: 'Brustpolster', value: '2' }], { sort: 4 }),
    E(bel, 'Schulterpresse', 'machine', 'shoulders', 20, 4, [{ label: 'Sitz', value: '4' }], { sort: 5 }),
    E(bel, 'Bauchmaschine', 'machine', 'core', 25, 4, [], { sort: 6, reps: 15 }),
    E(bel, 'Laufband', 'cardio', 'cardio', 15, 0, [], { sort: 7 }),
    E(arc, 'Beinstrecker', 'machine', 'legs', 30, 5, [{ label: 'Rückenlehne', value: '7' }]),
    E(arc, 'Beinbeuger', 'machine', 'legs', 25, 4, [{ label: 'Polster', value: 'M' }]),
    E(arc, 'Kurzhantel Bankdrücken', 'free', 'chest', 14, 3, [], { step: 1, reps: 10, notes: 'Kurzhanteln stehen hinten rechts' }),
    E(arc, 'Kabelzug Trizeps', 'machine', 'arms', 15, 3, []),
    E(arc, 'Bizeps-Curls', 'free', 'arms', 8, 2, [], { step: 1 }),
    E(arc, 'Ruderergometer', 'cardio', 'cardio', 10, 0, []),
    E(win, 'Beinpresse', 'machine', 'legs', 60, 10, [{ label: 'Sitz', value: '3' }], { notes: 'Gewichte anders als im Bellevue' }),
    E(win, 'Latzug', 'machine', 'back', 35, 5, []),
    E(win, 'Rückenstrecker', 'machine', 'back', 30, 4, [], { reps: 15 }),
    E(win, 'Crosstrainer', 'cardio', 'cardio', 20, 0, []),
    E(win, 'Bio-Sauna', 'sauna', 'recovery', 0, 0, []),
    E(win, 'Dampfbad', 'sauna', 'recovery', 0, 0, []),
    E(win, 'Hot-Sauna', 'sauna', 'recovery', 0, 0, []),
    E(null, 'Liegestütze', 'bodyweight', 'chest', 0, 0, [], { reps: 15 }),
    E(null, 'Klimmzüge', 'bodyweight', 'back', 0, 0, [], { reps: 4 }),
  ];
  const byGym = g => exercises.filter(e => e.gym_id === (g ? g.id : null));

  const now = new Date();
  const start = addDays(now, -72);
  const sets = [];
  const checks = [];
  let dayIdx = 0;
  for (let d = new Date(start); d <= now; d = addDays(d, 1)) {
    dayIdx++;
    const wd = d.getDay();
    // Pause (Ferien) vor ca. 5 Wochen: 16 Tage ohne Training
    const daysAgo = Math.round((now - d) / 86400000);
    if (daysAgo <= 52 && daysAgo >= 37) continue;
    const trainDay = (wd === 2 || wd === 4 || wd === 6) && R() < 0.85;
    if (!trainDay || daysAgo === 0) continue;
    const gym = wd === 2 ? bel : wd === 4 ? (R() < 0.6 ? arc : bel) : win;
    const t0 = new Date(d); t0.setHours(wd === 6 ? 10 : 18, Math.floor(R() * 40), 0, 0);
    if (R() < 0.08) t0.setHours(6, 30);
    let ts = t0.getTime();
    const energy = 1 + Math.min(4, Math.floor(R() * 5.5));
    if (R() < 0.8) checks.push({ id: db.uuid(), day: dayKey(t0), gym_id: gym.id, energy });
    const perf = 0.94 + energy * 0.025;
    const progress = Math.min(1, dayIdx / 72);
    const list = [...byGym(gym)].filter(e => e.kind !== 'sauna').sort(() => R() - 0.5).slice(0, 5 + Math.floor(R() * 2));
    if (R() < 0.3) list.push(exercises.find(e => e.name === 'Liegestütze'));
    list.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
    for (const ex of list) {
      const step = ex.step || (ex.kind === 'free' ? 1 : 2.5);
      if (ex.kind === 'cardio') {
        const min = ex._start + Math.round(R() * 10);
        sets.push({ id: db.uuid(), exercise_id: ex.id, performed_at: new Date(ts).toISOString(), duration_min: min, distance_km: Math.round(min * (0.13 + progress * 0.03 + R() * 0.02) * 100) / 100, feel: 2, is_warmup: false });
        ts += (min + 3) * 60000;
        continue;
      }
      if (ex.kind === 'bodyweight') {
        const reps = Math.round(ex._reps * (0.8 + progress * 0.5) * perf);
        for (let i = 0; i < 3; i++) { sets.push({ id: db.uuid(), exercise_id: ex.id, performed_at: new Date(ts).toISOString(), weight_kg: null, reps: Math.max(1, reps - i), feel: i === 2 ? 3 : 2, is_warmup: false }); ts += 150000; }
        continue;
      }
      const w = Math.round((ex._start + ex._inc * progress) * perf / step) * step;
      if (R() < 0.4) { sets.push({ id: db.uuid(), exercise_id: ex.id, performed_at: new Date(ts).toISOString(), weight_kg: Math.round(w * 0.6 / step) * step, reps: 15, feel: 1, is_warmup: true }); ts += 120000; }
      const n = 3;
      for (let i = 0; i < n; i++) {
        const reps = Math.max(6, ex._reps - i - (R() < 0.3 ? 1 : 0));
        sets.push({ id: db.uuid(), exercise_id: ex.id, performed_at: new Date(ts).toISOString(), weight_kg: w, reps, feel: i === n - 1 ? 3 : (R() < 0.3 ? 1 : 2), is_warmup: false, note: R() < 0.04 ? 'Schulter etwas gespürt' : '' });
        ts += (100 + R() * 60) * 1000;
      }
      ts += 120000;
    }
    if (gym === win && R() < 0.75) {
      ts += 15 * 60000;
      const saunas = exercises.filter(e => e.kind === 'sauna');
      const n = 2 + Math.floor(R() * 2);
      for (let i = 0; i < n; i++) {
        const sx = saunas[Math.floor(R() * saunas.length)];
        const min = sx.name === 'Dampfbad' ? 10 + Math.floor(R() * 6) : 8 + Math.floor(R() * 8);
        sets.push({ id: db.uuid(), exercise_id: sx.id, performed_at: new Date(ts).toISOString(), duration_min: min, weight_kg: null, reps: null, is_warmup: false, feel: null });
        ts += (min + 15) * 60000;
      }
    }
  }

  // Körper: Gewicht von ~86 auf ~82.8 mit Schwankungen, Fett 25 → 23
  const body = [];
  const steps = [];
  for (let d = new Date(addDays(now, -80)); d <= now; d = addDays(d, 1)) {
    const k = (d - addDays(now, -80)) / (80 * 86400000);
    if (R() < 0.82) {
      const t = new Date(d); t.setHours(7, Math.floor(R() * 30));
      const w = 86 - 3.2 * k + Math.sin(k * 20) * 0.3 + (R() - 0.5) * 0.8;
      const fat = 25 - 2.1 * k + (R() - 0.5) * 0.6;
      const muscle = 34.5 + 0.6 * k + (R() - 0.5) * 0.3;
      body.push({ id: db.uuid(), measured_at: t.toISOString(), weight_kg: Math.round(w * 10) / 10, fat_pct: Math.round(fat * 10) / 10, muscle_kg: Math.round(muscle * 10) / 10, waist_cm: R() < 0.1 ? Math.round(98 - 4 * k) : null, source: 'manual' });
    }
    if (R() < 0.9) steps.push({ id: db.uuid(), day: dayKey(d), steps: Math.round(5000 + R() * 7000 + (d.getDay() === 0 ? 4000 : 0)), source: 'manual' });
  }

  for (const e of exercises) { delete e._start; delete e._inc; delete e._reps; }
  await db.bulkPut('gyms', gyms);
  // neutrale Studio-Abzeichen (keine fremden Logos)
  const badgeColors = { Bellevue: ['#1e3a8a', '#3b82f6'], 'Archhöfe': ['#0f172a', '#22d3ee'], Win4: ['#334155', '#60a5fa'] };
  for (const g of gyms) {
    const blob = await studioBadge(g.name, ...(badgeColors[g.name] || ['#0f172a', '#3b82f6']));
    if (!blob) continue;
    await db.putPhoto(`gym-${g.id}`, blob);
    g.photo_path = `demo/gym-${g.id}.jpg`;
  }
  await db.bulkPut('gyms', gyms);
  await db.bulkPut('profiles', [{ id: 'demo', display_name: 'Alex', avatar_emoji: '', settings: {} }]);
  await db.bulkPut('exercises', exercises);
  await db.bulkPut('sets', sets);
  await db.bulkPut('day_checks', checks);
  await db.bulkPut('body_metrics', body);
  await db.bulkPut('daily_steps', steps);
  await db.setMeta('saunasSeeded', true);
}

/** Schlichtes Studio-Abzeichen als Bild (Verlauf + Kürzel), nur für die Demo. */
function studioBadge(name, c1, c2) {
  try {
    const c = document.createElement('canvas');
    c.width = 600; c.height = 340;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 600, 340);
    grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    g.fillStyle = grad; g.fillRect(0, 0, 600, 340);
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.beginPath(); g.arc(520, 60, 160, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.font = '700 120px "IBM Plex Sans", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const short = name === 'Win4' ? 'W4' : name.slice(0, 2).toUpperCase();
    g.fillText(short, 300, 150);
    g.font = '500 44px "IBM Plex Sans", system-ui, sans-serif';
    g.fillText(name, 300, 255);
    return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', 0.88));
  } catch { return Promise.resolve(null); }
}
