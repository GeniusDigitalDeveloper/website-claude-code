/* Service worker Malaysia Image Tools — membolehkan pemasangan (PWA) dan cangkerang luar talian.
   Strategi: rangkaian dahulu, jatuh balik ke cache. Hanya fail dari domain sendiri; Firebase & CDN tidak disentuh. */
const VERSION = 'mit-v4';
const SHELL = ['/', '/index.html', '/css/style.css', '/js/core.js', '/js/tools-1.js', '/js/tools-2.js', '/js/tools-3.js', '/js/app.js',
  '/firebase-config.js', '/favicon.ico', '/icons/logo.png', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/hero-bg.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/admin')) return;              // panel admin tidak dicache
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error())))
  );
});
