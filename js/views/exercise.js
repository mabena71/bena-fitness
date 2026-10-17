import * as db from '../db.js';
import { gymName, exerciseSets, announceRewards } from '../data.js';
import {
  setTop, esc, n1, n0, n2, KINDS, MUSCLES, FEEL, ENERGY, setText, fmtDay, fmtTime, ago, toast, confetti, vibrate,
  modal, confirmDialog, parseNum, localInput,
} from '../ui.js';
import { prefill, ghost, ghostCompare, isRecord, best, dayKey, byTime, working, volume, groupBy, roundStep } from '../stats.js';
import { orderedExercises } from './gym.js';
import * as charts from '../charts.js';
import { icon } from '../icons.js';

const skippedEnergy = new Set();

export default {
  async render(el, [id]) {
    const ex = db.get('exercises', id);
    if (!ex) { location.hash = '#/'; return; }
    const gid = ex.gym_id || 'anywhere';
    setTop({ title: ex.name, back: `#/gym/${gid}`, actions: `<a class="icon-btn" href="#/ex/${ex.id}/edit" aria-label="Bearbeiten">${icon('edit')}</a>` });

    const photo = ex.photo_path ? await db.photoUrl(ex.id) : null;
    const step = ex.step || (ex.kind === 'free' ? 1 : 2.5);
    const isCardio = ex.kind === 'cardio';
    const isBody = ex.kind === 'bodyweight';
    const isSauna = ex.kind === 'sauna';
    const unit = isSauna ? 'Gang' : 'Satz';

    const init = prefill(exerciseSets(ex.id), ex);
    const entry = {
      weight_kg: init.weight_kg ?? null, reps: init.reps ?? 10,
      duration_min: init.duration_min ?? (isSauna ? 12 : 20), distance_km: init.distance_km ?? null,
      feel: 2, is_warmup: false, note: '', at: null,
    };
    const comebackInfo = init.comeback || null;
    let showNote = false;
    let historyLimit = 12;

    if (!isSauna) maybeAskEnergy(ex);

    const paint = () => {
      charts.destroyAll();
      const sets = exerciseSets(ex.id).sort(byTime);
      const today = dayKey(new Date());
      const todays = sets.filter(s => dayKey(s.performed_at) === today);
      const g = ghost(sets, today);
      const pb = isSauna ? null : best(sets, ex.kind);
      const order = orderedExercises(ex.gym_id || null);
      const hasOrder = order.some(e => e.sort_order != null);
      const next = hasOrder ? order[order.findIndex(e => e.id === ex.id) + 1] : null;

      el.innerHTML = `
        <div class="grid two">
          <div>
            <div class="card">
              <div class="hero">
                <div class="ph">${photo ? `<img src="${photo}" alt="">` : icon(KINDS[ex.kind]?.icon, 40)}</div>
                <div>
                  <div class="muted small">${esc(gymName(ex.gym_id))} · ${MUSCLES[ex.muscle_group]?.label || ''} · ${KINDS[ex.kind]?.label}</div>
                  ${ex.settings?.length ? `<div class="settings-pills">${ex.settings.map(s => `<span class="pill">${esc(s.label)} ${esc(s.value)}</span>`).join('')}</div>` : ''}
                  ${pb ? `<div class="small" style="margin-top:8px">${icon('award', 16)} Bestwert: <b>${setText(pb, ex.kind)}</b></div>` : ''}
                </div>
              </div>
              ${ex.notes ? `<p class="small" style="margin:12px 0 0;white-space:pre-wrap">${icon('note', 16)} ${esc(ex.notes)}</p>` : ''}
            </div>

            <div class="card">
              ${comebackInfo && !todays.length ? `<div class="notice warn">${icon('sprout', 16)} <b>Sanfter Wiedereinstieg:</b> ${comebackInfo.days} Tage Pause. Gewicht um ${Math.round((1 - comebackInfo.factor) * 100)} % reduziert vorgeschlagen.</div>` : ''}
              <div class="entry" ${isSauna ? 'style="grid-template-columns:1fr"' : ''}>
                ${isSauna ? stepperHtml('duration_min', 'Minuten', entry.duration_min) : isCardio ? stepperHtml('duration_min', 'Minuten', entry.duration_min) + stepperHtml('distance_km', 'km', entry.distance_km, 'decimal')
                  : stepperHtml('weight_kg', isBody ? 'Zusatz-kg' : 'kg', entry.weight_kg, 'decimal') + stepperHtml('reps', 'Wdh.', entry.reps)}
              </div>
              ${isSauna ? '' : `<div class="seg" style="margin-top:12px" data-feel>
                ${[1, 2, 3].map(f => `<button type="button" data-v="${f}" class="${entry.feel === f ? 'on' : ''}">${FEEL[f]}</button>`).join('')}
              </div>`}
              <div class="row spread" style="margin-top:6px">
                ${isCardio || isSauna ? '<span></span>' : `<label class="toggle"><input type="checkbox" data-warm ${entry.is_warmup ? 'checked' : ''}> Aufwärmsatz</label>`}
                <button class="btn ghost sm" data-note-toggle>${showNote || entry.note ? '− Notiz' : '+ Notiz'}</button>
              </div>
              ${showNote || entry.note ? `<input class="input" data-note placeholder="Notiz zu diesem ${unit}" value="${esc(entry.note)}" style="margin-top:6px">` : ''}
              ${entry.at ? `<label class="field" style="margin-top:10px"><span>Zeitpunkt</span><input class="input" type="datetime-local" data-at value="${localInput(entry.at)}"></label>` : ''}
              <button class="btn primary big block" style="margin-top:12px" data-save>${icon('check', 22)} ${unit} speichern</button>
              ${!entry.at ? '<button class="btn ghost sm block" style="margin-top:6px" data-at-toggle>Für einen anderen Tag nachtragen</button>' : ''}
            </div>

            <div class="card">
              <div class="card-title"><h3>Heute</h3>${g && !isSauna ? `<span class="muted small">${icon('history', 14)} letztes Mal: ${fmtDay(dayFromKeyLocal(g.day))}</span>` : ''}</div>
              ${todaysList(todays, isSauna ? null : g, ex)}
            </div>
            ${next ? `<a class="next-link" href="#/ex/${next.id}"><span>Weiter: ${esc(next.name)}</span><span>→</span></a>` : ''}
          </div>

          <div>
            <div class="card">
              <div class="card-title"><h3>Entwicklung</h3><span class="muted small">${sets.length ? `${new Set(sets.map(s => dayKey(s.performed_at))).size} ${isSauna ? 'Saunatage' : 'Trainingstage'}` : ''}</span></div>
              ${sets.length >= 2 ? `<div class="chips" data-modes>${chartModes(ex, sets).map(([k, l]) => `<button class="chip ${k === chartMode(ex, sets) ? 'on' : ''}" data-mode="${k}">${l}</button>`).join('')}</div>` : ''}
              <div class="chart-box" data-chart>${sets.length < 2 ? '<p class="muted small center" style="padding-top:80px">Ab dem zweiten Training siehst du hier deine Entwicklung.</p>' : ''}</div>
            </div>
            <div class="card">
              <div class="card-title"><h3>Verlauf</h3></div>
              ${historyHtml(sets, ex, today, historyLimit)}
            </div>
          </div>
        </div>`;

      wire(sets);
      if (sets.length >= 2) drawChart(el.querySelector('[data-chart]'), sets, ex);
      el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { modeByKind[ex.kind] = b.dataset.mode; paint(); });
    };

    const wire = (sets) => {
      const $ = s => el.querySelector(s);
      el.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
        const k = b.dataset.step, dir = +b.dataset.dir;
        const inc = k === 'weight_kg' ? step : k === 'distance_km' ? 0.1 : 1;
        const cur = entry[k] ?? 0;
        let v = Math.round((cur + dir * inc) * 100) / 100;
        if (k === 'weight_kg') v = roundStep(v, step);
        entry[k] = Math.max(0, v);
        el.querySelector(`[data-in="${k}"]`).value = fmtInput(entry[k]);
        vibrate(10);
      });
      el.querySelectorAll('[data-in]').forEach(i => {
        i.oninput = () => { entry[i.dataset.in] = parseNum(i.value); };
        i.onfocus = () => i.select();
      });
      el.querySelectorAll('[data-feel] button').forEach(b => b.onclick = () => {
        entry.feel = +b.dataset.v;
        el.querySelectorAll('[data-feel] button').forEach(x => x.classList.toggle('on', x === b));
      });
      const warm = $('[data-warm]');
      if (warm) warm.onchange = () => { entry.is_warmup = warm.checked; };
      $('[data-note-toggle]').onclick = () => { showNote = !(showNote || entry.note); if (!showNote) entry.note = ''; paint(); if (showNote) el.querySelector('[data-note]')?.focus(); };
      const note = $('[data-note]');
      if (note) note.oninput = () => { entry.note = note.value; };
      const atT = $('[data-at-toggle]');
      if (atT) atT.onclick = () => { const d = new Date(); d.setDate(d.getDate() - 1); entry.at = d; paint(); };
      const at = $('[data-at]');
      if (at) at.onchange = () => { entry.at = at.value ? new Date(at.value) : null; };
      $('[data-save]').onclick = () => save();
      el.querySelectorAll('[data-set]').forEach(li => li.onclick = () => editSet(db.get('sets', li.dataset.set)));
      const more = $('[data-more]');
      if (more) more.onclick = () => { historyLimit += 20; paint(); };
    };

    const save = async () => {
      const row = { exercise_id: ex.id, performed_at: (entry.at || new Date()).toISOString(), feel: isSauna ? null : entry.feel, is_warmup: isCardio || isSauna ? false : entry.is_warmup, note: entry.note.trim() };
      if (isSauna) {
        if (!entry.duration_min) { toast('Bitte die Minuten eingeben'); return; }
        Object.assign(row, { duration_min: entry.duration_min, distance_km: null, weight_kg: null, reps: null });
      } else if (isCardio) {
        if (!entry.duration_min && !entry.distance_km) { toast('Bitte Minuten oder km eingeben'); return; }
        Object.assign(row, { duration_min: entry.duration_min || null, distance_km: entry.distance_km || null, weight_kg: null, reps: null });
      } else {
        if (!entry.reps) { toast('Bitte Wiederholungen eingeben'); return; }
        Object.assign(row, { weight_kg: entry.weight_kg || (isBody ? null : 0), reps: Math.round(entry.reps), duration_min: null, distance_km: null });
      }
      const previous = exerciseSets(ex.id);
      const saved = await db.put('sets', row);
      vibrate(25);
      if (!isSauna && isRecord(saved, previous, ex.kind)) {
        confetti(); vibrate([80, 40, 80]);
        toast(`${icon('award', 18)} Neuer Rekord: <b>${setText(saved, ex.kind)}</b>`, 'record', 4000);
      } else {
        toast(`Gespeichert: ${setText(saved, ex.kind)}${saved.is_warmup ? ' (Aufwärmen)' : ''}`);
      }
      entry.note = ''; showNote = false; entry.is_warmup = false;
      if (entry.at) entry.at = null;
      paint();
      announceRewards();
    };

    const editSet = async (s) => {
      if (!s) return;
      const res = await modal((m, close) => {
        m.innerHTML = `<h2>${unit} bearbeiten</h2>
          ${isSauna ? `<label class="field"><span>Minuten</span><input class="input" inputmode="decimal" data-e="duration_min" value="${fmtInput(s.duration_min)}"></label>` : isCardio ? `
            <div class="grid two"><label class="field"><span>Minuten</span><input class="input" inputmode="decimal" data-e="duration_min" value="${fmtInput(s.duration_min)}"></label>
            <label class="field"><span>km</span><input class="input" inputmode="decimal" data-e="distance_km" value="${fmtInput(s.distance_km)}"></label></div>` : `
            <div class="grid two" style="grid-template-columns:1fr 1fr"><label class="field"><span>${isBody ? 'Zusatz-kg' : 'kg'}</span><input class="input" inputmode="decimal" data-e="weight_kg" value="${fmtInput(s.weight_kg)}"></label>
            <label class="field"><span>Wiederholungen</span><input class="input" inputmode="numeric" data-e="reps" value="${fmtInput(s.reps)}"></label></div>`}
          ${isSauna ? '' : `<label class="field"><span>Gefühl</span><select class="input" data-e="feel">${[1, 2, 3].map(f => `<option value="${f}" ${s.feel === f ? 'selected' : ''}>${FEEL[f]}</option>`).join('')}</select></label>`}
          ${isCardio || isSauna ? '' : `<label class="toggle"><input type="checkbox" data-e="is_warmup" ${s.is_warmup ? 'checked' : ''}> Aufwärmsatz</label>`}
          <label class="field"><span>Zeitpunkt</span><input class="input" type="datetime-local" data-e="performed_at" value="${localInput(s.performed_at)}"></label>
          <label class="field"><span>Notiz</span><input class="input" data-e="note" value="${esc(s.note || '')}"></label>
          <div class="actions"><button class="btn danger" data-del>Löschen</button><button class="btn primary" data-ok>Speichern</button></div>`;
        m.querySelector('[data-del]').onclick = () => close('delete');
        m.querySelector('[data-ok]').onclick = () => {
          const v = k => m.querySelector(`[data-e="${k}"]`);
          const upd = { id: s.id, feel: isSauna ? null : +v('feel').value, note: v('note').value.trim() };
          if (v('performed_at').value) upd.performed_at = new Date(v('performed_at').value).toISOString();
          if (isSauna) upd.duration_min = parseNum(v('duration_min').value);
          else if (isCardio) { upd.duration_min = parseNum(v('duration_min').value); upd.distance_km = parseNum(v('distance_km').value); }
          else { upd.weight_kg = parseNum(v('weight_kg').value); upd.reps = parseNum(v('reps').value); upd.is_warmup = v('is_warmup').checked; }
          close(upd);
        };
      });
      if (res === 'delete') {
        if (await confirmDialog(`Diesen ${unit} löschen?`)) { await db.remove('sets', s.id); toast(`${unit} gelöscht`); paint(); }
      } else if (res) { await db.put('sets', res); paint(); announceRewards(); }
    };

    paint();
    return () => charts.destroyAll();
  },
};

