import * as db from '../db.js';
import { snapshot, rewards, profile, gymName } from '../data.js';
import { bodyTrend, sessions, monthRange, periodSummary, dayKey } from '../stats.js';
import { setTop, esc, n1, n0, signed, ago, fmtMonth, tons, modal, toast, setText } from '../ui.js';
import { openBodyEntry, openStepsEntry } from './body.js';
import { gymPhotoKey } from './gym.js';
import { icon } from '../icons.js';
import { permissionState, currentPosition, nearestGym } from '../geo.js';

export default {
  render(el, _p, ctx) {
    const data = snapshot();
    const prof = profile();
    const r = rewards();
    setTop({ title: prof.display_name ? `Hallo ${prof.display_name}` : 'Fitness-Tagebuch' });

    const exById = new Map(data.exercises.map(e => [e.id, e]));
    const sess = sessions(data.sets, exById);
    const lastVisit = new Map();
    for (const s of sess) lastVisit.set(s.gym_id || 'anywhere', s.startTs);
    const gyms = [...data.gyms].sort((a, b) => (lastVisit.get(b.id) || 0) - (lastVisit.get(a.id) || 0));
    const exCount = id => data.exercises.filter(e => (e.gym_id || null) === id && !e.archived).length;

    const w = bodyTrend(data.body, 'weight_kg');
    const f = bodyTrend(data.body, 'fat_pct');
    const now = new Date();
    const [ms, me] = monthRange(now.getFullYear(), now.getMonth());
    const month = periodSummary(data, ms, me);
    const today = dayKey(now);
    const stepsToday = data.steps.find(s => s.day === today);
    const recent = [...r.records].reverse().slice(0, 3);

    const trend = (t, unit) => {
      if (!t || t.delta7 == null) return '<span class="trend">noch kein 7-Tage-Trend</span>';
      const good = t.delta7 < -0.05, bad = t.delta7 > 0.05;
      return `<span class="trend ${good ? 'good' : bad ? 'bad' : ''}">${good ? '▼' : bad ? '▲' : '●'} ${signed(t.delta7)} ${unit} in 7 Tagen</span>`;
    };

    el.innerHTML = `
      <div class="grid two">
        <div class="card body-hero tap" data-go="#/body">
          <div class="row spread"><b>Körper</b><button class="btn sm" data-add-body style="background:rgba(255,255,255,.15);border-color:transparent;color:#fff">+ Messung</button></div>
          ${w ? `
          <div class="row" style="gap:26px;margin-top:10px;align-items:flex-end">
            <div><div class="big">${n1(w.last)} <small style="font-size:1rem">kg</small></div>${trend(w, 'kg')}</div>
            ${f ? `<div><div class="big" style="font-size:1.5rem">${n1(f.last)} <small style="font-size:.9rem">% Fett</small></div>${trend(f, '%')}</div>` : ''}
          </div>
          <div class="muted small" style="margin-top:6px">Zuletzt gemessen ${ago(w.lastAt)}</div>` : `<p class="muted">Noch keine Messung. Tippe auf „+ Messung“.</p>`}
        </div>
        <div class="card tap" data-go="#/rewards">
          <div class="level">
            <div class="badge-lvl">${r.level}</div>
            <div class="grow">
              <b>${esc(r.title)}${prof.display_name ? '-' + esc(prof.display_name) : ''}</b>
              <div class="muted small">${n0(r.into)} / ${n0(r.span)} Punkte bis Level ${r.level + 1}</div>
              <div class="bar" style="margin-top:6px"><i style="width:${r.pct.toFixed(1)}%"></i></div>
            </div>
          </div>
          <div class="row spread" style="margin-top:14px">
            <div><div class="muted small">${esc(fmtMonth(now))}</div><b>${month.days} Trainings · ${tons(month.volume)}${month.sauna?.count ? ` · ${month.sauna.count} Sauna` : ''}</b></div>
            <div class="muted small" style="text-align:right">${r.earned.length} Abzeichen<br>${r.records.length} Rekorde</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="row spread">
          <div><span class="muted small">Schritte heute</span><div style="font-weight:800;font-size:1.2rem">${stepsToday ? n0(stepsToday.steps) : '–'}</div></div>
          <button class="btn sm" data-steps>${stepsToday ? 'Ändern' : '+ Eintragen'}</button>
        </div>
      </div>

      <div data-geo-box></div>
      <h2>Studios</h2>
      <div class="stack" id="gyms">
        ${gyms.map(g => `
          <a class="card tap gym-row" href="#/gym/${g.id}" style="text-decoration:none;color:inherit;display:flex">
            <div class="gym-ico" ${g.photo_path ? `data-gym-photo="${g.id}"` : ''}>${icon('building', 24)}</div>
            <div class="grow"><b>${esc(g.name)}</b><div class="muted small">${exCount(g.id)} Übungen${lastVisit.get(g.id) ? ' · zuletzt ' + ago(lastVisit.get(g.id)) : ''}</div></div>
            <span class="muted">›</span>
          </a>`).join('')}
        <a class="card tap gym-row" href="#/gym/anywhere" style="text-decoration:none;color:inherit;display:flex">
          <div class="gym-ico" style="background:var(--accent-soft);color:#9a3412">${icon('globe', 24)}</div>
          <div class="grow"><b>Überall</b><div class="muted small">${exCount(null)} Übungen ohne Studio (Eigengewicht, Cardio)</div></div>
          <span class="muted">›</span>
        </a>
      </div>
      <button class="btn block" style="margin-top:10px" data-add-gym>+ Studio hinzufügen</button>

      ${recent.length ? `
      <h2>Letzte Rekorde</h2>
      <div class="card"><ul class="list">
        ${recent.map(x => `<li><span class="emoji">${icon('award', 18)}</span><div class="grow"><b>${esc(x.ex.name)}</b> <span class="muted small">${esc(gymName(x.ex.gym_id))}</span><div class="small">${setText(x.set, x.ex.kind)} · ${ago(x.set.performed_at)}</div></div></li>`).join('')}
      </ul></div>` : ''}
    `;

    detectGym(el, data.gyms);
    el.querySelectorAll('[data-gym-photo]').forEach(async ic => {
      const u = await db.photoUrl(gymPhotoKey(ic.dataset.gymPhoto));
      if (u) ic.innerHTML = `<img src="${u}" alt="">`;
    });
    el.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', e => { if (!e.target.closest('button')) location.hash = c.dataset.go; }));
    el.querySelector('[data-add-body]').onclick = async e => { e.stopPropagation(); if (await openBodyEntry()) ctx.refresh(); };
    el.querySelector('[data-steps]').onclick = async () => { if (await openStepsEntry()) ctx.refresh(); };
    el.querySelector('[data-add-gym]').onclick = async () => {
      const name = await modal((m, close) => {
        m.innerHTML = `<h2>Neues Studio</h2><label class="field"><span>Name</span><input class="input" autofocus placeholder="z. B. Hotelgym Ferien"></label>
          <div class="actions"><button class="btn" data-x>Abbrechen</button><button class="btn primary" data-ok>Speichern</button></div>`;
        const inp = m.querySelector('input');
        m.querySelector('[data-x]').onclick = () => close(null);
        m.querySelector('[data-ok]').onclick = () => close(inp.value.trim());
        inp.onkeydown = e => { if (e.key === 'Enter') close(inp.value.trim()); };
      });
      if (!name) return;
      await db.put('gyms', { name, sort: data.gyms.length, lat: null, lng: null });
      toast(`Studio „${esc(name)}“ angelegt`);
      ctx.refresh();
    };
  },
};

