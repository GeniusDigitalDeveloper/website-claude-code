/* Genius Digital — service worker (PWA).
   - Laman (HTML): rangkaian dahulu, kembali ke cache jika luar talian. Kemas kini sentiasa nampak.
   - Fail statik sama-asal (ikon, manifest): cache dahulu, dikemas kini di latar.
   - Firebase / Google Fonts / gstatic (lain asal): tidak disentuh, terus ke rangkaian. */
const CACHE = "gd-v2";
const SHELL = ["/", "/admin", "/manifest.webmanifest", "/admin.webmanifest", "/icons/icon-192.png", "/icons/logo-192.png", "/favicon.ico", "/icons/icon-512.png", "/icons/admin-icon-192.png", "/icons/admin-icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match(url.pathname.startsWith("/admin") ? "/admin" : "/"))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
