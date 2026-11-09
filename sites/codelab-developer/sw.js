/* Service worker CodeLab Developer — membolehkan pemasangan (PWA) dan penggunaan luar talian.
   Strategi: shell di-precache; fail tapak sendiri = stale-while-revalidate; aset/vendor = cache-first.
   TIDAK menyentuh: /admin/ (sentiasa rangkaian), permintaan silang-asal (Firestore/Auth), bukan-GET. */
const VERSION = 'cl-v3';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const PRECACHE = [
  '/', '/index.html', '/manifest.webmanifest', '/favicon.ico?v=3',
  '/assets/icons/icon-192.png?v=3', '/assets/icons/icon-512.png?v=3', '/assets/icons/apple-touch-icon.png?v=3',
  '/css/fonts.css', '/css/base.css', '/css/layout.css', '/css/components.css',
  '/js/main.js', '/js/pages.js', '/js/registry.js', '/js/config.js',
  '/locales/ms.json', '/locales/en.json', '/locales/ar.json',
  '/assets/img/hero-bg.webp', '/assets/img/hero-bg-sm.webp',
  '/assets/fonts/PlusJakartaSans-latin-fdb05b.woff2', '/assets/fonts/NotoSansArabic-arabic-ec7e2e.woff2', '/assets/fonts/JetBrainsMono-latin-480c06.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const swr = async (req, cacheName) => {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
};
const cacheFirst = async (req) => {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(req); if (hit) return hit;
  const r = await fetch(req); if (r.ok) cache.put(req, r.clone()); return r;
};

self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/admin')) return;               // admin: tanpa cache
  if (req.mode === 'navigate') {                                 // halaman: rangkaian dahulu, jatuh ke cache
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  if (/^\/assets\/(fonts|vendor)\//.test(url.pathname)) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(swr(req, RUNTIME));
});
