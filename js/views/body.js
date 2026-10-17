import * as db from '../db.js';
import { snapshot, announceRewards } from '../data.js';
import { rolling, bodyTrend, bodyRecordEvents, bodyLoss, sinkingWeekStreak, dayKey, BODY_FIELDS, addDays, DAY } from '../stats.js';
import { setTop, esc, n0, n1, signed, fmtDay, ago, modal, toast, confetti, vibrate, parseNum, localInput, confirmDialog } from '../ui.js';
import * as charts from '../charts.js';
import * as fun from '../fun.js';
import { icon } from '../icons.js';

let range = 90;

export default {
  render(el, _p, ctx) {
    setTop({ title: 'Körper' });
    const data = snapshot();
    const body = data.body;
    const w = bodyTrend(body, 'weight_kg');
    const f = bodyTrend(body, 'fat_pct');
    const mu = bodyTrend(body, 'muscle_kg');
    const loss = bodyLoss(body, 'weight_kg');
    const fatLoss = bodyLoss(body, 'fat_pct');
    const sink = sinkingWeekStreak(body);
    const recs = bodyRecordEvents(body).reverse();
    const latestRows = [...body].sort((a, b) => (a.measured_at < b.measured_at ? 1 : -1));
    const steps = [...data.steps].sort((a, b) => (a.day < b.day ? -1 : 1));

    const kpi = (label, t, unit, better) => {
      if (!t) return `<div class="kpi"><div class="l">${label}</div><div class="v">–</div></div>`;
      const d = t.delta7;
      const good = d != null && d * better > 0.04, bad = d != null && d * better < -0.04;
      return `<div class="kpi"><div class="l">${label}</div><div class="v">${n1(t.last)} <small style="font-size:.85rem">${unit}</small></div>
        <div class="d ${good ? 'good' : bad ? 'bad' : 'muted'}">${d == null ? 'Ø 7 Tage: ' + n1(t.avg) : `${signed(d)} ${unit} / 7 Tage`}</div></div>`;
    };

    el.innerHTML = `
      <div class="row" style="margin-bottom:12px">
        <button class="btn primary grow" data-add>+ Messung</button>
        <button class="btn" data-steps>${icon('steps', 18)} Schritte</button>
      </div>
      <p class="muted small" style="margin:-4px 0 12px">Bald automatisch von der Withings-Waage. Bis dahin hier von Hand eintragen.</p>
      <div class="kpis">
        ${kpi('Gewicht', w, 'kg', -1)}
        ${kpi('Fettanteil', f, '%', -1)}
        ${kpi('Muskelmasse', mu, 'kg', 1)}
        <div class="kpi"><div class="l">Seit Beginn</div><div class="v ${loss > 0.05 ? 'good' : ''}">${loss ? signed(-loss) : '–'} <small style="font-size:.85rem">kg</small></div>
          <div class="d muted">${loss > 0.2 ? '≈ ' + esc(fun.loss(loss)) : fatLoss ? `${signed(-fatLoss)} % Fett` : ''}</div></div>
      </div>

      <div class="chips" style="margin-top:14px">
        ${[[30, '30 Tage'], [90, '3 Monate'], [365, 'Jahr'], [0, 'Alles']].map(([v, l]) => `<button class="chip ${range === v ? 'on' : ''}" data-r="${v}">${l}</button>`).join('')}
      </div>

      <div class="grid two">
        <div class="card"><div class="card-title"><h3>Gewicht</h3><span class="muted small">Punkte = Messung, Linie = Ø 7 Tage</span></div><div class="chart-box tall" data-c="weight_kg"></div></div>
        <div class="card"><div class="card-title"><h3>Fettanteil</h3></div><div class="chart-box tall" data-c="fat_pct"></div></div>
        <div class="card"><div class="card-title"><h3>Muskelmasse</h3></div><div class="chart-box" data-c="muscle_kg"></div></div>
        <div class="card"><div class="card-title"><h3>Schritte</h3><span class="muted small">${steps.length ? `Ø ${n0(avgSteps(steps, 7))} / Tag (7 Tage)` : ''}</span></div><div class="chart-box" data-steps-chart></div></div>
      </div>

      <div class="grid two" style="margin-top:12px">
        <div class="card">
          <div class="card-title"><h3>Körper-Rekorde</h3><span class="muted small">gegen den 7-Tage-Schnitt</span></div>
          ${recs.length ? `<ul class="list">${recs.slice(0, 6).map(r => `<li><span class="emoji">${icon('gem', 18)}</span><div class="grow"><b>${BODY_FIELDS[r.field].label}: ${n1(r.avg)} ${BODY_FIELDS[r.field].unit}</b><div class="muted small">${fmtDay(r.t)} · vorher ${n1(r.prev)}</div></div></li>`).join('')}</ul>`
            : '<p class="muted small">Rekorde gibt es ab etwa einer Woche mit Messungen.</p>'}
          ${sink.current >= 2 ? `<div class="notice info" style="margin-top:10px">${icon('trendDown', 18)} ${sink.current} Wochen in Folge leichter geworden!</div>` : ''}
        </div>
        <div class="card">
          <div class="card-title"><h3>Messungen</h3></div>
          ${latestRows.length ? `<ul class="list">${latestRows.slice(0, 8).map(m => `<li data-m="${m.id}" style="cursor:pointer"><div class="grow"><b class="num">${n1(m.weight_kg)} kg</b>
            <span class="muted small">${m.fat_pct != null ? ` · ${n1(m.fat_pct)} % Fett` : ''}${m.muscle_kg != null ? ` · ${n1(m.muscle_kg)} kg Muskeln` : ''}${m.waist_cm ? ` · ${n0(m.waist_cm)} cm` : ''}</span>
            <div class="muted small">${fmtDay(m.measured_at)}${m.source === 'withings' ? ' · Withings' : ''}</div></div><span class="muted">›</span></li>`).join('')}</ul>`
            : '<p class="muted small">Noch keine Messung.</p>'}
        </div>
      </div>`;

    const since = range ? new Date(Date.now() - range * DAY).toISOString() : '';
    for (const box of el.querySelectorAll('[data-c]')) {
      const field = box.dataset.c;
      const r = rolling(body, field).filter(x => x.t >= since);
      if (r.length < 2) { box.innerHTML = '<p class="muted small center" style="padding-top:70px">Zu wenige Messungen.</p>'; continue; }
      charts.line(box, r.map(x => fmtDay(x.t).replace(/^\w+\.,?\s*/, '')), [
        { label: 'Ø 7 Tage', data: r.map(x => Math.round(x.avg * 10) / 10), color: field === 'muscle_kg' ? charts.COLORS.accent : charts.COLORS.primary, width: 3 },
        { label: 'Messung', data: r.map(x => x.v), color: charts.COLORS.grey, points: 2.5, showLine: false, width: 0 },
      ]);
    }
    const sb = el.querySelector('[data-steps-chart]');
    const sr = steps.filter(s => !range || s.day >= dayKey(addDays(new Date(), -range)));
    if (sr.length) {
      charts.bar(sb, sr.map(s => fmtDay(s.day + 'T12:00').replace(/^\w+\.,?\s*/, '')), [{ label: 'Schritte', data: sr.map(s => s.steps), color: charts.COLORS.primary }]);
    } else sb.innerHTML = '<p class="muted small center" style="padding-top:70px">Noch keine Schritte eingetragen.</p>';

    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { range = +b.dataset.r; ctx.refresh(); });
    el.querySelector('[data-add]').onclick = async () => { if (await openBodyEntry()) ctx.refresh(); };
    el.querySelector('[data-steps]').onclick = async () => { if (await openStepsEntry()) ctx.refresh(); };
    el.querySelectorAll('[data-m]').forEach(li => li.onclick = async () => { if (await openBodyEntry(db.get('body_metrics', li.dataset.m))) ctx.refresh(); });
    return () => charts.destroyAll();
  },
};

