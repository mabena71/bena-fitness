// Einstieg: Modus wählen (Demo / lokal), Datenbank öffnen, Router und Navigation.
import * as db from './db.js';
import { seedDemo, ensureDefaultGyms } from './demo.js';
import { primeRewards } from './data.js';
import { esc } from './ui.js';

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

const MODE_KEY = 'fitness.mode';
export const MODES = {
  demo: { db: 'fitness-demo', user: 'demo', label: 'Demo' },
  local: { db: 'fitness-local', user: 'local', label: 'Nur dieses Gerät' },
};

const routes = [
  [/^\/$/, home],
  [/^\/welcome$/, welcome],
  [/^\/gym\/([^/]+)$/, gym],
  [/^\/ex\/new\/([^/]+)$/, exerciseEdit, { isNew: true }],
  [/^\/ex\/([^/]+)\/edit$/, exerciseEdit],
  [/^\/ex\/([^/]+)$/, exercise],
  [/^\/body$/, body],
  [/^\/stats$/, stats],
  [/^\/rewards$/, motivation],
  [/^\/review\/(month|year)\/([\d-]+)$/, review],
  [/^\/settings$/, settings],
];

const NAV = [
  ['#/', '🏠', 'Start', /^\/($|gym|ex)/],
  ['#/body', '⚖️', 'Körper', /^\/body/],
  ['#/stats', '📊', 'Statistik', /^\/stats/],
  ['#/rewards', '🏆', 'Erfolge', /^\/(rewards|review)/],
  ['#/settings', '⚙️', 'Mehr', /^\/settings/],
];

let cleanup = null;
let mode = null;

export function getMode() { return mode; }

export async function setMode(m) {
  if (m) localStorage.setItem(MODE_KEY, m); else localStorage.removeItem(MODE_KEY);
  location.hash = '#/';
  location.reload();
}

function renderNav(path) {
  const nav = document.getElementById('nav');
  nav.hidden = !mode;
  nav.innerHTML = `<div class="brand"><img src="icons/icon-192.png" alt="">Fitness</div>` +
    NAV.map(([href, ico, label, re]) => `<a href="${href}" class="${re.test(path) ? 'active' : ''}"><span class="ico">${ico}</span>${label}</a>`).join('');
}

async function route() {
  let path = (location.hash || '#/').slice(1) || '/';
  if (!mode && path !== '/welcome') { location.hash = '#/welcome'; return; }
  if (mode && path === '/welcome') path = '/';
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
  if (mode) {
    const cfg = MODES[mode];
    await db.open(cfg.db, cfg.user);
    if (mode === 'demo' && !(await db.getMeta('seeded'))) {
      await seedDemo();
      await db.setMeta('seeded', true);
    }
    await ensureDefaultGyms();
    await primeRewards();
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', () => document.getElementById('topbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service Worker:', e));
  }
}

boot();
