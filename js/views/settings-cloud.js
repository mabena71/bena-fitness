// Einstellungen im Konto-Modus: Withings verbinden (Etappe 5) und Benachrichtigungen (Etappe 6b).
import { esc, toast, confirmDialog } from '../ui.js';
import { icon } from '../icons.js';
import { pushConfigured } from '../config.js';
import { profile, saveProfile } from '../data.js';

export function cloudExtrasHtml() {
  return `
    <div class="card" data-withings>
      <div class="card-title"><h3>${icon('scale', 18)} Withings</h3></div>
      <p class="muted small" data-w-status>Prüfe Verbindung …</p>
      <div class="row wrap" data-w-actions></div>
    </div>
    <div class="card" data-push>
      <div class="card-title"><h3>${icon('bell', 18)} Benachrichtigungen</h3></div>
      <p class="muted small" data-p-status></p>
      <label class="toggle"><input type="checkbox" data-p-weekly> Wochenbilanz am Sonntag um 19 Uhr</label>
      <label class="toggle"><input type="checkbox" data-p-rem> Erinnerung nach 5 Tagen ohne Training bzw. 7 Tagen ohne Wiegen</label>
      <div class="row wrap" style="margin-top:8px" data-p-actions></div>
    </div>`;
}

export async function wireCloudExtras(el, ctx) {
  const sync = await import('../sync.js');

  // Rückmeldung nach der Withings-Anmeldung (#/settings?withings=ok)
  const q = new URLSearchParams((location.hash.split('?')[1]) || '');
  if (q.get('withings')) {
    const msg = { ok: 'Withings ist verbunden. Die Werte werden jetzt geholt.', abgelaufen: 'Die Withings-Anmeldung ist abgelaufen. Bitte nochmals versuchen.', fehler: 'Withings hat die Verbindung abgelehnt.' }[q.get('withings')];
    if (msg) toast(msg, '', 4500);
    history.replaceState(null, '', location.pathname + location.search + '#/settings');
    if (q.get('withings') === 'ok') fetchNow(true);
  }

  async function fetchNow(silent = false) {
    try {
      const r = await sync.callFunction('withings-sync', {});
      if (r.error) throw new Error(r.error);
      await sync.sync();
      if (!silent || r.measures || r.stepDays) toast(`Withings: ${r.measures || 0} Messungen, ${r.stepDays || 0} Tage Schritte`, '', 3500);
      drawWithings();
    } catch (e) { toast(esc(`Withings: ${e.message}`), '', 4000); }
  }

  async function drawWithings() {
    const st = el.querySelector('[data-w-status]'), act = el.querySelector('[data-w-actions]');
    if (!st) return;
    let s;
    try { s = (await sync.rpc('withings_status'))?.[0]; } catch (e) { st.textContent = `Nicht erreichbar: ${e.message}`; return; }
    if (!s?.connected) {
      st.textContent = 'Gewicht, Fettanteil, Muskelmasse und Schritte automatisch von der Withings-Waage bzw. -Uhr übernehmen. Jede Person verbindet ihr eigenes Withings-Konto.';
      act.innerHTML = `<button class="btn primary" data-w-connect>${icon('scale', 18)} Withings verbinden</button>`;
      act.querySelector('[data-w-connect]').onclick = async () => {
        try { const r = await sync.callFunction('withings-auth', { action: 'start' }); location.href = r.url; }
        catch (e) { toast(esc(`Withings: ${e.message}`), '', 4000); }
      };
      return;
    }
    const when = s.last_sync ? new Date(s.last_sync).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' }) : 'noch nie';
    st.innerHTML = `Verbunden. Letzter Abruf: ${esc(when)}. Neue Werte kommen jede Nacht automatisch.${s.last_error ? `<br><span class="bad">Fehler: ${esc(s.last_error)}</span>` : ''}`;
    act.innerHTML = `<button class="btn primary" data-w-now>Jetzt holen</button><button class="btn" data-w-off>Trennen</button>`;
    act.querySelector('[data-w-now]').onclick = () => fetchNow();
    act.querySelector('[data-w-off]').onclick = async () => {
      if (!(await confirmDialog('Withings trennen? Bereits übernommene Werte bleiben erhalten.', 'Trennen'))) return;
      try { await sync.rpc('withings_disconnect'); toast('Withings getrennt'); drawWithings(); } catch (e) { toast(esc(e.message)); }
    };
  }

  async function drawPush() {
    const st = el.querySelector('[data-p-status]'), act = el.querySelector('[data-p-actions]');
    const p = profile();
    const set = p.settings || {};
    const weekly = el.querySelector('[data-p-weekly]'), rem = el.querySelector('[data-p-rem]');
    weekly.checked = set.pushWeekly !== false;
    rem.checked = set.pushReminders !== false;
    const saveFlags = async () => { await saveProfile({ settings: { ...(profile().settings || {}), pushWeekly: weekly.checked, pushReminders: rem.checked } }); toast('Gespeichert'); };
    weekly.onchange = saveFlags; rem.onchange = saveFlags;
    if (!pushConfigured()) { st.textContent = 'Noch nicht eingerichtet (kommt mit dem Supabase-Konto).'; act.innerHTML = ''; return; }
    const { pushSupported, currentSubscription, enablePush, disablePush } = await import('../push.js');
    if (!pushSupported()) { st.textContent = 'Dieser Browser unterstützt keine Benachrichtigungen. Auf Android in Chrome bzw. als installierte App funktioniert es.'; return; }
    const sub = await currentSubscription();
    st.textContent = sub ? 'Auf diesem Gerät eingeschaltet.' : 'Auf diesem Gerät ausgeschaltet.';
    act.innerHTML = sub ? '<button class="btn" data-p-off>Ausschalten</button>' : `<button class="btn primary" data-p-on>${icon('bell', 18)} Einschalten</button>`;
    const on = act.querySelector('[data-p-on]'), off = act.querySelector('[data-p-off]');
    if (on) on.onclick = async () => { try { await enablePush(); toast('Benachrichtigungen eingeschaltet'); drawPush(); } catch (e) { toast(esc(e.message), '', 4000); } };
    if (off) off.onclick = async () => { await disablePush(); toast('Benachrichtigungen ausgeschaltet'); drawPush(); };
  }

  drawWithings();
  drawPush();
}
