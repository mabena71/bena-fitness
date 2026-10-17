import * as db from '../db.js';
import { profile, saveProfile } from '../data.js';
import { setTop, esc, toast, confirmDialog, downloadFile } from '../ui.js';
import { getMode, setMode, MODES } from '../app.js';
import { setsCsv, bodyCsv, stepsCsv } from '../csv.js';

const EMOJIS = ['💪', '🏋️', '🔥', '⚡', '🦁', '🐻', '🦊', '🌟', '🚀', '🧘'];

export default {
  async render(el, _p, ctx) {
    setTop({ title: 'Mehr' });
    const p = profile();
    const mode = getMode();
    const pending = await db.pendingCount();
    const stamp = new Date().toISOString().slice(0, 10);

    el.innerHTML = `
      <div class="card">
        <div class="card-title"><h3>Profil</h3></div>
        <label class="field"><span>Name</span><input class="input" data-name value="${esc(p.display_name || '')}" placeholder="z. B. Maurice"></label>
        <div class="field"><span>Symbol</span><div class="chips">${EMOJIS.map(e => `<button class="chip ${p.avatar_emoji === e ? 'on' : ''}" data-emoji="${e}">${e}</button>`).join('')}</div></div>
        <button class="btn primary" data-save>Speichern</button>
      </div>

      <div class="card">
        <div class="card-title"><h3>Daten exportieren</h3></div>
        <p class="muted small">Als CSV-Datei, die du direkt in Excel öffnen kannst.</p>
        <div class="row wrap">
          <button class="btn" data-csv="sets">🏋️ Trainings</button>
          <button class="btn" data-csv="body">⚖️ Körper</button>
          <button class="btn" data-csv="steps">👟 Schritte</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>Speicherort</h3></div>
        <p class="small">Aktuell: <b>${esc(MODES[mode].label)}</b>${mode === 'demo' ? ' – mit Beispieldaten' : ''}</p>
        ${mode === 'local' ? `<p class="muted small">Die Daten liegen nur in diesem Browser. Mit dem Login (Etappe 3) werden sie auf Handy und PC synchronisiert; ${pending} Einträge sind dafür vorgemerkt.</p>` : ''}
        <div class="row wrap">
          ${mode === 'demo' ? '<button class="btn primary" data-mode="local">Eigenes Tagebuch starten</button><button class="btn" data-reset>Demo zurücksetzen</button>' : '<button class="btn" data-mode="demo">Demo ansehen</button>'}
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>Bald verfügbar</h3></div>
        <ul class="list">
          <li><span class="emoji">☁️</span><div class="grow"><b>Login und Sync</b><div class="muted small">Gleiche Daten auf Handy und PC, getrennte Konten für Maurice und Sabine</div></div></li>
          <li><span class="emoji">📍</span><div class="grow"><b>Studio per Standort</b><div class="muted small">Öffnet automatisch das Studio, in dem du gerade bist</div></div></li>
          <li><span class="emoji">⚖️</span><div class="grow"><b>Withings</b><div class="muted small">Gewicht, Fett und Schritte automatisch übernehmen</div></div></li>
          <li><span class="emoji">👑</span><div class="grow"><b>Paar-Challenge</b><div class="muted small">Wochenduell nur mit Kennzahlen</div></div></li>
          <li><span class="emoji">🔔</span><div class="grow"><b>Benachrichtigungen</b><div class="muted small">Wochenbilanz am Sonntag und Erinnerungen</div></div></li>
        </ul>
      </div>
      <p class="muted small center">Fitness-Tagebuch · Version 0.2 (Etappen 1–2)</p>`;

    let emoji = p.avatar_emoji || '💪';
    el.querySelectorAll('[data-emoji]').forEach(b => b.onclick = () => { emoji = b.dataset.emoji; el.querySelectorAll('[data-emoji]').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelector('[data-save]').onclick = async () => {
      await saveProfile({ display_name: el.querySelector('[data-name]').value.trim(), avatar_emoji: emoji });
      toast('Profil gespeichert');
      ctx.refresh();
    };
    el.querySelectorAll('[data-csv]').forEach(b => b.onclick = () => {
      const k = b.dataset.csv;
      const content = k === 'sets' ? setsCsv() : k === 'body' ? bodyCsv() : stepsCsv();
      downloadFile(`fitness-${k === 'sets' ? 'trainings' : k === 'body' ? 'koerper' : 'schritte'}-${stamp}.csv`, content);
    });
    el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
    const reset = el.querySelector('[data-reset]');
    if (reset) reset.onclick = async () => {
      if (!(await confirmDialog('Demo-Daten neu erzeugen? Deine Änderungen im Demo-Modus gehen verloren.', 'Zurücksetzen'))) return;
      await db.deleteDatabase(MODES.demo.db);
      location.reload();
    };
  },
};
