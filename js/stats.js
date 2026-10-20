// Reine Rechenfunktionen ohne DOM- und Datenbankzugriff (testbar in tests.html).
import { categoryOf } from './ui.js';

export const DAY = 86400000;
export const SESSION_GAP_H = 3;
export const COMEBACK_DAYS = 14;
export const COMEBACK_HARD_DAYS = 28;

const p2 = n => String(n).padStart(2, '0');
export function dayKey(d) { d = new Date(d); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
export function monthKey(d) { d = new Date(d); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; }
export function dayFromKey(k) { const [y, m, dd] = k.split('-').map(Number); return new Date(y, m - 1, dd || 1); }
/** Montag der Woche als dayKey. */
export function weekKey(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const wd = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - wd);
  return dayKey(x);
}
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function daysBetween(a, b) {
  const x = new Date(a); x.setHours(0, 0, 0, 0);
  const y = new Date(b); y.setHours(0, 0, 0, 0);
  return Math.round((y - x) / DAY);
}

export const isWeightKind = k => k === 'machine' || k === 'free' || k === 'bodyweight';
export const volume = s => (s.weight_kg || 0) * (s.reps || 0);
export const byTime = (a, b) => (a.performed_at < b.performed_at ? -1 : a.performed_at > b.performed_at ? 1 : 0);
export const working = sets => sets.filter(s => !s.is_warmup);
const t = s => new Date(s.performed_at).getTime();