function dayFromKeyLocal(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function fmtInput(v) { return v == null ? '' : String(v); }

function stepperHtml(key, label, value, mode = 'numeric') {
  return `<div class="stepper"><label>${label}</label><div class="ctl">
    <button type="button" data-step="${key}" data-dir="-1" aria-label="weniger">−</button>
    <input data-in="${key}" inputmode="${mode}" value="${fmtInput(value)}" aria-label="${label}">
    <button type="button" data-step="${key}" data-dir="1" aria-label="mehr">+</button></div></div>`;
}

function todaysList(todays, g, ex) {
  const prevWork = g ? g.sets : [];
  if (!todays.length && !prevWork.length) return `<p class="muted small">${ex.kind === 'sauna' ? 'Noch kein Saunagang heute.' : 'Noch keine Sätze heute.'}</p>`;
  let wi = 0; // Index der Arbeitssätze, für den Vergleich mit dem letzten Mal
  const prevWorking = working(prevWork);
  const rows = todays.map((s, i) => {
    let ghostTxt = '';
    if (!s.is_warmup) {
      const p = prevWorking[wi];
      const c = ghostCompare(s, p, ex.kind);
      if (p) ghostTxt = `<div class="ghost ${c > 0 ? 'good' : c < 0 ? 'bad' : 'muted'}">${icon('history', 14)} ${setText(p, ex.kind)} ${c > 0 ? '▲' : c < 0 ? '▼' : '='}</div>`;
      wi++;
    }
    return `<li data-set="${s.id}" style="cursor:pointer" class="${s.is_warmup ? 'warm' : ''}">
      <span class="n">${s.is_warmup ? 'W' : wi}</span>
      <div><span class="val">${setText(s, ex.kind)}</span> <span class="feel">${FEEL[s.feel] || ''}</span>${s.note ? `<div class="muted small">${icon('note', 14)} ${esc(s.note)}</div>` : ''}</div>
      <div style="text-align:right">${ghostTxt}<div class="muted small">${fmtTime(s.performed_at)}</div></div></li>`;
  });
  // Noch offene Sätze vom letzten Mal als Ziel anzeigen
  const open = prevWorking.slice(wi).map((p, k) => `<li class="warm"><span class="n">${wi + k + 1}</span><div class="muted">Ziel vom letzten Mal</div><div class="ghost muted">${icon('history', 14)} ${setText(p, ex.kind)}</div></li>`);
  return `<ul class="sets">${rows.join('')}${open.join('')}</ul>`;
}

function historyHtml(sets, ex, today, limit) {
  const past = sets.filter(s => dayKey(s.performed_at) !== today);
  if (!past.length) return '<p class="muted small">Noch kein früheres Training.</p>';
  const byDay = [...groupBy(past, s => dayKey(s.performed_at)).entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const shown = byDay.slice(0, limit);
  return shown.map(([d, list]) => {
    const w = working(list);
    const vol = w.reduce((a, s) => a + volume(s), 0);
    return `<div class="history-day">
      <div class="row spread"><span class="d">${fmtDay(dayFromKeyLocal(d))}</span><span class="muted small">${vol ? `${n0(vol)} kg Volumen` : ''}</span></div>
      <div class="s">${list.map(s => `<span data-set="${s.id}" style="cursor:pointer;${s.is_warmup ? 'opacity:.5' : ''}">${setText(s, ex.kind)}</span>`).join(' · ')}</div>
      ${list.filter(s => s.note).map(s => `<div class="muted small">${icon('note', 14)} ${esc(s.note)}</div>`).join('')}
    </div>`;
  }).join('') + (byDay.length > limit ? '<button class="btn sm block" style="margin-top:8px" data-more>Mehr anzeigen</button>' : '');
}

// Diagramm: immer nur eine Kennzahl mit beschrifteter Skala, wählbar über Knöpfe.
const modeByKind = {};
function chartModes(ex, sets) {
  if (ex.kind === 'sauna') return [['min', 'Minuten'], ['gaenge', 'Gänge']];
  if (ex.kind === 'cardio') return [['km', 'Distanz'], ['min', 'Minuten']];
  if (ex.kind === 'bodyweight' && !sets.some(s => s.weight_kg)) return [['reps', 'Wiederholungen']];
  return [['weight', 'Gewicht'], ['volume', 'Volumen'], ['reps', 'Wiederholungen']];
}
function chartMode(ex, sets) {
  const modes = chartModes(ex, sets).map(m => m[0]);
  return modes.includes(modeByKind[ex.kind]) ? modeByKind[ex.kind] : modes[0];
}
const MODE_INFO = {
  weight: { title: 'Höchstgewicht pro Tag (kg)', f: l => Math.max(...l.map(s => s.weight_kg || 0)) },
  volume: { title: 'Volumen pro Tag: Gewicht × Wiederholungen (kg)', f: l => l.reduce((a, s) => a + volume(s), 0) },
  reps: { title: 'Meiste Wiederholungen in einem Satz', f: l => Math.max(...l.map(s => s.reps || 0)) },
  km: { title: 'Weiteste Distanz pro Tag (km)', f: l => Math.max(...l.map(s => s.distance_km || 0)) || null },
  gaenge: { title: 'Saunagänge pro Tag', f: l => l.length },
  min: { title: 'Minuten pro Tag', f: l => l.reduce((a, s) => a + (s.duration_min || 0), 0) },
};

function drawChart(box, sets, ex) {
  const byDay = [...groupBy(working(sets), s => dayKey(s.performed_at)).entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const today = dayKey(new Date());
  const labels = byDay.map(([d]) => (d === today ? 'heute' : fmtDay(dayFromKeyLocal(d)).replace(/^\w+\.,?\s*/, '')));
  const mode = chartMode(ex, sets);
  const info = MODE_INFO[mode];
  const data = byDay.map(([, l]) => info.f(l));
  charts.line(box, labels, [{ label: info.title, data, color: mode === 'volume' ? charts.COLORS.accent : charts.COLORS.primary, points: 3, fill: true, fillColor: mode === 'volume' ? 'rgba(249,115,22,.12)' : undefined }], {
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 14, font: { size: 11 }, color: '#637081' } },
        y: { title: { display: true, text: info.title, font: { size: 11 }, color: '#637081' }, grid: { color: '#eef1f4' }, ticks: { font: { size: 11 }, color: '#637081' }, beginAtZero: mode === 'volume' || mode === 'min' },
      },
    },
  });
  if (byDay.length && byDay[byDay.length - 1][0] === today && (mode === 'volume' || mode === 'min')) {
    box.insertAdjacentHTML('beforeend', '<div class="muted small" style="position:absolute;right:4px;top:0">„heute“ läuft noch</div>');
  }
}

