/* Service worker panel awam (/invoice/). Skop terhad kepada /invoice/ — panel admin tidak disentuh.
   Strategi: HTML/JS/CSS laman sendiri = rangkaian dahulu (sentiasa versi terkini), jatuh ke cache jika luar talian/lambat.
   CDN statik berversi (Firebase SDK, jsPDF, fon) = cache-first + kemas kini latar. Panggilan Firebase/Firestore/Auth TIDAK dicache. */
const V = "inv-pwa-v1";
const SHELL = ["/invoice/", "/assets/css/app.css", "/assets/img/logo.png", "/assets/img/icon-192.png", "/assets/img/banner.jpg"];
const CDN = new Set(["www.gstatic.com", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"]);

self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("message", (e) => { if (e.data === "skipWaiting") self.skipWaiting(); });

const put = (req, res) => { if (res && (res.ok || res.type === "opaque")) caches.open(V).then((c) => c.put(req, res.clone())); return res; };
function networkFirst(req, ms = 3500, key) {
  return new Promise((resolve) => {
    let done = false; const fall = () => caches.match(key || req).then((h) => h || caches.match("/invoice/"));
    const t = setTimeout(() => fall().then((h) => { if (h && !done) { done = true; resolve(h); } }), ms);
    fetch(req).then((res) => { clearTimeout(t); if (!done) { done = true; resolve(put(key || req, res)); } else put(key || req, res); })
      .catch(() => { clearTimeout(t); if (!done) fall().then((h) => { done = true; resolve(h || Response.error()); }); });
  });
}
function cacheFirst(req) {
  return caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => put(req, res)).catch(() => hit);
    return hit || net;
  });
}
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET") return; const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (!(u.pathname.startsWith("/invoice/") || u.pathname.startsWith("/assets/"))) return; // /admin/ dan lain-lain: biar pelayar
    if (u.pathname === "/invoice/sw.js") return;
    if (r.mode === "navigate") return e.respondWith(networkFirst(r, 3500, "/invoice/"));
    return e.respondWith(networkFirst(r));
  }
  if (CDN.has(u.hostname) && (u.hostname !== "www.gstatic.com" || u.pathname.startsWith("/firebasejs/"))) return e.respondWith(cacheFirst(r));
  // lain-lain (firestore.googleapis.com, identitytoolkit, accounts.google.com, firebaseapp.com/__/auth ...): tidak disentuh
});