export function groupBy(arr, fn) {
  const m = new Map();
  for (const x of arr) { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return m;
}

// --- Trainings (Sessions) --------------------------------------------------
/**
 * Fasst Sätze zu Trainings zusammen: gleicher Tag, gleiches Studio,
 * und nicht mehr als 3 Stunden Pause zwischen zwei Sätzen.
 */
export function sessions(sets, exById) {
  const sorted = [...sets].sort(byTime);
  const open = new Map(); // gymKey -> aktuelle Session
  const out = [];
  for (const s of sorted) {
    const ex = exById.get(s.exercise_id);
    if (!ex) continue;
    const gk = ex.gym_id || 'anywhere';
    const cur = open.get(gk);
    const ts = t(s);
    if (cur && cur.day === dayKey(s.performed_at) && ts - cur.endTs <= SESSION_GAP_H * 3600000) {
      cur.sets.push(s); cur.endTs = ts;
    } else {
      const ns = { gym_id: ex.gym_id || null, day: dayKey(s.performed_at), startTs: ts, endTs: ts, sets: [s] };
      open.set(gk, ns); out.push(ns);
    }
  }
  // Ein Satz ohne Studio am selben Tag kurz nach einem Studio-Training zählt zu diesem Training.
  const merged = [];
  for (const s of out) {
    if (!s.gym_id) {
      const host = merged.find(m => m.gym_id && m.day === s.day && s.startTs - m.endTs <= SESSION_GAP_H * 3600000 && s.startTs >= m.startTs - SESSION_GAP_H * 3600000);
      if (host) { host.sets.push(...s.sets); host.endTs = Math.max(host.endTs, s.endTs); host.startTs = Math.min(host.startTs, s.startTs); continue; }
    }
    merged.push(s);
  }
  for (const s of merged) {
    s.sets.sort(byTime);
    s.durationMin = Math.round((s.endTs - s.startTs) / 60000) + 2;
    s.volume = s.sets.reduce((a, x) => a + (x.is_warmup ? 0 : volume(x)), 0);
    s.key = `${s.day}|${s.gym_id || 'anywhere'}|${s.startTs}`;
  }
  return merged.sort((a, b) => a.startTs - b.startTs);
}

// --- Rekorde ---------------------------------------------------------------
/** Ein Gewicht zählt erst als Rekord bzw. Bestwert, wenn es mindestens so oft gestemmt wurde. */
export const MIN_RECORD_REPS = 8;
/** Zählt dieser Arbeitssatz für Rekorde? Bei Gewichtsübungen nur ab MIN_RECORD_REPS Wiederholungen. */
export function recordable(s, kind) {
  if (s.is_warmup) return false;
  if (kind === 'cardio' || kind === 'sauna') return true;
  if (kind === 'bodyweight' && !s.weight_kg) return true;
  return (s.reps || 0) >= MIN_RECORD_REPS;
}
/** >0 wenn a besser ist als b. */
export function compareSets(a, b, kind) {
  if (kind === 'sauna') return (a.duration_min || 0) - (b.duration_min || 0);
  if (kind === 'cardio') {
    const d = (a.distance_km || 0) - (b.distance_km || 0);
    if (Math.abs(d) > 1e-9) return d;
    return (a.duration_min || 0) - (b.duration_min || 0);
  }
  if (kind === 'bodyweight' && !a.weight_kg && !b.weight_kg) return (a.reps || 0) - (b.reps || 0);
  const w = (a.weight_kg || 0) - (b.weight_kg || 0);
  if (Math.abs(w) > 1e-9) return w;
  return (a.reps || 0) - (b.reps || 0);
}

export function best(sets, kind) {
  let b = null;
  for (const s of working(sets)) if (recordable(s, kind) && (!b || compareSets(s, b, kind) > 0)) b = s;
  return b;
}

/**
 * Ist `set` ein Rekord gegenüber `previous` (alle früheren Sätze dieser Übung)?
 * Voraussetzung: Es gibt schon Sätze von einem früheren Tag (der allererste Tag setzt nur die Basis).
 */
export function isRecord(set, previous, kind) {
  if (!recordable(set, kind)) return false;
  const prev = working(previous).filter(p => p.id !== set.id && p.performed_at < set.performed_at);
  const today = dayKey(set.performed_at);
  if (!prev.some(p => dayKey(p.performed_at) < today)) return false;
  const b = best(prev, kind);
  return !!b && compareSets(set, b, kind) > 0; // der erste zählende Satz setzt nur die Basis
}

/** Alle Rekord-Ereignisse chronologisch. */
export function recordEvents(sets, exById) {
  const out = [];
  const byEx = groupBy([...sets].sort(byTime), s => s.exercise_id);
  for (const [exId, list] of byEx) {
    const ex = exById.get(exId);
    if (!ex) continue;
    let bestSoFar = null;
    let firstDay = null;
    for (const s of list) {
      if (s.is_warmup) continue;
      const d = dayKey(s.performed_at);
      if (!firstDay) firstDay = d;
      if (!recordable(s, ex.kind)) continue;
      if (bestSoFar && d > firstDay && compareSets(s, bestSoFar, ex.kind) > 0) out.push({ set: s, ex, prev: bestSoFar });
      if (!bestSoFar || compareSets(s, bestSoFar, ex.kind) > 0) bestSoFar = s;
    }
  }
  return out.sort((a, b) => byTime(a.set, b.set));
}

// --- Geister-Training & Vorbelegung --------------------------------------
/** Die Sätze des letzten Trainingstags vor `today` (dayKey). */
export function ghost(exSets, today) {
  const before = exSets.filter(s => dayKey(s.performed_at) < today);
  if (!before.length) return null;
  const lastDay = before.reduce((m, s) => (dayKey(s.performed_at) > m ? dayKey(s.performed_at) : m), '');
  return { day: lastDay, sets: before.filter(s => dayKey(s.performed_at) === lastDay).sort(byTime) };
}

/**
 * Vergleich Satz i heute vs. Satz i letztes Mal: 1 besser, 0 gleich, -1 schlechter.
 * Mehr Gewicht zählt als besser, auch mit weniger Wiederholungen (so wie beim Rekord).
 */
export function ghostCompare(cur, prev, kind) {
  if (!prev) return null;
  const c = compareSets(cur, prev, kind);
  return c > 0 ? 1 : c < 0 ? -1 : 0;
}

export function roundStep(v, step = 2.5) {
  if (v == null) return v;
  const r = Math.round(v / step) * step;
  return Math.round(r * 100) / 100;
}

export function comeback(exSets, now = new Date()) {
  const ws = working(exSets);
  if (!ws.length) return null;
  const last = ws.reduce((m, s) => (s.performed_at > m ? s.performed_at : m), '');
  const days = daysBetween(last, now);
  if (days >= COMEBACK_HARD_DAYS) return { days, factor: 0.8 };
  if (days >= COMEBACK_DAYS) return { days, factor: 0.9 };
  return null;
}

/** Vorbelegung für die nächste Eingabe. */
export function prefill(exSets, ex, now = new Date()) {
  const today = dayKey(now);
  const sorted = [...exSets].sort(byTime);
  const todays = sorted.filter(s => dayKey(s.performed_at) === today);
  // Neuer Tag: erster Satz des letzten Trainingstags (auch ein Aufwärmsatz); am gleichen Tag der letzte Arbeitssatz von heute.
  const lastDay = sorted.length ? dayKey(sorted[sorted.length - 1].performed_at) : null;
  const ref = todays.length
    ? [...todays].reverse().find(s => !s.is_warmup) || todays[todays.length - 1]
    : sorted.find(s => dayKey(s.performed_at) === lastDay);
  const step = ex.step || (ex.kind === 'free' ? 1 : 2.5);
  if (ex.kind === 'sauna') return { duration_min: ref ? ref.duration_min : 12 };
  if (!ref) {
    return ex.kind === 'cardio' ? { duration_min: 20, distance_km: null } : { weight_kg: ex.kind === 'bodyweight' ? null : 20, reps: 10 };
  }
  if (ex.kind === 'cardio') return { duration_min: ref.duration_min, distance_km: ref.distance_km };
  const out = { weight_kg: ref.weight_kg ?? null, reps: ref.reps };
  if (!todays.length && ref.is_warmup) out.is_warmup = true;
  if (!todays.length) {
    const cb = comeback(exSets, now);
    if (cb && out.weight_kg) {
      out.weight_kg = roundStep(out.weight_kg * cb.factor, step);
      out.comeback = cb;
    }
  }
  return out;
}

// --- Körper -----------------------------------------------------------------
/** Messwerte eines Felds mit gleitendem Schnitt über `days` Tage. */
export function rolling(metrics, field, days = 7) {
  const list = metrics.filter(m => m[field] != null).sort((a, b) => (a.measured_at < b.measured_at ? -1 : 1));
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const ti = new Date(list[i].measured_at).getTime();
    let sum = 0, n = 0;
    for (let j = i; j >= 0; j--) {
      const tj = new Date(list[j].measured_at).getTime();
      if (ti - tj > (days - 1) * DAY + DAY - 1) break;
      sum += list[j][field]; n++;
    }
    out.push({ t: list[i].measured_at, v: list[i][field], avg: sum / n, row: list[i] });
  }
  return out;
}

