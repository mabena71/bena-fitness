// Etappe 6a: Paar-Challenge. Wöchentliches Duell nur mit Kennzahlen.
import { setTop, esc, n0, n1, toast, confirmDialog, fmtDay } from '../ui.js';
import { icon } from '../icons.js';
import { challengeScore, weekKey, addDays, dayFromKey } from '../stats.js';
import { getMode } from '../app.js';

const WEEKS_BACK = 8;

export async function loadWeek(sync, weekStart) {
  const rows = await sync.rpc('challenge_week', { p_week_start: weekStart });
  const me = rows.find(r => r.is_me), partner = rows.find(r => !r.is_me);
  if (!me || !partner) return null;
  return { me, partner, score: challengeScore(me, partner), week: weekStart };
}

export default {
  async render(el, _p, ctx) {
    setTop({ title: 'Paar-Challenge', back: '#/rewards' });
    if (getMode() !== 'cloud') {
      el.innerHTML = `<div class="card"><div class="row">${icon('crown', 28)}<div class="grow"><b>Braucht ein Konto</b>
        <p class="muted small" style="margin:4px 0 0">Die Paar-Challenge funktioniert, sobald ihr beide mit eurem Konto angemeldet seid (Etappe 3). Verglichen werden nur Trainingstage, Schritte und die Gewichtsveränderung in Prozent – nie einzelne Werte.</p></div></div></div>`;
      return;
    }
    const sync = await import('../sync.js');
    el.innerHTML = '<p class="muted center pad">Lädt …</p>';
    let partner = null;
    try { partner = await sync.rpc('my_partner'); } catch (e) { el.innerHTML = `<div class="card"><b>Nicht erreichbar.</b><p class="muted small">${esc(e.message)}</p></div>`; return; }

    if (!partner) {
      el.innerHTML = `
        <div class="card">
          <div class="row">${icon('crown', 28)}<div class="grow"><b>Wochenduell zu zweit</b>
          <p class="muted small" style="margin:4px 0 0">Jede Woche (Mo–So) werden drei Kategorien verglichen: Trainingstage, Schritte und Gewichtsveränderung in %. Wer mehr Kategorien gewinnt, bekommt die Krone der Woche. Eure einzelnen Sätze und Messungen bleiben privat.</p></div></div>
        </div>
        <div class="grid two" style="margin-top:12px">
          <div class="card"><h3>Einladen</h3><p class="muted small">Erzeuge einen Code und gib ihn deiner Partnerin oder deinem Partner.</p>
            <div data-code class="center" style="font-size:2rem;font-weight:800;letter-spacing:.2em;margin:8px 0"></div>
            <button class="btn primary block" data-create>Code erzeugen</button></div>
          <div class="card"><h3>Code eingeben</h3><p class="muted small">Du hast einen Code bekommen?</p>
            <input class="input" data-input placeholder="z. B. A1B2C3" maxlength="6" style="text-transform:uppercase;letter-spacing:.15em;margin-bottom:10px">
            <button class="btn block" data-accept>Challenge starten</button></div>
        </div>`;
      el.querySelector('[data-create]').onclick = async () => {
        try { el.querySelector('[data-code]').textContent = await sync.rpc('create_invite'); toast('Code ist 7 Tage gültig'); }
        catch (e) { toast(esc(e.message)); }
      };
      el.querySelector('[data-accept]').onclick = async () => {
        try { await sync.rpc('accept_invite', { p_code: el.querySelector('[data-input]').value }); toast('Challenge gestartet!'); ctx.refresh(); }
        catch (e) { toast(esc(e.message)); }
      };
      return;
    }

    const thisWeek = weekKey(new Date());
    const weeks = [];
    for (let i = 0; i <= WEEKS_BACK; i++) weeks.push(weekKey(addDays(dayFromKey(thisWeek), -7 * i)));
    let results;
    try { results = (await Promise.all(weeks.map(w => loadWeek(sync, w)))).filter(Boolean); }
    catch (e) { el.innerHTML = `<div class="card"><b>Nicht erreichbar.</b><p class="muted small">${esc(e.message)}</p></div>`; return; }
    const cur = results.find(r => r.week === thisWeek);
    const past = results.filter(r => r.week !== thisWeek);
    const crownsMe = past.filter(r => r.score.winner === 'a').length;
    const crownsP = past.filter(r => r.score.winner === 'b').length;
    const nameMe = cur?.me.display_name || 'Ich';
    const nameP = cur?.partner.display_name || 'Partner';

    const val = (k, r) => k === 'days' ? `${r.training_days} Tage` : k === 'steps' ? n0(+r.steps) : r.weight_change_pct == null ? '–' : `${+r.weight_change_pct > 0 ? '+' : ''}${n1(+r.weight_change_pct)} %`;
    el.innerHTML = `
      <div class="card">
        <div class="card-title"><h3>Diese Woche</h3><span class="muted small">ab ${fmtDay(dayFromKey(thisWeek))}</span></div>
        ${cur ? `
        <div class="row spread" style="margin-bottom:10px"><b>${esc(nameMe)}</b><span class="num" style="font-size:1.6rem;font-weight:800">${cur.score.a} : ${cur.score.b}</span><b>${esc(nameP)}</b></div>
        ${cur.score.cats.map(c => `<div class="row spread" style="padding:8px 0;border-top:1px solid var(--line)">
          <span class="${c.winner === 'a' ? 'good' : ''}" style="font-weight:700;min-width:30%">${val(c.key, cur.me)}</span>
          <span class="muted small">${c.label}</span>
          <span class="${c.winner === 'b' ? 'good' : ''}" style="font-weight:700;min-width:30%;text-align:right">${val(c.key, cur.partner)}</span></div>`).join('')}
        <p class="muted small" style="margin-bottom:0">Gewicht: Veränderung des Wochenschnitts gegenüber der Vorwoche – weniger gewinnt.</p>` : '<p class="muted small">Noch keine Daten.</p>'}
      </div>
      <div class="card">
        <div class="card-title"><h3>${icon('crown', 18)} Kronen-Bilanz</h3><span class="muted small">letzte ${WEEKS_BACK} Wochen</span></div>
        <div class="row spread"><b>${esc(nameMe)}: ${crownsMe}</b><b>${esc(nameP)}: ${crownsP}</b></div>
        <ul class="list" style="margin-top:8px">${past.map(r => `<li><span class="grow small">${fmtDay(dayFromKey(r.week))}</span><span class="num small">${r.score.a} : ${r.score.b}</span>
          <span style="width:90px;text-align:right" class="small">${r.score.winner === 'a' ? `${icon('crown', 14)} ${esc(nameMe)}` : r.score.winner === 'b' ? `${icon('crown', 14)} ${esc(nameP)}` : 'unentschieden'}</span></li>`).join('')}</ul>
      </div>
      <button class="btn block danger" style="margin-top:12px" data-end>Challenge beenden</button>`;
    el.querySelector('[data-end]').onclick = async () => {
      if (!(await confirmDialog('Challenge beenden? Ihr seht danach keine Kennzahlen des anderen mehr.', 'Beenden'))) return;
      try { await sync.rpc('end_partnership'); toast('Challenge beendet'); ctx.refresh(); } catch (e) { toast(esc(e.message)); }
    };
  },
};

