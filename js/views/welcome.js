import { setTop, modal, esc } from '../ui.js';
import { setMode } from '../app.js';
import { cloudConfigured } from '../config.js';

export default {
  render(el) {
    setTop({ title: '' });
    el.innerHTML = `
      <div class="welcome">
        <img src="icons/icon-192.png" alt="">
        <h1>Fitness-Tagebuch</h1>
        <p class="muted">Geräte, Gewichte und Wiederholungen in Bellevue, Archhöfe und Win4 festhalten und die Fortschritte sehen.</p>
        <div class="stack">
          <button class="btn primary big block" data-m="demo">▶ Demo ausprobieren</button>
          <p class="muted small">Mit Beispieldaten aus 10 Wochen, damit du alle Diagramme, Rekorde und Abzeichen siehst.</p>
          <button class="btn big block" data-m="local">Eigenes Tagebuch starten</button>
          <p class="muted small">Leer, mit deinen drei Studios. Die Daten bleiben vorerst auf diesem Gerät. Mit dem Login (kommt bald) werden sie zwischen Handy und PC synchronisiert.</p>
          ${cloudConfigured() ? '<a class="btn primary big block" href="#/login">Mit Konto anmelden</a><p class="muted small">Gleiche Daten auf Handy und PC.</p>' : '<button class="btn big block" disabled>Mit Konto anmelden (bald)</button>'}
        </div>
      </div>`;
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = async () => {
      if (b.dataset.m === 'local') {
        const name = await modal((m, close) => {
          m.innerHTML = `<h2>Wie heisst du?</h2>
            <label class="field"><span>Vorname</span><input class="input" autofocus placeholder="z. B. Maurice" autocomplete="given-name"></label>
            <p class="muted small">Erscheint in der Begrüssung, im Level-Titel und in der Paar-Challenge.</p>
            <div class="actions"><button class="btn" data-x>Überspringen</button><button class="btn primary" data-ok>Weiter</button></div>`;
          const inp = m.querySelector('input');
          m.querySelector('[data-x]').onclick = () => close('');
          m.querySelector('[data-ok]').onclick = () => close(inp.value.trim());
          inp.onkeydown = e => { if (e.key === 'Enter') close(inp.value.trim()); };
        });
        if (name === undefined) return;
        try { if (name) localStorage.setItem('fitness.pendingName', name); } catch { /* egal */ }
      }
      setMode(b.dataset.m);
    });
  },
};
