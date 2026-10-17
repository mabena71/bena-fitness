// CSV-Export für Excel (Semikolon als Trennzeichen, UTF-8 mit BOM für Umlaute).
import { snapshot, gymName } from './data.js';
import { KINDS, MUSCLES, FEEL } from './ui.js';
import { byTime } from './stats.js';

function cell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function table(header, rows) {
  return '﻿' + [header, ...rows].map(r => r.map(cell).join(';')).join('\r\n');
}
const date = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const time = iso => new Date(iso).toTimeString().slice(0, 5);

export function setsCsv() {
  const d = snapshot();
  const ex = new Map(d.exercises.map(e => [e.id, e]));
  const rows = d.sets.filter(s => ex.has(s.exercise_id)).sort(byTime).map(s => {
    const e = ex.get(s.exercise_id);
    return [date(s.performed_at), time(s.performed_at), gymName(e.gym_id), e.name, KINDS[e.kind]?.label, MUSCLES[e.muscle_group]?.label,
      s.weight_kg, s.reps, s.duration_min, s.distance_km, FEEL[s.feel] || '', s.is_warmup ? 'ja' : '', s.note || ''];
  });
  return table(['Datum', 'Zeit', 'Studio', 'Übung', 'Art', 'Muskelgruppe', 'Gewicht kg', 'Wiederholungen', 'Minuten', 'km', 'Gefühl', 'Aufwärmen', 'Notiz'], rows);
}

export function bodyCsv() {
  const d = snapshot();
  const rows = [...d.body].sort((a, b) => (a.measured_at < b.measured_at ? -1 : 1))
    .map(m => [date(m.measured_at), time(m.measured_at), m.weight_kg, m.fat_pct, m.muscle_kg, m.waist_cm, m.source === 'withings' ? 'Withings' : 'von Hand']);
  return table(['Datum', 'Zeit', 'Gewicht kg', 'Fett %', 'Muskeln kg', 'Bauch cm', 'Quelle'], rows);
}

export function stepsCsv() {
  const d = snapshot();
  const rows = [...d.steps].sort((a, b) => (a.day < b.day ? -1 : 1)).map(s => [s.day, s.steps, s.source === 'withings' ? 'Withings' : 'von Hand']);
  return table(['Datum', 'Schritte', 'Quelle'], rows);
}