export const BODY_FIELDS = {
  weight_kg: { label: 'Gewicht', unit: 'kg', better: -1 },
  fat_pct: { label: 'Fettanteil', unit: '%', better: -1 },
  muscle_kg: { label: 'Muskelmasse', unit: 'kg', better: 1 },
  waist_cm: { label: 'Bauchumfang', unit: 'cm', better: -1 },
};

/**
 * Rekorde beim Körper: neuer Bestwert des 7-Tage-Schnitts (nach mind. 4 Messungen und 7 Tagen).
 * Höchstens ein Rekord pro Wert und Woche, sonst wäre beim stetigen Abnehmen jeder Tag ein Rekord.
 */
export const BODY_RECORD_GAP_DAYS = 7;
export function bodyRecordEvents(metrics) {
  const out = [];
  for (const field of ['weight_kg', 'fat_pct', 'muscle_kg']) {
    const dir = BODY_FIELDS[field].better;
    const r = rolling(metrics, field);
    if (r.length < 4) continue;
    const t0 = new Date(r[0].t).getTime();
    let bestAvg = null;
    let refAvg = null; // Bestwert beim letzten gemeldeten Rekord
    let lastRecTs = -Infinity;
    r.forEach((x, i) => {
      const ts = new Date(x.t).getTime();
      const enough = i >= 3 && ts - t0 >= 7 * DAY;
      if (enough && refAvg == null) refAvg = bestAvg;
      if (enough && refAvg != null && (x.avg - bestAvg) * dir > 0.0499 && ts - lastRecTs >= BODY_RECORD_GAP_DAYS * DAY - 3600000) {
        out.push({ field, t: x.t, avg: x.avg, prev: refAvg, row: x.row });
        lastRecTs = ts;
        refAvg = x.avg;
      }
      if (bestAvg == null || (x.avg - bestAvg) * dir > 0) bestAvg = x.avg;
    });
  }
  return out.sort((a, b) => (a.t < b.t ? -1 : 1));
}

