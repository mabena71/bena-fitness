import { setTop } from '../ui.js';
import { setMode } from '../app.js';

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
          <button class="btn big block" disabled>Mit Konto anmelden (bald)</button>
        </div>
      </div>`;
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => setMode(b.dataset.m));
  },
};