function avgSteps(steps, days) {
  const from = dayKey(addDays(new Date(), -days + 1));
  const l = steps.filter(s => s.day >= from);
  return l.length ? l.reduce((a, s) => a + s.steps, 0) / l.length : 0;
}

/** Messung erfassen oder bearbeiten. Gibt true zurück, wenn gespeichert wurde. */
export async function openBodyEntry(existing = null) {
  const last = [...db.all('body_metrics')].sort((a, b) => (a.measured_at < b.measured_at ? 1 : -1))[0];
  const src = existing || {};
  const res = await modal((m, close) => {
    m.innerHTML = `<h2>${existing ? 'Messung bearbeiten' : 'Neue Messung'}</h2>
      <div class="grid" style="grid-template-columns:1fr 1fr">
        <label class="field"><span>Gewicht (kg)</span><input class="input" inputmode="decimal" data-f="weight_kg" value="${src.weight_kg ?? ''}" placeholder="${last?.weight_kg ?? ''}" autofocus></label>
        <label class="field"><span>Fettanteil (%)</span><input class="input" inputmode="decimal" data-f="fat_pct" value="${src.fat_pct ?? ''}" placeholder="${last?.fat_pct ?? ''}"></label>
        <label class="field"><span>Muskelmasse (kg)</span><input class="input" inputmode="decimal" data-f="muscle_kg" value="${src.muscle_kg ?? ''}" placeholder="${last?.muscle_kg ?? ''}"></label>
        <label class="field"><span>Bauchumfang (cm)</span><input class="input" inputmode="decimal" data-f="waist_cm" value="${src.waist_cm ?? ''}"></label>
      </div>
      <label class="field"><span>Zeitpunkt</span><input class="input" type="datetime-local" data-f="measured_at" value="${localInput(src.measured_at || new Date())}"></label>
      <div class="actions">${existing ? '<button class="btn danger" data-del>Löschen</button>' : '<button class="btn" data-x>Abbrechen</button>'}<button class="btn primary" data-ok>Speichern</button></div>`;
    const v = k => m.querySelector(`[data-f="${k}"]`).value;
    m.querySelector('[data-ok]').onclick = () => {
      const row = { weight_kg: parseNum(v('weight_kg')), fat_pct: parseNum(v('fat_pct')), muscle_kg: parseNum(v('muscle_kg')), waist_cm: parseNum(v('waist_cm')) };
      if (row.weight_kg == null && row.fat_pct == null && row.muscle_kg == null && row.waist_cm == null) { toast('Bitte mindestens einen Wert eingeben'); return; }
      row.measured_at = v('measured_at') ? new Date(v('measured_at')).toISOString() : new Date().toISOString();
      close(row);
    };
    const x = m.querySelector('[data-x]'); if (x) x.onclick = () => close(null);
    const d = m.querySelector('[data-del]'); if (d) d.onclick = () => close('delete');
  });
  if (!res) return false;
  if (res === 'delete') {
    if (!(await confirmDialog('Diese Messung löschen?'))) return false;
    await db.remove('body_metrics', existing.id);
    return true;
  }
  const before = bodyRecordEvents(db.all('body_metrics')).length;
  await db.put('body_metrics', { ...(existing ? { id: existing.id } : { source: 'manual' }), ...res });
  const after = bodyRecordEvents(db.all('body_metrics'));
  const newest = after[after.length - 1];
  if (!existing && after.length > before && newest) {
    confetti(); vibrate([80, 40, 80]);
    toast(`${icon('gem', 18)} Körper-Rekord: ${BODY_FIELDS[newest.field].label} Ø ${n1(newest.avg)} ${BODY_FIELDS[newest.field].unit}`, 'record', 4200);
  } else toast('Messung gespeichert');
  announceRewards();
  return true;
}