/** Letzter Wert, aktueller Schnitt und Veränderung des Schnitts gegenüber vor 7 Tagen. */
export function bodyTrend(metrics, field, now = new Date()) {
  const r = rolling(metrics, field);
  if (!r.length) return null;
  const last = r[r.length - 1];
  const ref = new Date(now).getTime() - 7 * DAY;
  let before = null;
  for (const x of r) if (new Date(x.t).getTime() <= ref) before = x;
  const first = r[0];
  return {
    last: last.v, lastAt: last.t, avg: last.avg,
    delta7: before ? last.avg - before.avg : null,
    sinceStart: r.length > 1 ? last.avg - firstWeekAvg(r) : null,
    first: first.v,
  };
}
function firstWeekAvg(r) {
  const t0 = new Date(r[0].t).getTime();
  const wk = r.filter(x => new Date(x.t).getTime() - t0 < 7 * DAY);
  return wk.reduce((a, x) => a + x.v, 0) / wk.length;
}

/** Gewichtsverlust seit Beginn (positiv = abgenommen), basierend auf Wochenschnitten. */
export function bodyLoss(metrics, field) {
  const r = rolling(metrics, field);
  if (r.length < 2) return 0;
  return firstWeekAvg(r) - r[r.length - 1].avg;
}

export function weeklyAverages(metrics, field) {
  const g = groupBy(metrics.filter(m => m[field] != null), m => weekKey(m.measured_at));
  return [...g.entries()].map(([w, l]) => ({ week: w, avg: l.reduce((a, x) => a + x[field], 0) / l.length })).sort((a, b) => (a.week < b.week ? -1 : 1));
}

