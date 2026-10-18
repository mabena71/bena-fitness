// Einstieg: Modus wählen (Demo / lokal), Datenbank öffnen, Router und Navigation.
import * as db from './db.js';
import { seedDemo, ensureDefaultGyms, ensureDefaultSaunas, DEMO_VERSION } from './demo.js';
import { primeRewards } from './data.js';
import { esc } from './ui.js';
import { icon } from './icons.js';

import welcome from './views/welcome.js';
import home from './views/home.js';
import gym from './views/gym.js';
import exercise from './views/exercise.js';
import exerciseEdit from './views/exercise-edit.js';
import body from './views/body.js';
import stats from './views/stats.js';
import motivation from './views/motivation.js';
import review from './views/review.js';
import settings from './views/settings.js';
import login from './views/login.js';
import challenge from './views/challenge.js';
import { cloudConfigured } from './config.js';
import { APP_VERSION } from './version.js';

const MODE_KEY = 'fitness.mode';
export const MODES = {
  demo: { db: 'fitness-demo', user: 'demo', label: 'Demo' },
  local: { db: 'fitness-local', user: 'local', label: 'Nur dieses Gerät' },
  cloud: { db: null, user: null, label: 'Konto (Handy und PC synchron)' },
};

const routes = [
  [/^\/$/, home],
  [/^\/welcome$/, welcome],
  [/^\/login$/, login],
  [/^\/gym\/([^/]+)$/, gym],
  [/^\/ex\/new\/([^/]+)$/, exerciseEdit, { isNew: true }],
  [/^\/ex\/([^/]+)\/edit$/, exerciseEdit],
  [/^\/ex\/([^/]+)$/, exercise],
  [/^\/body$/, body],
  [/^\/stats$/, stats],
  [/^\/rewards$/, motivation],
  [/^\/review\/(month|year)\/([\d-]+)$/, review],
  [/^\/settings$/, settings],
  [/^\/challenge$/, challenge],
];

const NAV = [
  ['#/', 'home', 'Start', /^\/($|gym|ex)/],
  ['#/body', 'scale', 'Körper', /^\/body/],
  ['#/stats', 'chart', 'Statistik', /^\/stats/],
  ['#/rewards', 'trophy', 'Erfolge', /^\/(rewards|review|challenge)/],
  ['#/settings', 'sliders', 'Mehr', /^\/settings/],
];

let cleanup = null;
let mode = null;

export function getMode() { return mode; }

export async function setMode(m, hash = '#/') {
  if (m) localStorage.setItem(MODE_KEY, m); else localStorage.removeItem(MODE_KEY);
  location.hash = hash;
  location.reload();
}

function renderNav(path) {
  const nav = document.getElementById('nav');
  nav.hidden = !mode;
  nav.innerHTML = `<div class="brand"><img src="icons/icon-192.png" alt="">BENA Fit</div>` +
    NAV.map(([href, ico, label, re]) => `<a href="${href}" class="${re.test(path) ? 'active' : ''}"><span class="ico">${icon(ico, 22)}</span>${label}</a>`).join('');
}

async function route() {
  let path = ((location.hash || '#/').slice(1) || '/').split('?')[0] || '/';
  if (!mode && path !== '/welcome' && path !== '/login') { location.hash = '#/welcome'; return; }
  if (mode && (path === '/welcome' || path === '/login')) path = '/';
  renderNav(path);
  const el = document.getElementById('view');
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  for (const [re, view, extra] of routes) {
    const m = path.match(re);
    if (!m) continue;
    el.innerHTML = '';
    window.scrollTo(0, 0);
    try {
      cleanup = (await view.render(el, m.slice(1), { ...extra, refresh: () => route() })) || null;
    } catch (e) {
      console.error(e);
      el.innerHTML = `<div class="card"><b>Fehler beim Anzeigen.</b><p class="muted small">${esc(e.message)}</p></div>`;
    }
    return;
  }
  location.hash = '#/';
}

