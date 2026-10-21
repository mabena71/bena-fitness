// Einstellungen im Konto-Modus (Nr. 26): Freunde einladen und Konto löschen.
import { esc, toast, modal } from '../ui.js';
import { icon } from '../icons.js';
import { profile } from '../data.js';
import * as db from '../db.js';
import { formatCode, inviteLink, inviteState, daysLeft, shareText, INVITE_DAYS } from '../invite.js';

export function inviteCardHtml() {
  return `
    <div class="card" data-invites>
      <div class="card-title"><h3>${icon('user', 18)} Freunde einladen</h3></div>
      <p class="muted small">Neue Konten gibt es nur mit Einladungscode. Jeder Code gilt einmal und ${INVITE_DAYS} Tage. Deine Daten bleiben privat, Eingeladene sehen nichts von dir.</p>
      <div class="row wrap"><button class="btn primary" data-inv-new>Einladungscode erstellen</button></div>
      <ul class="list" data-inv-list style="margin-top:8px"></ul>
    </div>`;
}

export function deleteCardHtml() {
  return `
    <div class="card" data-delete-account>
      <div class="card-title"><h3>${icon('trash', 18)} Konto löschen</h3></div>
      <p class="muted small">Löscht dein Konto und alle Daten darin endgültig: Trainings, Geräte, Studios, Körperwerte, Schritte, Fotos, die Withings-Verbindung und deine Einladungen. Lade vorher unter «Daten» alles herunter, wenn du es behalten willst.</p>
      <button class="btn danger" data-del-start>Konto und alle Daten löschen …</button>
    </div>`;
}

/** Liste der eigenen Einladungen (rein, auch für die Vorschau ohne Server). */
export function invitesHtml(list, now = new Date()) {
  if (!list.length) return '<li class="muted small">Noch keine Einladungen.</li>';
  return list.map(inv => {
    const st = inviteState(inv, now);
    const sub = st === 'verwendet'
      ? `verwendet${inv.used_name ? ` von <b>${esc(inv.used_name)}</b>` : ''} am ${new Date(inv.used_at).toLocaleDateString('de-CH')}`
      : st === 'abgelaufen' ? 'abgelaufen'
      : `offen, noch ${daysLeft(inv.expires_at, now)} ${daysLeft(inv.expires_at, now) === 1 ? 'Tag' : 'Tage'} gültig`;
    const actions = st === 'offen'
      ? `<button class="btn sm primary" data-inv-share="${esc(inv.code)}">Teilen</button><button class="btn sm" data-inv-del="${esc(inv.code)}" title="Zurückziehen">✕</button>` : '';
    return `<li${st === 'offen' ? '' : ' style="opacity:.6"'}><div class="grow"><b style="font-family:monospace;letter-spacing:.08em">${formatCode(inv.code)}</b><div class="muted small">${sub}</div></div>${actions}</li>`;
  }).join('');
}

async function share(code) {
  const text = shareText(code, profile().display_name || '');
  if (navigator.share) {
    try { await navigator.share({ title: 'Einladung zu BenaFit', text }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); toast('Einladung kopiert – jetzt z. B. in WhatsApp einfügen', '', 3500); }
  catch { prompt('Einladung kopieren:', inviteLink(code)); }
}

export async function wireAccount(el, ctx) {
  const sync = await import('../sync.js');
  const listEl = el.querySelector('[data-inv-list]');

  async function drawInvites() {
    try { listEl.innerHTML = invitesHtml(await sync.rpc('my_signup_invites') || []); }
    catch (e) { listEl.innerHTML = `<li class="muted small">Nicht erreichbar: ${esc(e.message)}</li>`; }
  }
  listEl.onclick = async e => {
    const s = e.target.closest('[data-inv-share]'), d = e.target.closest('[data-inv-del]');
    if (s) share(s.dataset.invShare);
    if (d) {
      try { await sync.rpc('revoke_signup_invite', { p_code: d.dataset.invDel }); toast('Einladung zurückgezogen'); drawInvites(); }
      catch (err) { toast(esc(err.message), '', 4000); }
    }
  };
  el.querySelector('[data-inv-new]').onclick = async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const row = (await sync.rpc('create_signup_invite'))?.[0];
      if (!row?.code) throw new Error('Kein Code erhalten');
      await drawInvites();
      share(row.code);
    } catch (err) { toast(esc(err.message), '', 4000); }
    btn.disabled = false;
  };
  drawInvites();

  el.querySelector('[data-del-start]').onclick = () => deleteAccount(sync, el);
}

async function deleteAccount(sync, el) {
  const yes = await modal((m, close) => {
    m.innerHTML = `<h2>Konto endgültig löschen?</h2>
      <p class="small">Alle Trainings, Geräte, Studios, Körperwerte, Schritte und Fotos werden auf dem Server und auf diesem Gerät gelöscht, die Withings-Verbindung getrennt. <b>Das lässt sich nicht rückgängig machen.</b></p>
      <p class="muted small">Tipp: Zuerst unter «Daten» auf «Alle Daten exportieren» tippen.</p>
      <label class="field"><span>Zur Bestätigung LÖSCHEN eintippen</span><input class="input" data-word autocomplete="off" autocapitalize="characters"></label>
      <div class="actions"><button class="btn" data-x>Abbrechen</button><button class="btn primary" data-ok disabled>Endgültig löschen</button></div>`;
    const inp = m.querySelector('[data-word]'), ok = m.querySelector('[data-ok]');
    inp.oninput = () => { ok.disabled = inp.value.trim().toUpperCase() !== 'LÖSCHEN'; };
    m.querySelector('[data-x]').onclick = () => close(false);
    ok.onclick = () => close(true);
  });
  if (!yes) return;
  const btn = el.querySelector('[data-del-start]');
  btn.disabled = true; btn.textContent = 'Wird gelöscht …';
  try {
    const r = await sync.callFunction('delete-account', { confirm: 'LÖSCHEN' });
    if (!r?.ok) throw new Error(r?.error || 'Löschen fehlgeschlagen');
  } catch (e) {
    toast(esc(`Konto konnte nicht gelöscht werden: ${e.message}`), '', 5000);
    btn.disabled = false; btn.textContent = 'Konto und alle Daten löschen …';
    return;
  }
  // Auf diesem Gerät aufräumen: Push-Abo, Anmeldung, lokale Datenbank
  try { const { disablePush } = await import('../push.js'); await disablePush(); } catch { /* egal */ }
  try { await sync.signOut(); } catch { /* Konto gibt es nicht mehr */ }
  try { localStorage.removeItem('bena-fitness-auth'); } catch { /* egal */ }
  try { await db.deleteDatabase(db.currentDbName()); } catch (e) { console.warn(e); }
  try { sessionStorage.setItem('fitness.flash', 'Dein Konto und alle Daten sind gelöscht.'); } catch { /* egal */ }
  const { setMode } = await import('../app.js');
  setMode(null, '#/welcome');
}