/** Längste Serie aufeinanderfolgender Wochen mit sinkendem Wochenschnitt. */
export function sinkingWeekStreak(metrics, field = 'weight_kg') {
  const w = weeklyAverages(metrics, field);
  let best = 0, cur = 0;
  for (let i = 1; i < w.length; i++) {
    const consecutive = daysBetween(dayFromKey(w[i - 1].week), dayFromKey(w[i].week)) === 7;
    if (consecutive && w[i].avg < w[i - 1].avg) { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  return { best, current: cur };
}

// --- Wochen-Serien ---------------------------------------------------------
/** Serie von Wochen mit mindestens einem Training. */
export function weekStreak(dayKeys, now = new Date()) {
  const weeks = new Set([...dayKeys].map(d => weekKey(dayFromKey(d))));
  const sorted = [...weeks].sort();
  let best = 0, run = 0, prev = null;
  for (const w of sorted) {
    run = prev && daysBetween(dayFromKey(prev), dayFromKey(w)) === 7 ? run + 1 : 1;
    best = Math.max(best, run); prev = w;
  }
  // aktuelle Serie: endet in dieser oder letzter Woche
  let current = 0;
  let w = weekKey(now);
  if (!weeks.has(w)) w = weekKey(addDays(now, -7));
  while (weeks.has(w)) { current++; w = weekKey(addDays(dayFromKey(w), -7)); }
  return { best, current };
}

// --- Zeiträume -------------------------------------------------------------
export const RANGES = { '4w': '4 Wochen', '3m': '3 Monate', '1y': 'Jahr', all: 'Alles' };
export function rangeStart(range, now = new Date()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  if (range === '4w') return addDays(d, -27);
  if (range === '3m') { d.setMonth(d.getMonth() - 3); return d; }
  if (range === '1y') { d.setFullYear(d.getFullYear() - 1); return d; }
  return new Date(2000, 0, 1);
}

// --- Statistik ---------------------------------------------------------------
/**
 * Hauptauswertung für den Statistik-Bildschirm.
 * data: { sets, exercises, gyms, checks }
 */
export function analyze(data, from, to = new Date()) {
  const exById = new Map(data.exercises.map(e => [e.id, e]));
  const fromIso = from.toISOString(), toIso = to.toISOString();
  const allSessions = sessions(data.sets, exById);
  const inRange = allSessions.filter(s => s.startTs >= from.getTime() && s.startTs <= to.getTime());
  const sets = data.sets.filter(s => s.performed_at >= fromIso && s.performed_at <= toIso && exById.has(s.exercise_id));
  const ws = working(sets);
  const days = new Set(inRange.map(s => s.day));

  // Häufigkeit pro Woche (alle Wochen im Zeitraum, auch leere)
  const perWeek = [];
  for (let w = dayFromKey(weekKey(from)); w <= to; w = addDays(w, 7)) {
    const k = dayKey(w);
    const ds = new Set(inRange.filter(s => weekKey(dayFromKey(s.day)) === k).map(s => s.day));
    perWeek.push({ week: k, days: ds.size, volume: inRange.filter(s => weekKey(dayFromKey(s.day)) === k).reduce((a, s) => a + s.volume, 0) });
  }
  const perGym = new Map();
  for (const s of inRange) perGym.set(s.gym_id, (perGym.get(s.gym_id) || 0) + 1);

  // Volumen pro Monat
  const perMonth = new Map();
  for (const s of inRange) { const m = s.day.slice(0, 7); perMonth.set(m, (perMonth.get(m) || 0) + s.volume); }

  // Fortschritt pro Übung (bestes Gewicht erster vs. letzter Trainingstag im Zeitraum)
  const progress = [];
  for (const [exId, list] of groupBy(ws, s => s.exercise_id)) {
    const ex = exById.get(exId);
    const metric = ex.kind === 'cardio' ? (s => s.distance_km || 0) : ex.kind === 'bodyweight' && !list.some(s => s.weight_kg) ? (s => s.reps || 0) : (s => s.weight_kg || 0);
    const byDay = groupBy(list, s => dayKey(s.performed_at));
    const dk = [...byDay.keys()].sort();
    if (dk.length < 2) continue;
    const firstV = Math.max(...byDay.get(dk[0]).map(metric));
    const lastV = Math.max(...byDay.get(dk[dk.length - 1]).map(metric));
    if (!firstV) continue;
    progress.push({ ex, first: firstV, last: lastV, pct: (lastV - firstV) / firstV * 100, days: dk.length });
  }
  progress.sort((a, b) => b.pct - a.pct);

  // Muskelgruppen
  const muscles = new Map();
  for (const s of ws) { const g = categoryOf(exById.get(s.exercise_id).muscle_group, exById.get(s.exercise_id).name); muscles.set(g, (muscles.get(g) || 0) + 1); }

  // Lieblingsübungen (Anzahl Trainingstage) und lange nicht gemacht (über alle Zeit)
  const usage = new Map();
  for (const s of ws) {
    const k = s.exercise_id;
    if (!usage.has(k)) usage.set(k, new Set());
    usage.get(k).add(dayKey(s.performed_at));
  }
  const favorites = [...usage.entries()].map(([id, d]) => ({ ex: exById.get(id), days: d.size })).sort((a, b) => b.days - a.days);
  const lastUse = new Map();
  for (const s of data.sets) if (!lastUse.has(s.exercise_id) || s.performed_at > lastUse.get(s.exercise_id)) lastUse.set(s.exercise_id, s.performed_at);
  const neglected = data.exercises.filter(e => !e.archived && lastUse.has(e.id) && daysBetween(lastUse.get(e.id), to) > 21)
    .map(e => ({ ex: e, last: lastUse.get(e.id), days: daysBetween(lastUse.get(e.id), to) })).sort((a, b) => b.days - a.days);

  // Cardio pro Woche
  const cardio = perWeek.map(w => ({ week: w.week, min: 0, km: 0 }));
  const cardioIdx = new Map(cardio.map((c, i) => [c.week, i]));
  for (const s of ws) {
    if (exById.get(s.exercise_id).kind !== 'cardio') continue;
    const i = cardioIdx.get(weekKey(s.performed_at));
    if (i == null) continue;
    cardio[i].min += s.duration_min || 0; cardio[i].km += s.distance_km || 0;
  }

  // Dauer
  const durations = inRange.map(s => ({ day: s.day, min: s.durationMin, gym_id: s.gym_id }));
  const avgDuration = durations.length ? durations.reduce((a, x) => a + x.min, 0) / durations.length : null;

  // Energie gegen Leistung
  const energy = energyVsPerformance(data, allSessions.filter(s => inRange.includes(s)), exById);

  return {
    sessions: inRange, days: days.size, setsCount: ws.length,
    volume: inRange.reduce((a, s) => a + s.volume, 0),
    perWeek, perGym, perMonth, progress, muscles, favorites, neglected, cardio,
    durations, avgDuration, energy,
  };
}

export function energyVsPerformance(data, sess, exById) {
  const avgVol = new Map();
  for (const [id, l] of groupBy(working(data.sets), s => s.exercise_id)) {
    const ex = exById.get(id);
    if (!ex || ex.kind === 'cardio') continue;
    const v = l.map(volume).filter(x => x > 0);
    if (v.length) avgVol.set(id, v.reduce((a, x) => a + x, 0) / v.length);
  }
  const checks = new Map((data.checks || []).map(c => [`${c.day}|${c.gym_id || 'anywhere'}`, c.energy]));
  const groups = { low: [], mid: [], high: [] };
  for (const s of sess) {
    const e = checks.get(`${s.day}|${s.gym_id || 'anywhere'}`);
    if (!e) continue;
    const rel = working(s.sets).filter(x => avgVol.get(x.exercise_id) && volume(x) > 0).map(x => volume(x) / avgVol.get(x.exercise_id));
    if (!rel.length) continue;
    const perf = rel.reduce((a, x) => a + x, 0) / rel.length;
    groups[e <= 2 ? 'low' : e === 3 ? 'mid' : 'high'].push(perf);
  }
  const f = l => (l.length ? { n: l.length, pct: (l.reduce((a, x) => a + x, 0) / l.length - 1) * 100 } : { n: 0, pct: null });
  return { low: f(groups.low), mid: f(groups.mid), high: f(groups.high) };
}

// --- Rückblicke -------------------------------------------------------------
export function periodSummary(data, from, to) {
  const exById = new Map(data.exercises.map(e => [e.id, e]));
  const a = analyze(data, from, to);
  const fromIso = from.toISOString(), toIso = to.toISOString();
  const records = recordEvents(data.sets, exById).filter(r => r.set.performed_at >= fromIso && r.set.performed_at <= toIso);
  const bodyIn = data.body.filter(m => m.measured_at >= fromIso && m.measured_at <= toIso);
  const bodyDelta = {};
  for (const f of ['weight_kg', 'fat_pct', 'muscle_kg']) {
    const r = rolling(data.body, f).filter(x => x.t >= fromIso && x.t <= toIso);
    bodyDelta[f] = r.length >= 2 ? r[r.length - 1].avg - r[0].avg : null;
  }
  const steps = (data.steps || []).filter(s => s.day >= dayKey(from) && s.day <= dayKey(to));
  const stepsTotal = steps.reduce((x, s) => x + (s.steps || 0), 0);
  const cardioKm = a.cardio.reduce((x, c) => x + c.km, 0);
  const cardioMin = a.cardio.reduce((x, c) => x + c.min, 0);
  // bester Monat (nach Trainingstagen)
  const monthDays = new Map();
  for (const s of a.sessions) { const m = s.day.slice(0, 7); if (!monthDays.has(m)) monthDays.set(m, new Set()); monthDays.get(m).add(s.day); }
  let bestMonth = null;
  for (const [m, d] of monthDays) if (!bestMonth || d.size > bestMonth.days) bestMonth = { month: m, days: d.size };
  const biggestRecord = records.length ? [...records].sort((x, y) => relGain(y) - relGain(x))[0] : null;
  const sauna = saunaStats(data, from, to);
  return {
    ...a, records, bodyIn, bodyDelta, sauna, stepsTotal, stepsDays: steps.length, cardioKm, cardioMin, bestMonth, biggestRecord,
    topProgress: a.progress[0] || null, favorite: a.favorites[0] || null,
  };
}
function relGain(r) {
  const k = r.ex.kind;
  if (k === 'cardio') return ((r.set.distance_km || 0) - (r.prev.distance_km || 0)) / (r.prev.distance_km || 1);
  if (r.set.weight_kg && r.prev.weight_kg) return (r.set.weight_kg - r.prev.weight_kg) / r.prev.weight_kg;
  return ((r.set.reps || 0) - (r.prev.reps || 0)) / (r.prev.reps || 1) / 4;
}

export function monthRange(y, m) { return [new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59, 999)]; }
export function yearRange(y) { return [new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59, 999)]; }

