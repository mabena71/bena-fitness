import * as db from '../db.js';
import { profile, saveProfile, stepGoal } from '../data.js';
import { setTop, esc, toast, confirmDialog, downloadFile } from '../ui.js';
import { getMode, setMode, MODES, reloadApp } from '../app.js';
import { APP_VERSION } from '../version.js';
import { allDataXlsx } from '../csv.js';
import { createBackup, restoreBackup } from '../backup.js';
import { icon } from '../icons.js';
import { cloudConfigured } from '../config.js';
import { cloudExtrasHtml, wireCloudExtras } from './settings-cloud.js';

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
        <label class="field"><span>Schritte-Ziel pro Tag</span><input class="input" data-step-goal type="number" inputmode="numeric" min="1000" max="50000" step="500" value="${stepGoal()}"></label>
        <p class="muted small" style="margin-top:-4px">Zählt für die Serie „Tage in Folge“ und die Schritte-Abzeichen. Standard: 10 000.</p>
        <button class="btn primary" data-save>Speichern</button>
      </div>

      <div class="card">
        <div class="card-title"><h3>Daten</h3></div>
        <p class="muted small">Alle Trainings, Körperwerte und Schritte in einer Excel-Datei (je ein Blatt). Die Sicherung enthält zusätzlich die Fotos und lässt sich wieder einspielen. Auf dem Handy landen beide im Ordner „Downloads“.</p>
        <div class="row wrap">
          <button class="btn primary" data-export>${icon('table', 18)} Alle Daten exportieren</button>
          <button class="btn" data-backup>${icon('download', 18)} Sicherung herunterladen</button>
          <label class="btn" style="cursor:pointer">${icon('upload', 18)} Sicherung einspielen<input type="file" accept=".json,application/json" data-restore hidden></label>
        </div>
        <p class="muted small" data-persist></p>
      </div>

      ${mode === 'cloud' ? `<div class="card">
        <div class="card-title"><h3>${icon('cloud', 18)} Konto und Abgleich</h3></div>
        <p class="small" data-account>Angemeldet.</p>
        <p class="muted small" data-sync-status></p>
        <div class="row wrap"><button class="btn primary" data-sync-now>Jetzt abgleichen</button><button class="btn" data-logout>Abmelden</button></div>
      </div>` : ''}
            <div class="card">
        <div class="card-title"><h3>Speicherort</h3></div>
        <p class="small">Aktuell: <b>${esc(MODES[mode].label)}</b>${mode === 'demo' ? ' – mit Beispieldaten' : ''}</p>
        ${mode === 'local' ? `<p class="muted small">Die Daten liegen nur in diesem Browser. Nach dem Anmelden mit Konto kannst du sie einmalig ins Konto übernehmen; ${pending} Einträge sind dafür vorgemerkt.</p>` : ''}
        <div class="row wrap">
          ${mode === 'demo' ? '<button class="btn primary" data-mode="local">Eigenes Tagebuch starten</button><button class="btn" data-reset>Demo zurücksetzen</button>' : '<button class="btn" data-mode="demo">Demo ansehen</button>'}
          ${cloudConfigured() && mode !== 'cloud' ? '<button class="btn primary" data-to-login>Mit Konto anmelden</button>' : ''}
        </div>
      </div>

      ${mode === 'cloud' ? cloudExtrasHtml() : `<div class="card">
        <div class="card-title"><h3>Nur mit Konto</h3></div>
        <p class="muted small">Du bist auf diesem Gerät nicht angemeldet. Mit „Mit Konto anmelden“ oben bekommst du:</p>
        <ul class="list">
          <li><span class="emoji">${icon('cloud', 18)}</span><div class="grow"><b>Login und Abgleich</b><div class="muted small">Gleiche Daten auf Handy und PC, jede Person mit eigenem Konto</div></div></li>
          <li><span class="emoji">${icon('scale', 18)}</span><div class="grow"><b>Withings</b><div class="muted small">Gewicht, Fett und Schritte automatisch übernehmen</div></div></li>
          <li><span class="emoji">${icon('crown', 18)}</span><div class="grow"><b><a href="#/challenge" style="color:inherit">Paar-Challenge</a></b><div class="muted small">Wochenduell nur mit Kennzahlen</div></div></li>
          <li><span class="emoji">${icon('bell', 18)}</span><div class="grow"><b>Benachrichtigungen</b><div class="muted small">Wochenbilanz am Sonntag und Erinnerungen</div></div></li>
        </ul>
      </div>`}
      <div class="center" style="margin-top:10px"><button class="btn sm" data-reload>App neu laden</button><p class="muted small">BENA Fit · Version ${APP_VERSION}</p></div>`;

    el.querySelector('[data-save]').onclick = async () => {
      const goal = Math.round(+el.querySelector('[data-step-goal]').value / 100) * 100;
      if (!(goal >= 1000 && goal <= 50000)) { toast('Schritte-Ziel bitte zwischen 1000 und 50 000'); return; }
      await saveProfile({ display_name: el.querySelector('[data-name]').value.trim(), settings: { ...(profile().settings || {}), stepGoal: goal } });
      toast('Profil gespeichert');
      ctx.refresh();
    };
    el.querySelector('[data-export]').onclick = async e => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try { downloadFile(`bena-fit-daten-${stamp}.xlsx`, await allDataXlsx()); toast('Excel-Datei erstellt'); }
      catch (err) { toast(esc(err.message), '', 3500); }
      finally { btn.disabled = false; }
    };
    el.querySelector('[data-backup]').onclick = async () => {
      const json = await createBackup();
      downloadFile(`bena-fitness-sicherung-${stamp}.json`, json, 'application/json');
      toast('Sicherung erstellt');
    };
    el.querySelector('[data-restore]').onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!(await confirmDialog('Sicherung einspielen? Einträge aus der Datei ersetzen gleiche Einträge auf diesem Gerät.', 'Einspielen'))) return;
      try {
        const r = await restoreBackup(await file.text());
        toast(`Eingespielt: ${r.sets} Sätze, ${r.body_metrics} Messungen, ${r.photos} Fotos`, '', 4000);
        ctx.refresh();
      } catch (err) { toast(esc(err.message), '', 4000); }
    };
    try {
      if (navigator.storage?.persisted) {
        const p = await navigator.storage.persisted();
        el.querySelector('[data-persist]').textContent = p ? 'Der Browser speichert die Daten dauerhaft.' : 'Hinweis: Der Browser hat dauerhaften Speicher nicht bestätigt. Als App auf dem Startbildschirm ist er meist sicherer.';
      }
    } catch { /* egal */ }
    el.querySelector('[data-reload]').onclick = () => reloadApp();
    let cleanupFn = null;
    const toLogin = el.querySelector('[data-to-login]');
    if (toLogin) toLogin.onclick = () => setMode(null, '#/login');
    if (mode === 'cloud') {
      const sync = await import('../sync.js');
      const session = await sync.currentSession();
      if (session) el.querySelector('[data-account]').innerHTML = `Angemeldet als <b>${esc(session.user.email)}</b>`;
      const show = st => {
        const box = el.querySelector('[data-sync-status]');
        if (!box) return;
        const when = st.lastSync ? new Date(st.lastSync).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : null;
        box.textContent = st.state === 'syncing' ? 'Gleiche ab …'
          : st.state === 'offline' ? `Offline – ${st.pending} Einträge warten auf Upload.`
          : st.state === 'error' ? `Fehler beim Abgleich: ${st.error}`
          : `${when ? `Zuletzt abgeglichen um ${when}.` : 'Noch nicht abgeglichen.'} ${st.pending ? `${st.pending} Einträge warten auf Upload.` : 'Alles hochgeladen.'}`;
      };
      show(sync.status);
      const off = sync.onStatus(show);
      el.querySelector('[data-sync-now]').onclick = () => sync.sync();
      el.querySelector('[data-logout]').onclick = async () => {
        if (!(await confirmDialog('Abmelden? Die Daten bleiben im Konto gespeichert.', 'Abmelden'))) return;
        await sync.signOut();
        setMode(null, '#/welcome');
      };
      cleanupFn = () => off();
      wireCloudExtras(el, ctx);
    }
    el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
    const reset = el.querySelector('[data-reset]');
    if (reset) reset.onclick = async () => {
      if (!(await confirmDialog('Demo-Daten neu erzeugen? Deine Änderungen im Demo-Modus gehen verloren.', 'Zurücksetzen'))) return;
      await db.deleteDatabase(MODES.demo.db);
      location.reload();
    };
    return cleanupFn;
  },
};
