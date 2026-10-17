// Service Worker: App läuft auch ohne Netz.
// Eigene Dateien: zuerst Netz (damit Updates sofort ankommen), sonst Cache.
// Bibliotheken vom CDN: zuerst Cache (Versionen sind fest).
const CACHE = 'fitness-v5';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png',
  'js/app.js', 'js/db.js', 'js/ui.js', 'js/data.js', 'js/stats.js', 'js/rewards.js', 'js/fun.js', 'js/demo.js',
  'js/charts.js', 'js/photo.js', 'js/csv.js', 'js/backup.js', 'js/icons.js', 'js/geo.js',
  'js/views/welcome.js', 'js/views/home.js', 'js/views/gym.js', 'js/views/exercise.js', 'js/views/exercise-edit.js',
  'js/views/body.js', 'js/views/stats.js', 'js/views/motivation.js', 'js/views/review.js', 'js/views/settings.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isCdn = url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'cdn.jsdelivr.net';
  if (!sameOrigin && !isCdn) return; // z. B. Supabase-API: nie cachen

  if (isCdn) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    })));
    return;
  }

  // no-cache: beim Server nachfragen, ob es eine neue Version gibt (sonst bleiben Updates im HTTP-Cache hängen)
  e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