export async function openStepsEntry() {
  const today = dayKey(new Date());
  const res = await modal((m, close) => {
    const cur = db.all('daily_steps').find(s => s.day === today);
    m.innerHTML = `<h2>Schritte</h2>
      <label class="field"><span>Tag</span><input class="input" type="date" data-d value="${today}" max="${today}"></label>
      <label class="field"><span>Schritte</span><input class="input" inputmode="numeric" data-s value="${cur ? cur.steps : ''}" placeholder="z. B. 8500" autofocus></label>
      <div class="actions"><button class="btn" data-x>Abbrechen</button><button class="btn primary" data-ok>Speichern</button></div>`;
    const d = m.querySelector('[data-d]'), s = m.querySelector('[data-s]');
    d.onchange = () => { const e = db.all('daily_steps').find(x => x.day === d.value); s.value = e ? e.steps : ''; };
    m.querySelector('[data-x]').onclick = () => close(null);
    m.querySelector('[data-ok]').onclick = () => { const n = parseNum(s.value.replace(/['’\s]/g, '')); if (n == null) { toast('Bitte eine Zahl eingeben'); return; } close({ day: d.value, steps: Math.round(n) }); };
  });
  if (!res) return false;
  const existing = db.all('daily_steps').find(x => x.day === res.day);
  await db.put('daily_steps', { ...(existing ? { id: existing.id } : { source: 'manual' }), ...res });
  toast(`${n0(res.steps)} Schritte gespeichert`);
  announceRewards();
  return true;
}

