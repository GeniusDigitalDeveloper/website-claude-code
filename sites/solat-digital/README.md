# Solat Digital

Sistem paparan waktu solat untuk TV masjid/surau. Firebase projek `solat-digital-my` (Spark/percuma): Firestore, Realtime Database, Hosting, Auth. Live: https://solat-digital-my.web.app

| Laluan | Aplikasi |
|---|---|
| `/` (`/?m=<id>`) | TV awam. Tanpa `m` = demo (tiada pop-up/azan, nota langganan sekali seumur hidup) |
| `/pengurus/` | Admin masjid: daftar sekali, log masuk, tetapan, gambar latar, azan, pengumuman |
| `/super/` | Admin Solat Digital (admin besar): senarai masjid, statistik, aktifkan akses penuh, perpustakaan azan |

Setiap satu ialah PWA berasingan (butang Pasang aplikasi).

## Data
- `registry/{uid}` rekod pendaftaran (nama, alamat, pengurus, emel, zon); admin besar + pemilik sahaja boleh baca.
- `tv/{uid}` (+ `img/`) konfigurasi paparan; baca awam; `plan` hanya admin besar boleh ubah.
- `azan/{id}` perpustakaan azan (kredit); tulis admin besar sahaja.
- `admins/{uid}` penanda admin besar (tambah melalui Console/Admin, tiada tulis dari klien).
- RTDB `presence/{uid}` denyutan TV (dalam talian).
Rules: `rules/`. Deploy: `npm run build && firebase deploy --project solat-digital-my`.