async function boot() {
  mode = localStorage.getItem(MODE_KEY);
  if (mode && !MODES[mode]) mode = null;
  // Link zum Weitergeben: …/?demo öffnet direkt die Demo (nur wenn noch kein Modus gewählt ist)
  if ((!mode || mode === 'demo') && new URLSearchParams(location.search).has('demo')) {
    mode = 'demo';
    localStorage.setItem(MODE_KEY, mode);
  }
  if (mode === 'cloud' && !(await openCloud())) mode = null;
  if (mode && mode !== 'cloud') {
    const cfg = MODES[mode];
    await db.open(cfg.db, cfg.user);
  }
  if (mode) {
    if (mode === 'demo' && (await db.getMeta('seeded')) !== DEMO_VERSION) {
      // ältere Demo-Daten durch die aktuelle Fassung ersetzen
      if (await db.getMeta('seeded')) { await db.deleteDatabase(MODES.demo.db); await db.open(MODES.demo.db, MODES.demo.user); }
      await seedDemo();
      await db.setMeta('seeded', DEMO_VERSION);
    }
    if (mode !== 'cloud' || (await db.getMeta('initialPullDone'))) {
      await ensureDefaultGyms();
      await ensureDefaultSaunas();
    }
    await primeRewards();
    try {
      const pending = localStorage.getItem('fitness.pendingName');
      if (pending) {
        const { profile, saveProfile } = await import('./data.js');
        if (!profile().display_name) await saveProfile({ display_name: pending });
        localStorage.removeItem('fitness.pendingName');
      }
    } catch { /* egal */ }
    // Android/Chrome darf die Daten sonst bei knappem Speicher löschen
    try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* egal */ }
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', () => document.getElementById('topbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service Worker:', e));
  }
  // Update-Prüfung: beim Start, beim Zurückkehren in die App und alle 30 Minuten
  setTimeout(checkForUpdate, 3000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
  setInterval(checkForUpdate, 30 * 60000);
}

/** Lädt die App komplett neu (inkl. neuer Service-Worker-Version). */
export async function reloadApp() {
  try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch { /* egal */ }
  location.reload();
}

let updateShown = false;
async function checkForUpdate() {
  if (updateShown || !navigator.onLine) return;
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { version } = await res.json();
    if (!version || version === APP_VERSION) return;
    updateShown = true;
    try { (await navigator.serviceWorker?.getRegistration())?.update(); } catch { /* egal */ }
    const bar = document.createElement('div');
    bar.className = 'update-bar';
    bar.innerHTML = `<span>Neue Version von BENA Fit verfügbar.</span><button class="btn sm primary">Jetzt aktualisieren</button>`;
    bar.querySelector('button').onclick = () => reloadApp();
    document.body.appendChild(bar);
  } catch { /* offline o. ä. */ }
}

/**
 * Konto-Modus: Sitzung prüfen, eigene lokale Datenbank pro Konto öffnen, beim ersten Mal
 * Daten vom Server holen (und auf Wunsch die bisherigen Daten dieses Geräts übernehmen),
 * danach automatisch abgleichen.
 */
async function openCloud() {
  if (!cloudConfigured()) return false;
  const sync = await import('./sync.js');
  let session = null;
  try { session = await sync.currentSession(); } catch (e) { console.warn(e); }
  if (!session) { localStorage.removeItem(MODE_KEY); return false; }
  const uid = session.user.id;
  await db.open(`fitness-u-${uid}`, uid);
  if (!(await db.getMeta('localImportOffered'))) await offerLocalImport(uid);
  if (!(await db.getMeta('initialPullDone')) && navigator.onLine) await Promise.race([sync.sync(), new Promise(r => setTimeout(r, 15000))]);
  sync.onStatus(async s => {
    if (s.state === 'ok' && !db.all('gyms').length) { await ensureDefaultGyms(); await ensureDefaultSaunas(); }
  });
  db.onChange(t => { if (t === 'remote' && !document.querySelector('.modal-back')) route(); });
  sync.startAutoSync();
  return true;
}

/** Einmalig: bisherige Daten aus „Nur dieses Gerät“ ins Konto übernehmen. */
async function offerLocalImport(uid) {
  await db.setMeta('localImportOffered', true);
  const { createBackup, restoreBackup } = await import('./backup.js');
  const { confirmDialog, toast } = await import('./ui.js');
  const target = db.currentDbName();
  await db.open(MODES.local.db, MODES.local.user);
  db.clearMetaCache();
  const hasData = db.all('sets').length + db.all('body_metrics').length + db.all('daily_steps').length > 0;
  const backup = hasData ? await createBackup() : null;
  await db.open(target, uid);
  db.clearMetaCache();
  await db.setMeta('localImportOffered', true);
  if (!backup) return;
  if (await confirmDialog('Auf diesem Gerät gibt es schon Trainingsdaten. Sollen sie in dein Konto übernommen werden?', 'Übernehmen')) {
    const r = await restoreBackup(backup, { userId: uid });
    await db.setMeta('initialPullDone', true);
    toast(`Übernommen: ${r.sets} Sätze, ${r.body_metrics} Messungen`, '', 4000);
  }
}

boot();