/** Energie-Check: beim ersten Satz des Tages in diesem Studio fragen. */
async function maybeAskEnergy(ex) {
  const today = dayKey(new Date());
  const gymId = ex.gym_id || null;
  const key = `${today}|${gymId}`;
  if (skippedEnergy.has(key)) return;
  if (db.all('day_checks').some(c => c.day === today && (c.gym_id || null) === gymId)) return;
  const gymEx = new Set(db.all('exercises').filter(e => (e.gym_id || null) === gymId).map(e => e.id));
  if (db.all('sets').some(s => gymEx.has(s.exercise_id) && dayKey(s.performed_at) === today)) return;
  const v = await modal((m, close) => {
    m.innerHTML = `<h2>Wie fühlst du dich heute?</h2>
      <div class="energy">${[1, 2, 3, 4, 5].map(i => `<button data-v="${i}">${i}<span>${ENERGY[i]}</span></button>`).join('')}</div>
      <p class="muted small">Die Statistik zeigt später, ob du an guten Tagen wirklich mehr schaffst.</p>
      <div class="actions"><button class="btn" data-x>Überspringen</button></div>`;
    m.querySelectorAll('[data-v]').forEach(b => b.onclick = () => close(+b.dataset.v));
    m.querySelector('[data-x]').onclick = () => close(null);
  });
  skippedEnergy.add(key);
  if (v) { await db.put('day_checks', { day: today, gym_id: gymId, energy: v }); toast(`Energie ${v} (${ENERGY[v]}) notiert`); }
}

