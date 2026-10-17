// Kleine Helfer für Oberfläche, Formatierung und Konstanten.

export const KINDS = {
  machine: { label: 'Gerät', icon: 'machine' },
  free: { label: 'Freie Gewichte', icon: 'dumbbell' },
  bodyweight: { label: 'Eigengewicht', icon: 'person' },
  cardio: { label: 'Cardio', icon: 'activity' },
  sauna: { label: 'Sauna', icon: 'steam' },
};

export const MUSCLES = {
  legs: { label: 'Beine' },
  back: { label: 'Rücken' },
  chest: { label: 'Brust' },
  shoulders: { label: 'Schultern' },
  arms: { label: 'Arme' },
  core: { label: 'Bauch' },
  full: { label: 'Ganzkörper' },
  cardio: { label: 'Ausdauer' },
  recovery: { label: 'Erholung' },
};

export const FEEL = { 1: 'leicht', 2: 'passend', 3: 'schwer' };
export const ENERGY = { 1: 'sehr müde', 2: 'müde', 3: 'normal', 4: 'fit', 5: 'top' };

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const nf1 = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 });
export const n1 = v => (v == null || isNaN(v) ? '–' : nf1.format(v));
export const n0 = v => (v == null || isNaN(v) ? '–' : nf0.format(v));
export const n2 = v => (v == null || isNaN(v) ? '–' : nf2.format(v));
export function signed(v, digits = 1) {
  if (v == null || isNaN(v)) return '–';
  const s = digits === 0 ? nf0.format(Math.abs(v)) : nf1.format(Math.abs(v));
  if (Math.abs(v) < (digits === 0 ? 0.5 : 0.05)) return '±0';
  return (v > 0 ? '+' : '−') + s;
}
export function tons(kg) {
  if (kg >= 1000) return `${n1(kg / 1000)} t`;
  return `${n0(kg)} kg`;
}

/** Text für einen Satz je nach Übungsart. */
export function setText(s, kind) {
  if (kind === 'sauna') return `${n0(s.duration_min)} Min.`;
  if (kind === 'cardio') {
    const parts = [];
    if (s.duration_min) parts.push(`${n0(s.duration_min)} Min.`);
    if (s.distance_km) parts.push(`${n2(s.distance_km)} km`);
    return parts.join(' · ') || '–';
  }
  if (kind === 'bodyweight' && !s.weight_kg) return `${n0(s.reps)} Wdh.`;
  return `${n1(s.weight_kg)} kg × ${n0(s.reps)}`;
}

const dfDay = new Intl.DateTimeFormat('de-CH', { weekday: 'short', day: 'numeric', month: 'short' });
const dfDayY = new Intl.DateTimeFormat('de-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const dfTime = new Intl.DateTimeFormat('de-CH', { hour: '2-digit', minute: '2-digit' });
const dfMonth = new Intl.DateTimeFormat('de-CH', { month: 'long', year: 'numeric' });
const dfMonthShort = new Intl.DateTimeFormat('de-CH', { month: 'short' });
export function fmtDay(d) {
  d = new Date(d);
  return (d.getFullYear() === new Date().getFullYear() ? dfDay : dfDayY).format(d);
}
export const fmtTime = d => dfTime.format(new Date(d));
export const fmtMonth = d => dfMonth.format(new Date(d));
export const fmtMonthShort = d => dfMonthShort.format(new Date(d));

export function ago(d) {
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(d))) / 86400000);
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 14) return 'vor 1 Woche';
  if (days < 60) return `vor ${Math.round(days / 7)} Wochen`;
  return `vor ${Math.round(days / 30)} Monaten`;
}
export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

/** Wert für <input type="datetime-local"> bzw. "date" in lokaler Zeit. */
export function localInput(d, withTime = true) {
  d = new Date(d);
  const p = n => String(n).padStart(2, '0');
  const s = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return withTime ? `${s}T${p(d.getHours())}:${p(d.getMinutes())}` : s;
}

export function parseNum(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

/** Kopfzeile: Titel, optionaler Zurück-Link und Aktionen (HTML). */
export function setTop({ title = '', back = null, actions = '' } = {}) {
  const tb = document.getElementById('topbar');
  tb.innerHTML = `${back ? `<a class="icon-btn" href="${back}" aria-label="Zurück">←</a>` : ''}
    <div class="title">${esc(title)}</div>${actions}`;
}

// --- Toasts -------------------------------------------------------------
export function toast(msg, type = '', ms = 2600) {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = msg;
  root.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, ms);
  setTimeout(() => el.remove(), ms + 350);
}

export function confetti(n = 70) {
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#f97316', '#0f766e', '#facc15', '#db2777', '#3b82f6', '#22c55e'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * 0.5 + 's';
    c.style.animationDuration = 1.2 + Math.random() * 1.2 + 's';
    box.appendChild(c);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3200);
}

export function vibrate(p = 40) { try { navigator.vibrate && navigator.vibrate(p); } catch { /* egal */ } }

// --- Modal --------------------------------------------------------------
/**
 * Öffnet ein Modal. `build(el, close)` füllt den Inhalt.
 * Gibt ein Promise zurück, das mit dem Wert von close(value) aufgelöst wird.
 */
export function modal(build) {
  return new Promise(resolve => {
    const root = document.getElementById('modal-root');
    const back = document.createElement('div');
    back.className = 'modal-back';
    const box = document.createElement('div');
    box.className = 'modal';
    back.appendChild(box);
    const close = v => { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') close(undefined); };
    back.addEventListener('mousedown', e => { if (e.target === back) close(undefined); });
    document.addEventListener('keydown', onKey);
    root.appendChild(back);
    build(box, close);
    const f = box.querySelector('[autofocus]');
    if (f) setTimeout(() => f.focus(), 50);
  });
}

export function confirmDialog(text, okLabel = 'Löschen') {
  return modal((el, close) => {
    el.innerHTML = `<h2>${esc(text)}</h2>
      <div class="actions"><button class="btn" data-x>Abbrechen</button><button class="btn primary" data-ok>${esc(okLabel)}</button></div>`;
    el.querySelector('[data-x]').onclick = () => close(false);
    el.querySelector('[data-ok]').onclick = () => close(true);
  });
}

export function downloadFile(name, content, type = 'text/csv;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
