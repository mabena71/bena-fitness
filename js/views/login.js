import { setTop, esc, toast } from '../ui.js';
import { signIn } from '../sync.js';
import { cloudConfigured } from '../config.js';
import { setMode } from '../app.js';

export default {
  render(el) {
    setTop({ title: 'Anmelden', back: '#/welcome' });
    if (!cloudConfigured()) {
      el.innerHTML = '<div class="card"><b>Noch nicht eingerichtet.</b><p class="muted small">Der Login wird mit Etappe 3 freigeschaltet.</p></div>';
      return;
    }
    el.innerHTML = `
      <div class="welcome" style="margin-top:2vh">
        <img src="icons/icon-192.png" alt="">
        <h1>Mit Konto anmelden</h1>
        <p class="muted">Dann sind deine Daten auf Handy und PC gleich. Jede Person hat ihr eigenes Konto.</p>
        <form class="stack" data-form>
          <label class="field"><span>E-Mail</span><input class="input" type="email" autocomplete="username" data-email required></label>
          <label class="field"><span>Passwort</span><input class="input" type="password" autocomplete="current-password" data-pw required></label>
          <button class="btn primary big block" type="submit" data-go>Anmelden</button>
          <p class="muted small">Die Konten für Maurice und Sabine werden im Supabase-Dashboard angelegt. Eine Registrierung in der App gibt es nicht.</p>
        </form>
      </div>`;
    el.querySelector('[data-form]').onsubmit = async e => {
      e.preventDefault();
      const btn = el.querySelector('[data-go]');
      btn.disabled = true; btn.textContent = 'Anmelden …';
      try {
        await signIn(el.querySelector('[data-email]').value.trim(), el.querySelector('[data-pw]').value);
        await setMode('cloud');
      } catch (err) {
        toast(esc(err.message), '', 4000);
        btn.disabled = false; btn.textContent = 'Anmelden';
      }
    };
  },
};
