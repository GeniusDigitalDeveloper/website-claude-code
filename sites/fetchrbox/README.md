# Fetchr Box

Sistem muat turun video dan audio: YouTube, TikTok (tanpa watermark), Instagram, Facebook. Format MP4, MOV, MKV, MP3, M4A, WAV, FLAC. Ada panel admin dan chatbot bantuan.

## Hos: Firebase (projek `genius-digital-40bc9`, aplikasi web FETCHR BOX)

| Bahagian | Pautan / lokasi | Status |
|---|---|---|
| Laman awam | https://genius-digital-40bc9.web.app | Aktif |
| Panel admin | https://genius-digital-40bc9.web.app/admin | Aktif |
| Pangkalan data | Cloud Firestore `asia-southeast1`, masa nyata | Aktif |
| Rules | `firestore.rules` | Aktif |
| Pengesahan | Firebase Auth, **e-mel + kata laluan sahaja** (tiada Google, tiada e-mel pengesahan) | Aktif |
| Pelayan muat turun (`server/`, yt-dlp + ffmpeg) | Render (`render.yaml`), URL dalam `public/assets/js/config.js` | Aktif |

Projek Firebase ini dikongsi dengan aplikasi lain (Auth dan Firestore). Satu tapak Hosting sahaja tersedia, jadi panel admin berada di laluan `/admin` pada tapak yang sama.

### Pengguna
Pengguna mesti **daftar** (e-mel + kata laluan) sebelum boleh guna. Selepas daftar mereka terus ke skrin log masuk. Lupa kata laluan: pautan reset dihantar ke e-mel pendaftaran (Firebase). Tiada e-mel pengesahan dihantar semasa daftar.

### Admin
Admin ialah akaun yang ada **custom claim `admin=true`** (rules menyemak claim, bukan e-mel, supaya tidak boleh dipalsukan melalui pendaftaran awam). Cara jadikan satu akaun admin: daftar di laman awam, kemudian set claim (`auth_update_user` melalui Firebase MCP, atau Admin SDK `setCustomUserClaims(uid, {admin: true})`).

### Data yang ditulis pelayan untuk laman awam
- `stats/public` : `{ total, days: { 'YYYY-MM-DD': n } }` (footer awam: hari ini, bulan ini, jumlah. Boleh dibaca semua, tiada data peribadi)
- `users/{uid}.stats` : `{ total, mp4, mp3, other }` dan `users/{uid}.recent` : `[{ title, thumb, format, platform }]` (halaman profil pengguna sendiri)

### Statistik (masa nyata, waktu Malaysia)
Pelayan muat turun menulis ke Firestore (akaun perkhidmatan, tidak tertakluk pada rules):
- `daily/{YYYY-MM-DD}` : `{ count, byPlatform, byFormat }` (kunci tarikh = reset pukul 12 tengah malam MYT secara semula jadi)
- `stats/summary` : `{ total, failed, byPlatform, byFormat, recent: [...] }`

Panel admin: **hari ini** = dokumen harini; **bulan ini** = jumlah semua hari dalam bulan kalendar semasa (28/29/30/31 mengikut kalendar); **keseluruhan** = `stats/summary.total`. Bila bulan bertukar, hari-hari bulan lepas tidak lagi dikira sebagai "bulan ini" tetapi kekal dalam jumlah keseluruhan dan sejarah bulanan.

### Bahasa
Laman awam: Bahasa Melayu (lalai), English, العربية (RTL). Kandungan FAQ dan pengumuman disimpan tiga bahasa dalam Firestore dan diedit dari panel admin.

## Deploy

```bash
cd sites/fetchrbox
firebase deploy --only hosting,firestore
```

## Aktifkan muat turun sebenar (Cloud Run)

1. Naik taraf projek ke pelan **Blaze** (Console > Usage and billing). Ada kuota percuma, tapi perlukan kad.
2. `gcloud run deploy fetchrbox --source . --region asia-southeast1 --allow-unauthenticated` (guna `Dockerfile` sedia ada).
3. Tambah dalam `firebase.json` bawah `hosting`: `"rewrites": [{ "source": "/api/**", "run": { "serviceId": "fetchrbox", "region": "asia-southeast1" } }]`.
4. Tukar `DOWNLOADS_ENABLED` kepada `true`, deploy semula Hosting.

Pelayan akan diubah supaya mengesahkan token Firebase pengguna, membaca platform dari Firestore dan menulis statistik seperti di atas semasa langkah ini.

