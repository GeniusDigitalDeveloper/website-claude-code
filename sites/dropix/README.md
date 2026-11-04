# Dropix

Sistem muat turun video dan audio: YouTube, TikTok (tanpa watermark), Instagram, Facebook. Format MP4, MOV, MKV, MP3, M4A, WAV, FLAC. Ada panel admin dan chatbot bantuan.

## Hos: Firebase (projek `dropix-media-izzul`)

| Bahagian | Di mana | Status |
|---|---|---|
| Frontend (`public/`) | Firebase Hosting | Aktif |
| Pangkalan data (platform, FAQ chatbot, pengumuman, statistik) | Cloud Firestore, `asia-southeast1` | Aktif |
| Rules | `firestore.rules`: `site/*` awam baca, admin sahaja tulis; `stats/*` admin sahaja | Aktif |
| Log masuk admin | Firebase Auth, Google. E-mel admin ditetapkan dalam `firestore.rules` dan `firebase.js` | Aktif |
| Pelayan muat turun (`server/`, yt-dlp + ffmpeg) | Cloud Run, disambung ke Hosting melalui rewrite `/api/**` | **Belum**, perlukan pelan Blaze |

Pelayan muat turun tidak boleh jalan di Hosting/Spark. Selagi ia belum disambung, `DOWNLOADS_ENABLED` dalam `public/assets/js/config.js` ialah `false` dan laman berada dalam **mod pratonton** (data contoh, tiada muat turun sebenar).

## Deploy

```bash
cd sites/dropix
firebase deploy --only hosting,firestore
```

## Aktifkan muat turun sebenar (Cloud Run)

1. Naik taraf projek ke pelan **Blaze** (Console > Usage and billing). Ada kuota percuma, tapi perlukan kad.
2. `gcloud run deploy dropix --source . --region asia-southeast1 --allow-unauthenticated` (guna `Dockerfile` sedia ada).
3. Tambah dalam `firebase.json` bawah `hosting`: `"rewrites": [{ "source": "/api/**", "run": { "serviceId": "dropix", "region": "asia-southeast1" } }]`.
4. Tukar `DOWNLOADS_ENABLED` kepada `true`, deploy semula Hosting.

Pelayan kini ada API admin sendiri (kata laluan) yang tidak digunakan oleh panel Firebase. Ia akan diubah supaya membaca platform dari Firestore dan menulis statistik ke `stats/summary` semasa langkah ini.

## Domain sendiri
Firebase Console > Hosting > *Add custom domain*, kemudian letak rekod DNS yang diberi.

## Jalankan setempat
```bash
pip install yt-dlp && sudo apt install ffmpeg
cd sites/dropix && ADMIN_PASSWORD=... npm start   # http://localhost:8080
```
Pratonton reka bentuk: tambah `?demo` pada URL.

## Admin
`/admin`: log masuk Google. Ringkasan statistik, tambah/edit/hidupkan/matikan platform (satu domain sudah cukup), edit jawapan chatbot, pengumuman, mod penyelenggaraan.

## Had
- Video private, had umur, atau perlu log masuk tidak boleh, kecuali ada `cookies.txt` (`YTDLP_COOKIES`).
- YouTube kadang-kadang menyekat IP pusat data.
- Kemas yt-dlp dengan kerap; Docker image tarik versi terkini setiap build.
- Muat turun hanya kandungan yang pengguna ada hak untuk simpan.
