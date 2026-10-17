import { snapshot, gymName } from '../data.js';
import { analyze, rangeStart, RANGES, dayKey, dayFromKey } from '../stats.js';
import { setTop, esc, n0, n1, tons, fmtDay, fmtMonth, MUSCLES, ENERGY, ago } from '../ui.js';
import * as charts from '../charts.js';
import * as fun from '../fun.js';
import { icon } from '../icons.js';

let range = '3m';
let calOffset = 0;

const short = d => fmtDay(d).replace(/^\w+\.,?\s*/, '');

export default {
  render(el, _p, ctx) {
    setTop({ title: 'Statistik' });
    const data = snapshot();
    const from = rangeStart(range);
    const a = analyze(data, from, new Date());
    const weeks = a.perWeek.length || 1;

    const muscleEntries = Object.keys(MUSCLES).filter(k => k !== 'cardio').map(k => [k, a.muscles.get(k) || 0]);
    const maxMuscle = Math.max(1, ...muscleEntries.map(([, v]) => v));
    const avgMuscle = muscleEntries.reduce((s, [, v]) => s + v, 0) / muscleEntries.length;
    const weak = muscleEntries.filter(([k, v]) => k !== 'full' && v < avgMuscle * 0.4).map(([k]) => MUSCLES[k].label);
    const gymEntries = [...a.perGym.entries()].sort((x, y) => y[1] - x[1]);
    const maxGym = Math.max(1, ...gymEntries.map(([, v]) => v));
    const prog = a.progress.slice(0, 8);
    const maxPct = Math.max(1, ...prog.map(p => Math.abs(p.pct)));
    const e = a.energy;
    const cardioKm = a.cardio.reduce((s, c) => s + c.km, 0);

    el.innerHTML = `
      <div class="chips">${Object.entries(RANGES).map(([k, l]) => `<button class="chip ${range === k ? 'on' : ''}" data-r="${k}">${l}</button>`).join('')}</div>
      <div class="kpis">
        <div class="kpi"><div class="l">Trainingstage</div><div class="v">${a.days}</div><div class="d muted">Ø ${n1(a.days / weeks)} pro Woche</div></div>
        <div class="kpi"><div class="l">Bewegt</div><div class="v">${tons(a.volume)}</div><div class="d muted">${a.volume ? esc(fun.heavy(a.volume)) : ''}</div></div>
        <div class="kpi"><div class="l">Arbeitssätze</div><div class="v">${n0(a.setsCount)}</div><div class="d muted">ohne Aufwärmen</div></div>
        <div class="kpi"><div class="l">Ø Dauer</div><div class="v">${a.avgDuration ? n0(a.avgDuration) : '–'} <small style="font-size:.85rem">Min.</small></div><div class="d muted">pro Training</div></div>
      </div>

      <div class="grid two" style="margin-top:12px">
        <div class="card"><div class="card-title"><h3>Trainingstage pro Woche</h3></div><div class="chart-box" data-c="week"></div></div>
        <div class="card">
          <div class="card-title"><button class="icon-btn" data-cal="-1">‹</button><h3 data-cal-title></h3><button class="icon-btn" data-cal="1">›</button></div>
          <div data-cal-box></div>
        </div>
        <div class="card"><div class="card-title"><h3>Volumen pro Woche</h3><span class="muted small">kg (Gewicht × Wdh.)</span></div><div class="chart-box" data-c="vol"></div></div>
        <div class="card">
          <div class="card-title"><h3>Studios</h3></div>
          ${gymEntries.length ? gymEntries.map(([g, v]) => `<div class="hbar"><span class="name">${esc(gymName(g))}</span><div class="bar teal"><i style="width:${v / maxGym * 100}%"></i></div><span class="v">${v}×</span></div>`).join('') : '<p class="muted small">Noch keine Trainings im Zeitraum.</p>'}
        </div>
        <div class="card">
          <div class="card-title"><h3>Fortschritt pro Übung</h3><span class="muted small">erstes vs. letztes Training</span></div>
          ${prog.length ? prog.map(p => `<div class="hbar"><span class="name" title="${esc(p.ex.name)}">${esc(p.ex.name)}</span>
            <div class="bar"><i style="width:${Math.max(2, Math.abs(p.pct) / maxPct * 100)}%;${p.pct < 0 ? 'background:var(--bad)' : ''}"></i></div>
            <span class="v ${p.pct > 0 ? 'good' : p.pct < 0 ? 'bad' : ''}">${p.pct > 0 ? '+' : ''}${n0(p.pct)} %</span></div>
            <div class="muted small" style="margin:-4px 0 6px 118px">${esc(gymName(p.ex.gym_id))} · ${n1(p.first)} → ${n1(p.last)}</div>`).join('')
            : '<p class="muted small">Ab zwei Trainings pro Übung siehst du hier deine Steigerung.</p>'}
        </div>
        <div class="card">
          <div class="card-title"><h3>Muskelgruppen</h3><span class="muted small">Arbeitssätze</span></div>
          ${muscleEntries.map(([k, v]) => `<div class="hbar"><span class="name">${MUSCLES[k].label}</span><div class="bar teal"><i style="width:${v / maxMuscle * 100}%"></i></div><span class="v">${v}</span></div>`).join('')}
          ${weak.length && a.setsCount > 20 ? `<div class="notice warn" style="margin-top:10px">Kommt zu kurz: <b>${weak.join(', ')}</b></div>` : ''}
        </div>
        <div class="card">
          <div class="card-title"><h3>Lieblingsübungen</h3></div>
          ${a.favorites.length ? `<ul class="list">${a.favorites.slice(0, 6).map((f, i) => `<li><span class="emoji">${i + 1}.</span><a class="grow" href="#/ex/${f.ex.id}" style="color:inherit;text-decoration:none"><b>${esc(f.ex.name)}</b> <span class="muted small">${esc(gymName(f.ex.gym_id))}</span></a><span class="muted small">${f.days}×</span></li>`).join('')}</ul>` : '<p class="muted small">Noch keine Daten.</p>'}
          ${a.neglected.length ? `<h3 style="margin-top:14px">Lange nicht mehr gemacht</h3><ul class="list">${a.neglected.slice(0, 5).map(n => `<li><span class="emoji">${icon('clock', 18)}</span><a class="grow" href="#/ex/${n.ex.id}" style="color:inherit;text-decoration:none">${esc(n.ex.name)} <span class="muted small">${esc(gymName(n.ex.gym_id))}</span></a><span class="muted small">${ago(n.last)}</span></li>`).join('')}</ul>` : ''}
        </div>
        <div class="card">
          <div class="card-title"><h3>Energie und Leistung</h3></div>
          ${e.low.n + e.mid.n + e.high.n >= 3 ? `
            ${[['low', 'Energie 1–2'], ['mid', 'Energie 3'], ['high', 'Energie 4–5']].map(([k, l]) => `
              <div class="hbar"><span class="name">${l}</span><div class="bar"><i style="width:${e[k].pct == null ? 0 : Math.min(100, Math.max(4, 50 + e[k].pct * 2.5))}%"></i></div><span class="v">${e[k].pct == null ? '–' : (e[k].pct > 0 ? '+' : '') + n0(e[k].pct) + ' %'}</span></div>`).join('')}
            <p class="muted small">Leistung pro Satz im Vergleich zu deinem Durchschnitt an diesem Gerät. ${energyVerdict(e)}</p>`
            : '<p class="muted small">Beantworte vor dem Training den Energie-Check – nach ein paar Trainings siehst du hier, ob du an guten Tagen mehr schaffst.</p>'}
        </div>
        <div class="card"><div class="card-title"><h3>Trainingsdauer</h3><span class="muted small">Minuten, erster bis letzter Satz</span></div><div class="chart-box" data-c="dur"></div></div>
        <div class="card"><div class="card-title"><h3>Cardio pro Woche</h3><span class="muted small">${cardioKm ? `${n1(cardioKm)} km gesamt` : ''}</span></div><div class="chart-box" data-c="cardio"></div></div>
      </div>`;

    const wl = a.perWeek.map(w => short(dayFromKey(w.week)));
    charts.bar(el.querySelector('[data-c="week"]'), wl, [{ label: 'Tage', data: a.perWeek.map(w => w.days) }]);
    charts.bar(el.querySelector('[data-c="vol"]'), wl, [{ label: 'kg', data: a.perWeek.map(w => Math.round(w.volume)), color: charts.COLORS.accent }]);
    const dur = el.querySelector('[data-c="dur"]');
    if (a.durations.length >= 2) charts.line(dur, a.durations.map(d => short(dayFromKey(d.day))), [{ label: 'Minuten', data: a.durations.map(d => d.min), points: 3 }]);
    else dur.innerHTML = '<p class="muted small center" style="padding-top:80px">Noch zu wenige Trainings.</p>';
    const cb = el.querySelector('[data-c="cardio"]');
    if (cardioKm || a.cardio.some(c => c.min)) charts.bar(cb, wl, [{ label: 'Minuten', data: a.cardio.map(c => c.min), color: charts.COLORS.primary }, { label: 'km', data: a.cardio.map(c => Math.round(c.km * 10) / 10), color: charts.COLORS.accent }]);
    else cb.innerHTML = '<p class="muted small center" style="padding-top:80px">Noch kein Cardio im Zeitraum.</p>';

    const drawCal = () => {
      const now = new Date();
      const m = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
      el.querySelector('[data-cal-title]').textContent = fmtMonth(m);
      const all = analyze(data, new Date(m.getFullYear(), m.getMonth(), 1), new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59));
      const days = new Set(all.sessions.map(s => s.day));
      const first = (m.getDay() + 6) % 7;
      const len = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const today = dayKey(now);
      let html = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => `<div class="h">${d}</div>`).join('');
      for (let i = 0; i < first; i++) html += '<div class="c empty"></div>';
      for (let d = 1; d <= len; d++) {
        const k = dayKey(new Date(m.getFullYear(), m.getMonth(), d));
        html += `<div class="c ${days.has(k) ? 'on' : ''} ${k === today ? 'today' : ''}">${d}</div>`;
      }
      el.querySelector('[data-cal-box]').innerHTML = `<div class="cal">${html}</div><p class="muted small" style="margin-bottom:0">${days.size} Trainingstage</p>`;
      el.querySelector('[data-cal="1"]').disabled = calOffset >= 0;
    };
    drawCal();
    el.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => { calOffset += +b.dataset.cal; drawCal(); });
    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { range = b.dataset.r; ctx.refresh(); });
    return () => charts.destroyAll();
  },
};

function energyVerdict(e) {
  if (e.high.pct == null || e.low.pct == null) return '';
  const d = e.high.pct - e.low.pct;
  if (d > 4) return `An fitten Tagen schaffst du rund ${n0(d)} % mehr als an müden.`;
  if (d < -4) return 'Interessant: An müden Tagen bist du sogar stärker – das Gefühl täuscht!';
  return 'Deine Leistung hängt kaum vom Gefühl ab – hingehen lohnt sich immer.';
}
