// Export aller Daten als eine Excel-Datei mit je einem Blatt für Trainings, Körper und Schritte.
import * as db from './db.js';
import { snapshot, gymName } from './data.js';
import { KINDS, MUSCLES, FEEL, categoryOf } from './ui.js';
import { byTime } from './stats.js';

const date = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const time = iso => new Date(iso).toTimeString().slice(0, 5);

/** Trainings inkl. Saunagänge (die snapshot() für die Statistik herausfiltert). */
export function setsTable() {
  const ex = new Map(db.all('exercises').map(e => [e.id, e]));
  const rows = db.all('sets').filter(s => ex.has(s.exercise_id)).sort(byTime).map(s => {
    const e = ex.get(s.exercise_id);
    return [date(s.performed_at), time(s.performed_at), gymName(e.gym_id), e.name, KINDS[e.kind]?.label, MUSCLES[categoryOf(e.muscle_group, e.name)]?.label,
      s.weight_kg, s.reps, s.duration_min, s.distance_km, FEEL[s.feel] || '', s.is_warmup ? 'ja' : '', s.note || ''];
  });
  return [['Datum', 'Zeit', 'Studio', 'Übung', 'Art', 'Kategorie', 'Gewicht kg', 'Wiederholungen', 'Minuten', 'km', 'Gefühl', 'Aufwärmen', 'Notiz'], ...rows];
}

export function bodyTable() {
  const rows = [...snapshot().body].sort((a, b) => (a.measured_at < b.measured_at ? -1 : 1))
    .map(m => [date(m.measured_at), time(m.measured_at), m.weight_kg, m.fat_pct, m.muscle_kg, m.waist_cm, m.source === 'withings' ? 'Withings' : 'von Hand']);
  return [['Datum', 'Zeit', 'Gewicht kg', 'Fett %', 'Muskeln kg', 'Bauch cm', 'Quelle'], ...rows];
}

export function stepsTable() {
  const rows = [...snapshot().steps].sort((a, b) => (a.day < b.day ? -1 : 1)).map(s => [s.day, s.steps, s.source === 'withings' ? 'Withings' : 'von Hand']);
  return [['Datum', 'Schritte', 'Quelle'], ...rows];
}

const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function loadXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = XLSX_URL;
    s.onload = () => (window.XLSX ? res(window.XLSX) : rej(new Error('Excel-Werkzeug fehlt')));
    s.onerror = () => rej(new Error('Excel-Werkzeug konnte nicht geladen werden (ohne Netz?)'));
    document.head.appendChild(s);
  });
}

/** Alle Daten als Excel-Datei (.xlsx), ein Blatt pro Bereich. */
export async function allDataXlsx() {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of [['Trainings', setsTable()], ['Körper', bodyTable()], ['Schritte', stepsTable()]]) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map((h, i) => ({ wch: Math.min(40, Math.max(h.length, ...rows.slice(1, 200).map(r => String(r[i] ?? '').length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
