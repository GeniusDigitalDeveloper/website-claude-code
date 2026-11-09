// Service worker Sumayyah Dental Clinic (website awam + panel admin).
// Strategi: rangkaian dahulu, simpanan (cache) hanya jika luar talian — fail baharu sentiasa diambil bila ada internet.
// Data Firebase (Firestore/Realtime DB/Auth) dan fail luar tidak disentuh.
const CACHE = "sumayyah-v1";
const SHELL = [
  "/", "/admin", "/css/style.css", "/css/admin.css", "/js/pwa.js",
  "/img/logo.svg", "/img/favicon.svg", "/img/icon-192.png", "/img/admin-icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: false }) || await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match(url.pathname.startsWith("/admin") ? "/admin" : "/")) || Response.error();
        return Response.error();
      })
  );
});
