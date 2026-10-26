# Nasi Arab Tolhah — Website

Website kedai makan dwibahasa (BM / EN) dengan troli, checkout tempahan (tempah meja atau bungkus), invois, dan hantar pesanan ke WhatsApp. HTML + CSS + JavaScript vanilla, tiada build step.

## Fail

```
index.html          struktur halaman
css/style.css       gaya, animasi 3D, responsif
js/data.js          CONFIG kedai, 10 nasi, 20 minuman, teks BM/EN
js/app.js           troli, checkout, invois, WhatsApp, kesan 3D
assets/logo.svg     logo (juga favicon.svg)
assets/img/         gambar menu (Pexels, lesen percuma untuk kegunaan komersial)
```

## Tukar maklumat kedai

Semua dalam `CONFIG` di atas `js/data.js`:

- `whatsapp`: nombor WhatsApp format antarabangsa tanpa `+` (sekarang `60177977935` = 017-797 7935)
- `address`, `mapsUrl`: alamat dan pautan Google Maps
- `socials`: nama dan pautan TikTok, Instagram, Facebook
- `openHour`, `closeHour`: waktu operasi (had masa tempahan)

Harga dan menu: ubah `RICE` dan `DRINKS` dalam fail yang sama. Gambar: ganti fail dalam `assets/img/` dengan nama yang sama.

## Jalankan

Buka `index.html` terus, atau:

```bash
cd sites/nasi-arab-tolhah && python3 -m http.server 8080
```

## Deploy

- **GitHub Pages**: Settings → Pages → pilih branch, kemudian buka `/sites/nasi-arab-tolhah/`.
- **Netlify / Vercel**: set root directory `sites/nasi-arab-tolhah`, tiada build command.
