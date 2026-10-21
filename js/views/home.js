import * as db from '../db.js';
import { snapshot, rewards, profile, saveProfile, stepGoal, gymName, latestBadges, createStudio, SAUNA_SUGGESTIONS } from '../data.js';
import { bodyTrend, sessions, periodSummary, dayKey, weekKey, dayFromKey } from '../stats.js';
import { setTop, esc, n1, n0, signed, ago, tons, modal, toast, setText } from '../ui.js';
import { openBodyEntry, openStepsEntry } from './body.js';
import { gymPhotoKey } from './gym.js';
import { icon, globeIcon } from '../icons.js';
import { getMode } from '../app.js';
import { permissionState, currentPosition, nearestGym } from '../geo.js';

export default {
  render(el, _p, ctx) {
    const data = snapshot();
    const prof = profile();
    const r = rewards();
    setTop({ title: prof.display_name ? `Hallo ${prof.display_name}` : 'BENA Fit' });

    const exById = new Map(data.exercises.map(e => [e.id, e]));
    const sess = sessions(data.sets, exById);
    const lastVisit = new Map();
    for (const s of sess) lastVisit.set(s.gym_id || 'anywhere', s.startTs);
    // Saunagänge zählen auch als Besuch im Studio
    const saunaGym = new Map(data.saunaExercises.map(e => [e.id, e.gym_id || 'anywhere']));
    const saunaToday = new Map();
    for (const s of data.sauna) {
      const g = saunaGym.get(s.exercise_id), ts = Date.parse(s.performed_at);
      if (!g) continue;
      if (ts > (lastVisit.get(g) || 0)) lastVisit.set(g, ts);
      if (dayKey(s.performed_at) === dayKey(new Date())) saunaToday.set(g, (saunaToday.get(g) || 0) + 1);
    }
    const saunaText = id => { const n = saunaToday.get(id); return n ? ` (${n} ${n === 1 ? 'Saunagang' : 'Saunagänge'})` : ''; };
    const gyms = [...data.gyms].sort((a, b) => (lastVisit.get(b.id) || 0) - (lastVisit.get(a.id) || 0));
    const exCount = id => data.exercises.filter(e => (e.gym_id || null) === id && !e.archived).length;

    const w = bodyTrend(data.body, 'weight_kg');
    const f = bodyTrend(data.body, 'fat_pct');
    const now = new Date();
    const weekStart = dayFromKey(weekKey(now));
    const week = periodSummary(data, weekStart, now);
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
        ${stepsCard(r.steps, stepsToday)}
      </div>

      <div class="row spread" style="margin-top:22px;align-items:baseline"><h2 style="margin:0">Studios</h2>
        ${gyms.length ? `<a class="week-line small" href="#/stats">${weekLine(week)}</a>` : ''}</div>
      ${gyms.length ? '' : '<div data-first-gym style="margin-top:10px"></div>'}
      <div class="stack" id="gyms" style="margin-top:10px">
        ${gyms.map(g => `
          <a class="card tap gym-row" href="#/gym/${g.id}" style="text-decoration:none;color:inherit;display:flex">
            <div class="gym-ico" ${g.photo_path ? `data-gym-photo="${g.id}"` : ''}>${icon('building', 24)}</div>
            <div class="grow"><b>${esc(g.name)}</b><div class="muted small">${exCount(g.id)} Übungen${lastVisit.get(g.id) ? ' · zuletzt ' + ago(lastVisit.get(g.id)) : ''}${saunaText(g.id)}</div></div>
            <span class="muted">›</span>
          </a>`).join('')}
        <a class="card tap gym-row" href="#/gym/anywhere" style="text-decoration:none;color:inherit;display:flex">
          <div class="gym-ico">${globeIcon()}</div>
          <div class="grow"><b>Überall</b><div class="muted small">${exCount(null)} Übungen ohne Studio (Eigengewicht, Cardio)</div></div>
          <span class="muted">›</span>
        </a>
      </div>
      <button class="btn block" style="margin-top:10px" data-add-gym>+ Studio hinzufügen</button>
      <div data-geo-box></div>

      <div class="card tap" data-go="#/rewards" style="margin-top:22px">
        <div class="row spread" style="flex-wrap:wrap;gap:4px 12px"><b style="white-space:nowrap">Erfolge &amp; Rekorde</b><span class="muted small">${r.earned.length} Abzeichen · ${r.records.length} Rekorde</span></div>
        <div class="level" style="margin-top:10px">
          <div class="badge-lvl" aria-label="Level ${r.level}"><small>LEVEL</small><span>${r.level}</span></div>
          <div class="grow" style="min-width:0">
            <b>${esc(r.title)}</b>
            <div class="muted small">${r.rank.of ? `Stufe ${r.rank.sub} von ${r.rank.of}${r.rank.next ? ` · ${esc(r.rank.next.name)} ab Level ${r.rank.next.at}` : ''}` : 'Höchster Rang'}</div>
            <div class="bar" style="margin-top:6px"><i style="width:${r.pct.toFixed(1)}%"></i></div>
            <div class="muted small" style="margin-top:4px">noch ${n0(r.next - r.xp)} Punkte bis Level ${r.level + 1}</div>
          </div>
        </div>
        ${recent.length ? `<div class="rec-sub muted small">Letzte Rekorde</div>
        <ul class="list rec-list">
          ${recent.map(x => `<li><span class="emoji">${icon('award', 18)}</span><div class="grow" style="min-width:0"><b>${esc(x.ex.name)}</b> <span class="muted small">${esc(gymName(x.ex.gym_id))}</span><div class="small">${setText(x.set, x.ex.kind)} · ${ago(x.set.performed_at)}</div></div></li>`).join('')}
        </ul>` : ''}
        <div class="latest-badges" data-latest></div>
        ${r.near ? `<div class="near small">${icon(r.near.icon, 16)}<span>Fast geschafft: <b>${esc(r.near.title)}</b> <span class="muted">(${n0(r.near.prog[0])}/${n0(r.near.prog[1])})</span></span></div>` : ''}
      </div>
    `;

    detectGym(el, data.gyms);
    if (!gyms.length) firstGymCard(el.querySelector('[data-first-gym]'), ctx);
    latestBadges(3).then(list => {
      const box = el.querySelector('[data-latest]');
      if (box && list.length) box.innerHTML = list.map(b => `<span class="lb" title="${esc(b.desc)}">${icon(b.icon, 18)}<span>${esc(b.title)}</span></span>`).join('');
    });
    el.querySelectorAll('[data-gym-photo]').forEach(async ic => {
      const u = await db.photoUrl(gymPhotoKey(ic.dataset.gymPhoto));
      if (u) ic.innerHTML = `<img src="${u}" alt="">`;
    });
    el.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', e => { if (!e.target.closest('button')) location.hash = c.dataset.go; }));
    el.querySelector('[data-add-body]').onclick = async e => { e.stopPropagation(); if (await openBodyEntry()) ctx.refresh(); };
    el.querySelector('[data-steps]').onclick = async e => { e.stopPropagation(); if (await openStepsEntry()) ctx.refresh(); };
    el.querySelector('[data-goal]').onclick = async e => { e.stopPropagation(); if (await openStepGoal()) ctx.refresh(); };
    el.querySelector('[data-add-gym]').onclick = async () => {
      const r = await studioDialog('Neues Studio', 'z. B. Hotelgym Ferien');
      if (!r) return;
      await createStudio(r.name, r.saunas);
      toast(`Studio „${esc(r.name)}“ angelegt`);
      ctx.refresh();
    };
  },
};

/** Schritte-Ziel pro Tag ändern (zählt für Serie, Zieltage und Abzeichen). */
function openStepGoal() {
  const QUICK = [6000, 8000, 10000, 12000, 15000];
  return modal((m, close) => {
    m.innerHTML = `<h2>Schritte-Ziel pro Tag</h2>
      <div class="chips" data-quick>${QUICK.map(n => `<button type="button" class="chip ${n === stepGoal() ? 'on' : ''}" data-n="${n}">${n0(n)}</button>`).join('')}</div>
      <label class="field"><span>Eigenes Ziel</span><input class="input" type="number" inputmode="numeric" min="1000" max="50000" step="500" value="${stepGoal()}"></label>
      <p class="muted small">Zählt für die Serie «Tage in Folge», die Zieltage und die Schritte-Abzeichen.</p>
      <div class="actions"><button class="btn" data-x>Abbrechen</button><button class="btn primary" data-ok>Speichern</button></div>`;
    const inp = m.querySelector('input');
    m.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      inp.value = b.dataset.n;
      m.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x === b));
    });
    inp.oninput = () => m.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', +x.dataset.n === +inp.value));
    const save = async () => {
      const goal = Math.round(+inp.value / 100) * 100;
      if (!(goal >= 1000 && goal <= 50000)) { toast('Ziel bitte zwischen 1000 und 50 000'); return; }
      await saveProfile({ settings: { ...(profile().settings || {}), stepGoal: goal } });
      toast(`Neues Ziel: ${n0(goal)} Schritte`);
      close(true);
    };
    m.querySelector('[data-x]').onclick = () => close(false);
    m.querySelector('[data-ok]').onclick = save;
    inp.onkeydown = e => { if (e.key === 'Enter') save(); };
  });
}

/**
 * Leerer Zustand ohne Studio: führt zum eigenen Studio. In einem Konto erst nach dem ersten
 * Abgleich, sonst würde bei bestehenden Daten ein zweites Studio entstehen.
 */
async function firstGymCard(box, ctx) {
  if (!box) return;
  if (getMode() === 'cloud' && !(await db.getMeta('initialPullDone'))) {
    box.innerHTML = `<div class="card muted small">${navigator.onLine ? 'Deine Daten werden geladen …' : 'Sobald du online bist, werden deine Daten geladen.'}</div>`;
    const sync = await import('../sync.js');
    const off = sync.onStatus(st => { if (st.state === 'ok') { off(); if (box.isConnected) ctx.refresh(); } });
    return;
  }
  box.innerHTML = `<div class="card first-gym">
    <div class="gym-ico" style="margin-bottom:10px">${icon('building', 24)}</div>
    <b>Willkommen! Lege dein Studio an.</b>
    <p class="muted small">Dort erfasst du deine Geräte, Gewichte und Wiederholungen. Weitere Studios kannst du jederzeit hinzufügen.</p>
    <button class="btn primary block" data-first>Dein Studio anlegen</button></div>`;
  box.querySelector('[data-first]').onclick = async () => {
    const r = await studioDialog('Dein Studio', 'z. B. Fitness im Quartier', true);
    if (!r) return;
    if (!db.all('gyms').length) await createStudio(r.name, r.saunas);
    toast(`Studio „${esc(r.name)}“ angelegt`);
    ctx.refresh();
  };
}

/** Dialog für Studio-Name und (optional) Sauna-Arten. Liefert { name, saunas } oder null. */
function studioDialog(title, placeholder, withSauna = false) {
  return modal((m, close) => {
    m.innerHTML = `<h2>${title}</h2>
      <label class="field"><span>Name</span><input class="input" data-name autofocus placeholder="${placeholder}"></label>
      ${withSauna ? `<div class="field"><span>Sauna oder Dampfbad im Studio? (optional)</span>
        <div class="chips" data-saunas>${SAUNA_SUGGESTIONS.map(n => `<button type="button" class="chip" data-s="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <input class="input" data-own placeholder="Weitere, mit Komma trennen" style="margin-top:8px"></div>` : ''}
      <div class="actions"><button class="btn" data-x>Abbrechen</button><button class="btn primary" data-ok>Speichern</button></div>`;
    const name = m.querySelector('[data-name]');
    m.querySelectorAll('[data-s]').forEach(b => b.onclick = () => b.classList.toggle('on'));
    const done = () => {
      const v = name.value.trim();
      if (!v) { toast('Bitte einen Namen eingeben'); name.focus(); return; }
      const saunas = [...m.querySelectorAll('[data-s].on')].map(b => b.dataset.s);
      const own = m.querySelector('[data-own]');
      if (own) saunas.push(...own.value.split(',').map(x => x.trim()).filter(Boolean));
      close({ name: v, saunas });
    };
    m.querySelector('[data-x]').onclick = () => close(null);
    m.querySelector('[data-ok]').onclick = done;
    name.onkeydown = e => { if (e.key === 'Enter') done(); };
  });
}

/**
 * Standort-Erkennung: Ist die Ortung erlaubt, wird das Studio in der Nähe einmal pro
 * App-Start automatisch geöffnet. Sonst gibt es einen Knopf, der danach fragt.
 */
/** Kurze Wochenbilanz über den Studios; ein Tipp öffnet die Statistik. */
function weekLine(week) {
  const sauna = week.sauna?.count || 0;
  return `Diese Woche: ${week.days} ${week.days === 1 ? 'Training' : 'Trainings'}${sauna ? ` · ${sauna} Sauna` : ''}${week.volume ? ` · ${tons(week.volume)}` : ''} ›`;
}

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Schritte-Karte: Ring bis zum Ziel, Serie in Folge und die laufende Woche. */
function stepsCard(st, entry) {
  const pct = Math.min(1, st.today / st.goal), R = 40, C = 2 * Math.PI * R;
  const goal = n0(st.goal);
  const streakText = st.current
    ? `<b>${st.current} ${st.current === 1 ? 'Tag' : 'Tage'} in Folge</b><div class="muted small">${st.todayDone ? 'Heute geschafft!' : `Heute noch ${n0(st.remaining)}, damit die Serie weiterläuft`}</div>`
    : `<b>Noch keine Serie</b><div class="muted small">${st.todayDone ? 'Heute geschafft – die Serie beginnt!' : `Ab ${goal} Schritten am Tag beginnt sie`}</div>`;
  return `
        <div class="card steps-card tap" data-go="#/body">
          <div class="row spread"><b>Schritte</b><div class="row" style="gap:8px"><button class="btn sm" data-goal>Ziel</button><button class="btn sm" data-steps>${entry ? 'Ändern' : '+ Eintragen'}</button></div></div>
          <div class="row" style="gap:16px;margin-top:8px;align-items:center">
            <svg class="steps-ring" viewBox="0 0 100 100" width="104" height="104" aria-label="${n0(st.today)} von ${goal} Schritten">
              <circle cx="50" cy="50" r="${R}" class="track"/>
              ${pct > 0 ? `<circle cx="50" cy="50" r="${R}" class="fill ${st.todayDone ? 'done' : ''}" stroke-dasharray="${(pct * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/>` : ''}
              <text x="50" y="49" class="num">${st.today ? n0(st.today) : '–'}</text>
              <text x="50" y="65" class="sub">von ${goal}</text>
            </svg>
            <div class="grow" style="min-width:0">
              <div class="streak ${st.current ? 'on' : ''}">${icon('flame', 22)}<div>${streakText}</div></div>
              <div class="muted small" style="margin-top:6px">Beste Serie ${st.best} ${st.best === 1 ? 'Tag' : 'Tage'} · ${st.goalDays} Zieltage</div>
            </div>
          </div>
          <div class="week-dots">${st.week.map((d, i) => `<div class="wd ${d.state}" title="${d.steps ? n0(d.steps) + ' Schritte' : ''}"><i></i><span>${WD[i]}</span></div>`).join('')}</div>
        </div>`;
}

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
    box.innerHTML = `<button class="btn block" data-locate style="margin-top:10px">${icon('pin', 18)} Studio per Standort finden</button>`;
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
