// Service worker ringkas untuk panel admin supaya boleh dipasang sebagai aplikasi (PWA). Tiada cache data: sentiasa terus dari pelayan.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