## Domain sendiri
Firebase Console > Hosting > *Add custom domain*, kemudian letak rekod DNS yang diberi.

## Jalankan setempat
```bash
pip install yt-dlp && sudo apt install ffmpeg
cd sites/fetchrbox && ADMIN_PASSWORD=... npm start   # http://localhost:8080
```
Pratonton reka bentuk: tambah `?demo` pada URL.

## Admin
Tapak admin berasingan. Ringkasan statistik, tambah/edit/hidupkan/matikan platform (satu domain sudah cukup), edit jawapan chatbot, pengumuman, mod penyelenggaraan.

## Had
- Video private, had umur, atau perlu log masuk tidak boleh, kecuali ada `cookies.txt` (`YTDLP_COOKIES`).
- YouTube kadang-kadang menyekat IP pusat data.
- Kemas yt-dlp dengan kerap; Docker image tarik versi terkini setiap build.
- Muat turun hanya kandungan yang pengguna ada hak untuk simpan.

## Notifikasi, chat admin dan terjemahan automatik
- `notifications/{id}` : `{ title:{ms,en,ar}, body:{ms,en,ar}, createdAt, by }` (admin hantar, semua pengguna baca). Keadaan baca/padam setiap pengguna disimpan di `users/{uid}/nstate/{id}`. Pop-up kekal sehingga pengguna buka panel notifikasi.
- `chats/{uid}` + `chats/{uid}/messages/{mid}` : chat pengguna dengan admin, masa nyata. Pengguna hanya boleh akses chat sendiri.
- **Terjemahan** (`assets/js/translate.js`) dilakukan di pelayar menggunakan titik akhir percuma (Google tidak rasmi, kemudian MyMemory). Tiada jaminan perkhidmatan: jika gagal, teks asal dipaparkan. Untuk kebolehpercayaan penuh, gantikan dengan Cloud Translation API melalui pelayan (perlukan Blaze). Teks mesej dihantar kepada penyedia terjemahan itu.

## Hak cipta: apa yang dilakukan sistem (dan yang tidak)
Tiada cara sebenar untuk mengesahkan status hak cipta sesuatu video daripada metadata platform (contohnya video muzik rasmi tidak membawa medan lesen atau artis). Perlindungan berlapis:
1. **Notis merah** di atas kotak tampal dan halaman **Terma & Hak Cipta** (3 bahasa).
2. **Pengakuan wajib** (kotak tanda) sebelum Imbas dan Muat Turun. Pelayan menolak permintaan tanpa `declared: true`.
3. **Tapisan automatik** (`server/classify.mjs`): lesen Creative Commons / domain awam dibenarkan; muzik rasmi, lirik, trek berartis, label/VEVO/Topic, filem/siri/episod dan kandungan terhad atau berbayar ditolak dengan HTTP 451 (`copyright_music`, `copyright_media`, `copyright_restricted`). Semakan diulang semasa permintaan muat turun. Penolakan direkodkan (`stats.blocked`).
4. Pautan WhatsApp admin untuk pemilik hak cipta yang mahu aduan atau penyekatan.
Ini usaha terbaik dan **bukan jaminan undang-undang**. Dapatkan nasihat peguam untuk terma dan dasar privasi rasmi.

Ujian tapisan: `node --test server/classify.test.mjs`.

## Kelulusan kandungan berhak cipta (permohonan kepada admin)
1. Pautan yang ditolak (HTTP 451) memaparkan butang **Mohon kelulusan admin** (dan WhatsApp admin). Pengguna menulis penerangan ringkas, lalu dokumen `requests/{id}` dicipta (`status: pending`).
2. Panel admin > **Kelulusan**: senarai masa nyata, penapis status, catatan pilihan, butang **Dibenarkan** / **Ditolak**. Keputusan menulis `status`, `adminNote`, `decidedAt`, `decidedBy` dan menghantar notis peribadi tiga bahasa ke `users/{uid}/notices/{id}` (muncul dalam loceng pengguna dengan pop-up merah).
3. Profil pengguna > tab **Permohonan**: status Menunggu / Dibenarkan / Ditolak. Hanya yang Dibenarkan ada butang **Muat turun**.
4. Pelayan menghormati kelulusan: permintaan membawa `approvalId` + `idToken`; pelayan membaca `requests/{id}` melalui REST Firestore menggunakan token pengguna itu (rules hanya benarkan pemilik membaca dan hanya admin menukar status) dan menyemak `status == approved` serta `url` sepadan (`server/approval.mjs`, ujian: `node --test server/`). Tiada kunci rahsia diperlukan.
