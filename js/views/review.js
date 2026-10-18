import { snapshot, rewards, profile, gymName } from '../data.js';
import { periodSummary, monthRange, yearRange } from '../stats.js';
import { setTop, esc, n0, n1, tons, signed, fmtMonth, setText, fmtDay, confetti } from '../ui.js';
import * as fun from '../fun.js';
import { icon } from '../icons.js';

const GRADIENTS = [
  'linear-gradient(160deg,#2350c8,#1a3a99)', 'linear-gradient(160deg,#1e293b,#0f172a)', 'linear-gradient(160deg,#3b6fe0,#2350c8)',
  'linear-gradient(160deg,#1a3a99,#0f1f5c)', 'linear-gradient(160deg,#334155,#1e293b)', 'linear-gradient(160deg,#2c5fd6,#1a3a99)',
  'linear-gradient(160deg,#3b6fe0,#1a3a99)', 'linear-gradient(160deg,#1e293b,#0f172a)',
];

export default {
  render(el, [kind, key]) {
    const data = snapshot();
    if (kind === 'month') return renderMonth(el, data, key);
    return renderYear(el, data, +key);
  },
};

function renderMonth(el, data, key) {
  const [y, m] = key.split('-').map(Number);
  const [a, b] = monthRange(y, m - 1);
  const s = periodSummary(data, a, b);
  setTop({ title: fmtMonth(a), back: '#/rewards' });
  const w = s.bodyDelta.weight_kg, f = s.bodyDelta.fat_pct;
  const lines = [];
  if (s.volume) lines.push(`${icon('weight', 18)} ${tons(s.volume)} bewegt – ${esc(fun.heavy(s.volume))}.`);
  if (w != null && w < -0.1) lines.push(`${icon('trendDown', 18)} ${n1(-w)} kg leichter – das ist ${esc(fun.loss(-w))}.`);
  if (s.cardioKm) lines.push(`${icon('route', 18)} ${n1(s.cardioKm)} km Cardio – ${esc(fun.distance(s.cardioKm))}.`);
  if (s.sauna.count) lines.push(`${icon('steam', 18)} ${s.sauna.count} Saunagänge, zusammen ${n0(s.sauna.minutes)} Minuten.`);
  if (s.stepsTotal) lines.push(`${icon('steps', 18)} ${n0(s.stepsTotal)} Schritte – etwa ${esc(fun.steps(s.stepsTotal))}.`);

  el.innerHTML = `
    <div class="card" style="background:${GRADIENTS[(m - 1) % GRADIENTS.length]};color:#fff">
      <div style="opacity:.8;font-weight:700">${esc(fmtMonth(a))}</div>
      <div style="font-size:1.6rem;font-weight:800;margin-top:6px">${s.days} Trainings · ${tons(s.volume)} · ${s.records.length} Rekorde</div>
      <div style="margin-top:6px;opacity:.9">${s.avgDuration ? `Ø ${n0(s.avgDuration)} Min. pro Training` : ''}${w != null ? ` · ${signed(w)} kg` : ''}${f != null ? ` · ${signed(f)} % Fett` : ''}</div>
    </div>
    <div class="kpis" style="margin-top:12px">
      <div class="kpi"><div class="l">Trainingstage</div><div class="v">${s.days}</div></div>
      <div class="kpi"><div class="l">Gewicht (Ø 7 T.)</div><div class="v ${w < -0.05 ? 'good' : w > 0.05 ? 'bad' : ''}">${w != null ? signed(w) : '–'} <small style="font-size:.85rem">kg</small></div></div>
      <div class="kpi"><div class="l">Fettanteil</div><div class="v ${f < -0.05 ? 'good' : f > 0.05 ? 'bad' : ''}">${f != null ? signed(f) : '–'} <small style="font-size:.85rem">%</small></div></div>
      <div class="kpi"><div class="l">Stärkste Steigerung</div><div class="v" style="font-size:1.05rem">${s.topProgress && s.topProgress.pct > 0 ? `${esc(s.topProgress.ex.name)} +${n0(s.topProgress.pct)} %` : '–'}</div></div>
    </div>
    ${lines.length ? `<div class="card" style="margin-top:12px"><div class="stack">${lines.map(l => `<div>${l}</div>`).join('')}</div></div>` : ''}
    ${s.records.length ? `<div class="card"><div class="card-title"><h3>Rekorde im ${esc(fmtMonth(a).split(' ')[0])}</h3></div><ul class="list">
      ${s.records.slice(-10).reverse().map(r => `<li><span class="emoji">${icon('award', 18)}</span><div class="grow"><b>${esc(r.ex.name)}</b> <span class="muted small">${esc(gymName(r.ex.gym_id))}</span><div class="small">${setText(r.set, r.ex.kind)} · ${fmtDay(r.set.performed_at)}</div></div></li>`).join('')}
    </ul></div>` : ''}
    ${s.favorite ? `<div class="card"><b>Lieblingsübung:</b> ${esc(s.favorite.ex.name)} (${s.favorite.days}×)</div>` : ''}`;
}

