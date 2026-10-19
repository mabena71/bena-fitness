import { rewards, profile, snapshot } from '../data.js';
import { XP } from '../rewards.js';
import { periodSummary, monthRange, monthKey } from '../stats.js';
import { setTop, esc, n0, MUSCLES, fmtMonth, tons, signed, n1 } from '../ui.js';
import { icon } from '../icons.js';

export default {
  render(el) {
    setTop({ title: 'Erfolge' });
    const r = rewards();
    const prof = profile();
    const data = snapshot();
    const cats = [...new Set(r.badges.map(b => b.cat))];

    // Monate mit Aktivität (neueste zuerst)
    const months = new Set([...data.sets.map(s => monthKey(s.performed_at)), ...data.body.map(b => monthKey(b.measured_at))]);
    const monthList = [...months].sort().reverse().slice(0, 12);
    const years = [...new Set(monthList.map(m => m.slice(0, 4)))];

    el.innerHTML = `
      <div class="card">
        <div class="level">
          <div class="badge-lvl" style="width:70px;height:70px;font-size:1.7rem">${r.level}</div>
          <div class="grow">
            <div style="font-size:1.2rem;font-weight:800">Level ${r.level} · ${esc(r.title)}</div>
            ${r.rank.next ? `<div class="muted small">Nächster Rang: ${esc(r.rank.next.name)} ab Level ${r.rank.next.at}</div>` : ''}
            <div class="muted small">${n0(r.xp)} Punkte · noch ${n0(r.next - r.xp)} bis Level ${r.level + 1}</div>
            <div class="bar" style="margin-top:8px;height:12px"><i style="width:${r.pct.toFixed(1)}%"></i></div>
          </div>
        </div>
        <details style="margin-top:12px"><summary class="muted small" style="cursor:pointer">Wie bekomme ich Punkte?</summary>
          <p class="small muted">Satz ${XP.set} · Aufwärmsatz ${XP.warmup} · Training ${XP.session} · Messtag ${XP.measure} · Schritte bis 15 pro Tag · Rekord ${XP.record} · Körper-Rekord ${XP.bodyRecord} · Abzeichen ${XP.badge} · Saunagang ${XP.sauna}</p>
        </details>
      </div>

      <div class="grid two" style="margin-top:12px">
        <div class="card">
          <div class="card-title"><h3>Level pro Kategorie</h3></div>
          ${r.muscles.filter(m => m.key !== 'cardio' && m.key !== 'recovery').map(m => `<div class="hbar" style="grid-template-columns:120px 1fr 64px"><span class="name">${MUSCLES[m.key].label}</span>
            <div class="bar teal"><i style="width:${m.pct.toFixed(1)}%"></i></div><span class="v">Lvl ${m.level}</span></div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title"><h3>Rückblicke</h3></div>
          <a class="btn block" style="margin-bottom:10px" href="#/challenge">${icon('crown', 18)} Paar-Challenge</a>
          ${years.map(y => `<a class="btn block accent" style="margin-bottom:10px" href="#/review/year/${y}">${icon('sparkle', 18)} Jahresrückblick ${y}</a>`).join('')}
          ${monthList.length ? `<ul class="list">${monthList.map(m => {
            const [y, mo] = m.split('-').map(Number);
            const [a, b] = monthRange(y, mo - 1);
            const s = periodSummary(data, a, b);
            return `<li><a class="grow row spread" href="#/review/month/${m}" style="color:inherit;text-decoration:none">
              <span><b>${esc(fmtMonth(a))}</b><div class="muted small">${s.days} Trainings · ${tons(s.volume)}${s.bodyDelta.weight_kg != null ? ` · ${signed(s.bodyDelta.weight_kg)} kg` : ''}</div></span><span class="muted">›</span></a></li>`;
          }).join('')}</ul>` : '<p class="muted small">Noch keine Daten.</p>'}
        </div>
      </div>

      ${cats.map(c => {
        const list = r.badges.filter(b => b.cat === c);
        return `<h2>${esc(c)} <span class="muted small">${list.filter(b => b.done).length}/${list.length}</span></h2>
        <div class="badges">${list.map(b => `<div class="badge ${b.done ? '' : 'locked'}" title="${esc(b.desc)}"><div class="e">${icon(b.icon, 26)}</div><div class="t">${esc(b.title)}</div><div class="s">${esc(b.desc)}</div></div>`).join('')}</div>`;
      }).join('')}
      <p class="muted small center" style="margin-top:18px">${r.records.length} Trainings-Rekorde · ${r.bodyRecords.length} Körper-Rekorde · ${n1(r.earned.length / r.badges.length * 100)} % der Abzeichen</p>`;
  },
};
