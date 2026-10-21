// Neues Passwort setzen: nach dem Link aus «Passwort vergessen» oder unter Mehr → Konto.
import { setTop, esc, toast } from '../ui.js';

export default {
  render(el) {
    setTop({ title: 'Passwort', back: '#/settings' });
    el.innerHTML = `
      <div class="card">
        <div class="card-title"><h3>Neues Passwort</h3></div>
        <form class="stack" data-form>
          <label class="field"><span>Neues Passwort</span><input class="input" type="password" autocomplete="new-password" minlength="8" data-pw required></label>
          <label class="field"><span>Nochmals eingeben</span><input class="input" type="password" autocomplete="new-password" minlength="8" data-pw2 required></label>
          <p class="muted small">Mindestens 8 Zeichen. Gilt danach auf allen Geräten.</p>
          <button class="btn primary block" type="submit" data-go>Passwort speichern</button>
        </form>
      </div>`;
    el.querySelector('[data-form]').onsubmit = async e => {
      e.preventDefault();
      const pw = el.querySelector('[data-pw]').value, pw2 = el.querySelector('[data-pw2]').value;
      if (pw.length < 8) { toast('Bitte mindestens 8 Zeichen'); return; }
      if (pw !== pw2) { toast('Die beiden Passwörter sind nicht gleich'); return; }
      const btn = el.querySelector('[data-go]');
      btn.disabled = true;
      try {
        const { updatePassword } = await import('../sync.js');
        await updatePassword(pw);
        toast('Passwort gespeichert');
        location.hash = '#/';
      } catch (err) {
        toast(esc(err.message), '', 4000);
        btn.disabled = false;
      }
    };
  },
};
