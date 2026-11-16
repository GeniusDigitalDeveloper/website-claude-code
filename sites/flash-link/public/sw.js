// Service worker ringkas supaya Flash Link boleh dipasang sebagai app. Tiada cache: sentiasa terus dari pelayan.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
