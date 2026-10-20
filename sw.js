// Service Worker: App läuft auch ohne Netz.
// Eigene Dateien: zuerst Netz (damit Updates sofort ankommen), sonst Cache.
// Bibliotheken vom CDN: zuerst Cache (Versionen sind fest).
const CACHE = 'fitness-v33';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png',
  'js/app.js', 'js/db.js', 'js/ui.js', 'js/data.js', 'js/stats.js', 'js/rewards.js', 'js/fun.js', 'js/demo.js',
  'js/charts.js', 'js/photo.js', 'js/csv.js', 'js/backup.js', 'js/icons.js', 'js/geo.js', 'js/config.js', 'js/sync.js', 'js/push.js', 'js/family.js', 'js/sketch.js', 'js/version.js',
  'js/views/welcome.js', 'js/views/home.js', 'js/views/gym.js', 'js/views/exercise.js', 'js/views/exercise-edit.js',
  'js/views/body.js', 'js/views/stats.js', 'js/views/motivation.js', 'js/views/review.js', 'js/views/settings.js', 'js/views/login.js', 'js/views/challenge.js', 'js/views/settings-cloud.js',
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
  const isCdn = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
  if (!sameOrigin && !isCdn) return; // z. B. Supabase-API: nie cachen

  if (isCdn) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (!res.ok && res.type !== 'opaque') return res;
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

// Push-Benachrichtigungen (Etappe 6b)
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(data.title || 'BENA Fitness', {
    body: data.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: data.tag || 'bena',
    data: { url: data.url || './' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(self.registration.scope));
    if (open) { open.navigate(url); return open.focus(); }
    return self.clients.openWindow(url);
  }));
});
