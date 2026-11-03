# MY DEVICE CONTROL

Pengurusan peranti berpusat (tablet Android HONOR + laptop Windows). Firebase projek: `my-devide-control`.

Buka **`preview.html`**: ada preview hidup, langkah 1–8 dan butang salin untuk setiap fail.

| Fail | Fungsi |
|---|---|
| `index.html` | Log masuk (satu fail lengkap: HTML + CSS + JS) |
| `admin.html` | Dashboard admin (satu fail lengkap) |
| `firestore.rules` | Rules Firestore |
| `database.rules.json` | Rules Realtime Database |
| `functions/index.js` | Cloud Functions (backend selamat) |
| `firebase.json`, `firestore.indexes.json` | Konfigurasi deploy |
| `scripts/link-existing-admins.mjs` | Hubungkan semua akaun Auth sedia ada |
| `build-preview.py` + `preview.template.html` | Jana semula `preview.html` selepas ubah fail: `python3 build-preview.py` |
| `rules-test/` | Ujian rules Firestore (emulator): `cd rules-test && npm i && npm test` |
| `android-agent/`, `windows-agent/` | Fasa 2 / 5 (belum dibina) |
