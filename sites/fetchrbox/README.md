# Fetchr Box

Sistem muat turun video dan audio: YouTube, TikTok (tanpa watermark), Instagram, Facebook. Format MP4, MOV, MKV, MP3, M4A, WAV, FLAC. Ada panel admin dan chatbot bantuan.

## Hos: Firebase (projek `fetchr-box-izzul`)

| Bahagian | Pautan / lokasi | Status |
|---|---|---|
| Laman awam | https://fetchr-box-izzul.web.app | Aktif |
| Panel admin (tapak berasingan) | https://fetchrbox-admin-izzul.web.app | Aktif |
| Pangkalan data | Cloud Firestore `asia-southeast1`, dikongsi kedua-dua tapak, masa nyata | Aktif |
| Rules | `firestore.rules` | Aktif |
| Pengesahan | Firebase Auth, **e-mel + kata laluan sahaja** (tiada Google, tiada e-mel pengesahan) | Aktif |
| Pelayan muat turun (`server/`, yt-dlp + ffmpeg) | Cloud Run, disambung melalui rewrite `/api/**` | **Belum**, perlukan pelan Blaze |

Dua tapak Hosting berkongsi folder `public/`. `firebase.json` menetapkan fail mana yang diabaikan bagi setiap tapak, jadi kod admin tidak pernah dihantar ke tapak awam.

### Pengguna
Pengguna mesti **daftar** (e-mel + kata laluan) sebelum boleh guna. Selepas daftar mereka terus ke skrin log masuk. Lupa kata laluan: pautan reset dihantar ke e-mel pendaftaran (Firebase). Tiada e-mel pengesahan dihantar semasa daftar.

### Admin
Admin ialah akaun yang ada **custom claim `admin=true`** (rules menyemak claim, bukan e-mel, supaya tidak boleh dipalsukan melalui pendaftaran awam). Cara jadikan satu akaun admin: daftar di laman awam, kemudian set claim (`auth_update_user` melalui Firebase MCP, atau Admin SDK `setCustomUserClaims(uid, {admin: true})`).

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