// --- Paar-Challenge ------------------------------------------------------------
/**
 * Wertet eine Woche aus. a und b: { training_days, steps, weight_change_pct }.
 * Mehr Trainingstage und Schritte gewinnen, beim Gewicht gewinnt die stärkere Abnahme in %.
 * Ergebnis: { cats: [{key, label, winner: 'a'|'b'|null}], a, b, winner: 'a'|'b'|null }
 */
export function challengeScore(a, b) {
  const cmp = (x, y, higherWins = true) => {
    if (x == null || y == null) return null;
    const d = higherWins ? x - y : y - x;
    return Math.abs(d) < 1e-9 ? null : d > 0 ? 'a' : 'b';
  };
  const cats = [
    { key: 'days', label: 'Trainingstage', winner: cmp(a.training_days, b.training_days) },
    { key: 'steps', label: 'Schritte', winner: (a.steps || b.steps) ? cmp(+a.steps || 0, +b.steps || 0) : null },
    { key: 'weight', label: 'Gewicht (%)', winner: cmp(a.weight_change_pct == null ? null : +a.weight_change_pct, b.weight_change_pct == null ? null : +b.weight_change_pct, false) },
  ];
  const pa = cats.filter(c => c.winner === 'a').length;
  const pb = cats.filter(c => c.winner === 'b').length;
  return { cats, a: pa, b: pb, winner: pa > pb ? 'a' : pb > pa ? 'b' : null };
}

