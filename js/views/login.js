import { setTop, esc, toast } from '../ui.js';
import { signIn } from '../sync.js';
import { cloudConfigured } from '../config.js';
import { setMode } from '../app.js';
import { normalizeCode, isValidCode, formatCode, codeFromHash, inviteCheckText } from '../invite.js';

// Drei Ansichten: anmelden, mit Einladungscode registrieren, Passwort vergessen.
// Ein Einladungslink (#/login?code=…) öffnet direkt die Registrierung.
export default {
  render(el) {
    setTop({ title: 'Anmelden', back: '#/welcome' });
    if (!cloudConfigured()) {
      el.innerHTML = '<div class="card"><b>Noch nicht eingerichtet.</b><p class="muted small">Der Login wird mit Etappe 3 freigeschaltet.</p></div>';
      return;
    }
    const linkCode = codeFromHash(location.hash);
    el.innerHTML = `
      <div class="welcome" style="margin-top:2vh">
        <img src="icons/icon-192.png" alt="">
        <h1 data-h></h1>
        <p class="muted" data-lead></p>

        <form class="stack" data-panel="login">
          <label class="field"><span>E-Mail</span><input class="input" type="email" autocomplete="username" data-email required></label>
          <label class="field"><span>Passwort</span><input class="input" type="password" autocomplete="current-password" data-pw required></label>
          <button class="btn primary big block" type="submit" data-go>Anmelden</button>
          <button class="btn block" type="button" data-show="forgot">Passwort vergessen?</button>
          <button class="btn block" type="button" data-show="signup">Ich habe einen Einladungscode</button>
          <p class="muted small">Noch kein Konto? Frag die Person, die dir die App empfohlen hat, nach einem Einladungscode.</p>
        </form>

        <form class="stack" data-panel="signup" hidden>
          <label class="field"><span>Einladungscode</span><input class="input" data-code autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-EFGH" maxlength="12" required style="font-family:monospace;letter-spacing:.12em;text-transform:uppercase"></label>
          <label class="field"><span>Vorname</span><input class="input" data-first autocomplete="given-name" placeholder="z. B. Alex" maxlength="40" required></label>
          <label class="field"><span>E-Mail</span><input class="input" type="email" autocomplete="email" data-email required></label>
          <label class="field"><span>Passwort (mind. 8 Zeichen)</span><input class="input" type="password" autocomplete="new-password" minlength="8" data-pw required></label>
          <button class="btn primary big block" type="submit" data-go>Konto erstellen</button>
          <p class="muted small">Mit dem Konto sind deine Daten auf Handy und PC gleich. Nur du siehst sie. Details in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>
          <button class="btn block" type="button" data-show="login">Ich habe schon ein Konto</button>
        </form>

        <form class="stack" data-panel="forgot" hidden>
          <label class="field"><span>E-Mail</span><input class="input" type="email" autocomplete="username" data-email required></label>
          <button class="btn primary big block" type="submit" data-go>Link zum Zurücksetzen senden</button>
          <button class="btn block" type="button" data-show="login">Zurück zum Anmelden</button>
        </form>

        <div class="card" data-panel="sent" hidden>
          <p data-sent-text></p>
          <p class="muted small">Keine Mail? Auch im Spam-Ordner nachsehen. Den Link am besten auf dem Gerät öffnen, auf dem du BENA Fit nutzt.</p>
          <button class="btn block" type="button" data-show="login">Zum Anmelden</button>
        </div>
      </div>`;

    const TEXT = {
      login: ['Mit Konto anmelden', 'Dann sind deine Daten auf Handy und PC gleich. Jede Person hat ihr eigenes Konto.'],
      signup: ['Konto erstellen', 'Du wurdest zu BENA Fit eingeladen. Gib den Code ein, den du bekommen hast.'],
      forgot: ['Passwort vergessen', 'Wir schicken dir einen Link, mit dem du ein neues Passwort setzen kannst.'],
      sent: ['Mail ist unterwegs', ''],
    };
    const panels = el.querySelectorAll('[data-panel]');
    const show = name => {
      panels.forEach(p => { p.hidden = p.dataset.panel !== name; });
      el.querySelector('[data-h]').textContent = TEXT[name][0];
      el.querySelector('[data-lead]').textContent = TEXT[name][1];
      el.querySelector('[data-lead]').hidden = !TEXT[name][1];
      // E-Mail beim Wechseln mitnehmen
      const mail = [...panels].map(p => p.querySelector('[data-email]')?.value).find(Boolean);
      const target = el.querySelector(`[data-panel="${name}"] [data-email]`);
      if (mail && target && !target.value) target.value = mail;
    };
    const sent = text => { el.querySelector('[data-sent-text]').innerHTML = text; show('sent'); };
    el.querySelectorAll('[data-show]').forEach(b => b.onclick = () => show(b.dataset.show));

    const codeInput = el.querySelector('[data-code]');
    if (linkCode) codeInput.value = formatCode(linkCode);
    codeInput.oninput = () => { codeInput.setCustomValidity(''); };
    codeInput.onblur = () => { if (isValidCode(codeInput.value)) codeInput.value = formatCode(codeInput.value); };
    show(linkCode ? 'signup' : 'login');

    const busy = (form, on, label) => {
      const btn = form.querySelector('[data-go]');
      btn.disabled = on;
      if (label) btn.textContent = label;
    };

    const fLogin = el.querySelector('[data-panel="login"]');
    fLogin.onsubmit = async e => {
      e.preventDefault();
      busy(fLogin, true, 'Anmelden …');
      try {
        await signIn(fLogin.querySelector('[data-email]').value.trim(), fLogin.querySelector('[data-pw]').value);
        await setMode('cloud');
      } catch (err) {
        toast(esc(err.message), '', 4000);
        busy(fLogin, false, 'Anmelden');
      }
    };

    const fSignup = el.querySelector('[data-panel="signup"]');
    fSignup.onsubmit = async e => {
      e.preventDefault();
      const code = normalizeCode(codeInput.value);
      const firstName = fSignup.querySelector('[data-first]').value.trim();
      const email = fSignup.querySelector('[data-email]').value.trim();
      const password = fSignup.querySelector('[data-pw]').value;
      if (!isValidCode(code)) { toast('Der Code hat 8 Zeichen (Buchstaben und Ziffern 2–9).', '', 3500); codeInput.focus(); return; }
      if (password.length < 8) { toast('Das Passwort braucht mindestens 8 Zeichen.'); return; }
      busy(fSignup, true, 'Konto wird erstellt …');
      try {
        const sync = await import('../sync.js');
        const msg = inviteCheckText(await sync.rpc('check_signup_invite', { p_code: code }));
        if (msg) throw new Error(msg);
        const session = await sync.signUp({ email, password, firstName, code });
        try { localStorage.setItem('fitness.pendingName', firstName); } catch { /* egal */ }
        if (session) { await setMode('cloud'); return; }
        sent(`Fast geschafft! Wir haben dir an <b>${esc(email)}</b> eine Mail geschickt. Tippe auf den Link darin, dann bist du angemeldet.`);
      } catch (err) {
        toast(esc(err.message), '', 4500);
      }
      busy(fSignup, false, 'Konto erstellen');
    };

    const fForgot = el.querySelector('[data-panel="forgot"]');
    fForgot.onsubmit = async e => {
      e.preventDefault();
      const email = fForgot.querySelector('[data-email]').value.trim();
      busy(fForgot, true);
      try {
        const { resetPassword } = await import('../sync.js');
        await resetPassword(email);
        sent(`Falls es ein Konto für <b>${esc(email)}</b> gibt, ist ein Link zum Zurücksetzen unterwegs. Er gilt eine Stunde.`);
      } catch (err) {
        toast(esc(err.message), '', 4500);
      }
      busy(fForgot, false);
    };
  },
};