function renderYear(el, data, y) {
  const [a, b] = yearRange(y);
  const s = periodSummary(data, a, b);
  const r = rewards();
  const prof = profile();
  const name = prof.display_name || '';
  setTop({ title: `Rückblick ${y}`, back: '#/rewards' });
  const gyms = new Set(s.sessions.filter(x => x.gym_id).map(x => x.gym_id));
  const w = s.bodyDelta.weight_kg, f = s.bodyDelta.fat_pct;

  const slides = [
    { e: 'sparkle', k: `Dein Jahr ${y}`, mid: name ? `${esc(name)}, das war dein Fitnessjahr!` : 'Das war dein Fitnessjahr!', sub: 'Tippe rechts für weiter, links für zurück.' },
    { e: 'calendar', k: 'Trainings', big: n0(s.days), sub: `Trainingstage in ${gyms.size} ${gyms.size === 1 ? 'Studio' : 'Studios'} – im Schnitt ${n0(s.avgDuration || 0)} Minuten.` },
    s.volume ? { e: 'weight', k: 'Bewegt', big: tons(s.volume), sub: `Das ist ${esc(fun.heavy(s.volume))}.` } : null,
    s.bestMonth ? { e: 'flame', k: 'Bester Monat', mid: esc(fmtMonth(new Date(+s.bestMonth.month.slice(0, 4), +s.bestMonth.month.slice(5) - 1, 1))), sub: `${s.bestMonth.days} Trainingstage – da warst du kaum zu bremsen.` } : null,
    s.favorite ? { e: 'heart', k: 'Lieblingsgerät', mid: esc(s.favorite.ex.name), sub: `${s.favorite.days}× benutzt · ${esc(gymName(s.favorite.ex.gym_id))}` } : null,
    s.records.length ? { e: 'award', k: 'Rekorde', big: n0(s.records.length), sub: s.biggestRecord ? `Der grösste: ${esc(s.biggestRecord.ex.name)} mit ${setText(s.biggestRecord.set, s.biggestRecord.ex.kind)} (vorher ${setText(s.biggestRecord.prev, s.biggestRecord.ex.kind)}).` : '' } : null,
    s.topProgress && s.topProgress.pct > 0 ? { e: 'trendUp', k: 'Stärkste Steigerung', mid: `${esc(s.topProgress.ex.name)}`, big: `+${n0(s.topProgress.pct)} %`, sub: `von ${n1(s.topProgress.first)} auf ${n1(s.topProgress.last)}` } : null,
    w != null && w < -0.1 ? { e: 'trendDown', k: 'Leichter geworden', big: `−${n1(-w)} kg`, sub: `Das ist ${esc(fun.loss(-w))}${f != null && f < -0.1 ? ` – und ${n1(-f)} Prozentpunkte weniger Fett!` : '.'}` } : null,
    s.stepsTotal ? { e: 'steps', k: 'Schritte', big: n0(s.stepsTotal), sub: `Damit bist du ${esc(fun.steps(s.stepsTotal))} gelaufen.` } : null,
    s.sauna.count ? { e: 'steam', k: 'Sauna', big: n0(s.sauna.count), sub: `Saunagänge mit zusammen ${n0(s.sauna.minutes)} Minuten${s.sauna.byType[0] ? ` – am liebsten ${esc(s.sauna.byType[0].ex.name)}` : ''}.` } : null,
    s.cardioKm ? { e: 'route', k: 'Cardio', big: `${n1(s.cardioKm)} km`, sub: `${esc(fun.distance(s.cardioKm))}` } : null,
    { e: 'trophy', k: 'Dein Level', big: r.level, mid: `${esc(r.title)}${name ? '-' + esc(name) : ''}`, sub: `${r.earned.length} von ${r.badges.length} Abzeichen gesammelt.` },
    { e: 'arrow', k: `Auf ${y + 1}!`, mid: 'Weiter so!', sub: 'Tippe, um den Rückblick zu schliessen.' },
  ].filter(Boolean);

  el.innerHTML = '<p class="muted center pad">Rückblick läuft …</p>';
  const story = document.createElement('div');
  story.className = 'story';
  document.body.appendChild(story);
  let i = 0;
  const close = () => { story.remove(); location.hash = '#/rewards'; };
  const draw = () => {
    const sl = slides[i];
    story.style.background = GRADIENTS[i % GRADIENTS.length];
    story.innerHTML = `<div class="progress">${slides.map((_, k) => `<i class="${k <= i ? 'done' : ''}"></i>`).join('')}</div>
      <button class="icon-btn close" aria-label="Schliessen">${icon('x', 26)}</button>
      <div class="slide"><div class="e">${icon(sl.e, 64)}</div><div class="k">${sl.k}</div>${sl.big != null ? `<div class="big">${sl.big}</div>` : ''}${sl.mid ? `<div class="mid">${sl.mid}</div>` : ''}<div class="sub">${sl.sub || ''}</div></div>
      <div class="hint">${i + 1} / ${slides.length}</div>`;
    story.querySelector('.close').onclick = e => { e.stopPropagation(); close(); };
    if (i === slides.length - 2) confetti(90);
  };
  story.addEventListener('click', e => {
    if (e.clientX < window.innerWidth * 0.3) i = Math.max(0, i - 1);
    else if (i === slides.length - 1) return close();
    else i++;
    draw();
  });
  const onKey = e => { if (e.key === 'ArrowRight') { i = Math.min(slides.length - 1, i + 1); draw(); } if (e.key === 'ArrowLeft') { i = Math.max(0, i - 1); draw(); } if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  draw();
  return () => { story.remove(); document.removeEventListener('keydown', onKey); };
}