// --- Sauna -------------------------------------------------------------------
/** Saunagänge im Zeitraum: Anzahl, Minuten, Saunatage, pro Woche und pro Sauna-Art. */
export function saunaStats(data, from, to = new Date()) {
  const exById = new Map((data.saunaExercises || []).map(e => [e.id, e]));
  const fromIso = from.toISOString(), toIso = to.toISOString();
  const list = (data.sauna || []).filter(s => exById.has(s.exercise_id) && s.performed_at >= fromIso && s.performed_at <= toIso);
  const perWeek = [];
  for (let w = dayFromKey(weekKey(from)); w <= to; w = addDays(w, 7)) {
    const k = dayKey(w);
    const inWeek = list.filter(s => weekKey(s.performed_at) === k);
    perWeek.push({ week: k, count: inWeek.length, min: inWeek.reduce((a, s) => a + (s.duration_min || 0), 0) });
  }
  const byType = [...groupBy(list, s => s.exercise_id).entries()]
    .map(([id, l]) => ({ ex: exById.get(id), count: l.length, min: l.reduce((a, s) => a + (s.duration_min || 0), 0) }))
    .sort((a, b) => b.count - a.count);
  const minutes = list.reduce((a, s) => a + (s.duration_min || 0), 0);
  return { count: list.length, minutes, days: new Set(list.map(s => dayKey(s.performed_at))).size, avg: list.length ? minutes / list.length : null, perWeek, byType };
}

export const DEFAULT_STEP_GOAL = 10000;

/**
 * Schritte-Ziel: Serie (Tage in Folge am Ziel), beste Serie, bester Tag, Zieltage,
 * perfekte Wochen (Mo–So alle am Ziel) und die aktuelle Woche für die Startseite.
 * Heute zählt mit, sobald das Ziel erreicht ist; vorher reisst die Serie noch nicht ab.
 */
export function stepStats(steps, goal = DEFAULT_STEP_GOAL, now = new Date()) {
  const byDay = new Map();
  for (const s of steps || []) if (s.day) byDay.set(s.day, Math.max(byDay.get(s.day) || 0, s.steps || 0));
  const today = dayKey(now);
  const hit = k => (byDay.get(k) || 0) >= goal;
  const todaySteps = byDay.get(today) || 0;
  const todayDone = todaySteps >= goal;

  let current = 0;
  for (let d = addDays(dayFromKey(today), -1); hit(dayKey(d)); d = addDays(d, -1)) current++;
  if (todayDone) current++;

  const goalDays = [...byDay.keys()].filter(k => k <= today && hit(k)).sort();
  let best = 0, run = 0, prev = null;
  for (const k of goalDays) {
    run = prev && dayKey(addDays(dayFromKey(prev), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }

  let bestDay = null;
  for (const [day, n] of byDay) if (n > 0 && (!bestDay || n > bestDay.steps)) bestDay = { day, steps: n };

  // Abgeschlossene Wochen, in denen jeder Tag am Ziel war
  const thisWeek = weekKey(now);
  const weeks = new Map();
  for (const k of goalDays) { const w = weekKey(dayFromKey(k)); if (w < thisWeek) weeks.set(w, (weeks.get(w) || 0) + 1); }
  const perfectWeeks = [...weeks.values()].filter(n => n === 7).length;

  const monday = dayFromKey(thisWeek);
  const week = Array.from({ length: 7 }, (_, i) => {
    const k = dayKey(addDays(monday, i));
    const n = byDay.get(k) || 0;
    return { day: k, steps: n, state: k > today ? 'future' : n >= goal ? 'done' : k === today ? 'open' : n > 0 ? 'missed' : 'empty' };
  });

  return { goal, today: todaySteps, todayDone, remaining: Math.max(0, goal - todaySteps), current, best, bestDay, goalDays: goalDays.length, perfectWeeks, week };
}