/**
 * Standort-Erkennung: Ist die Ortung erlaubt, wird das Studio in der Nähe einmal pro
 * App-Start automatisch geöffnet. Sonst gibt es einen Knopf, der danach fragt.
 */
async function detectGym(el, gyms) {
  const withGeo = gyms.filter(g => g.lat != null);
  const box = el.querySelector('[data-geo-box]');
  if (!withGeo.length || !box) return;
  let done = false;
  try { done = sessionStorage.getItem('geo.autoDone') === '1'; } catch { /* egal */ }
  const open = (gym) => {
    try { sessionStorage.setItem('geo.autoDone', '1'); sessionStorage.setItem('geo.detected', gym.id); } catch { /* egal */ }
    location.hash = `#/gym/${gym.id}`;
  };
  const state = await permissionState();
  if (state === 'granted' && !done) {
    try {
      const pos = await currentPosition({ timeout: 8000 });
      const hit = nearestGym(withGeo, pos);
      try { sessionStorage.setItem('geo.autoDone', '1'); } catch { /* egal */ }
      if (hit && ['', '#', '#/'].includes(location.hash)) open(hit.gym);
    } catch { /* still: dann eben von Hand */ }
    return;
  }
  if (state === 'prompt' || (state === 'granted' && done)) {
    box.innerHTML = `<button class="btn block" data-locate style="margin-top:12px">${icon('pin', 18)} Studio per Standort finden</button>`;
    box.querySelector('[data-locate]').onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Suche Standort …';
      try {
        const pos = await currentPosition({ timeout: 10000 });
        const hit = nearestGym(withGeo, pos);
        if (hit) open(hit.gym);
        else { toast('Kein gespeichertes Studio in der Nähe'); b.disabled = false; b.innerHTML = `${icon('pin', 18)} Studio per Standort finden`; }
      } catch (err) { toast(esc(err.message)); b.disabled = false; b.innerHTML = `${icon('pin', 18)} Studio per Standort finden`; }
    };
  }
}
