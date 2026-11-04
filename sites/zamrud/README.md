# Zamrud

Sistem muat turun video dan audio: YouTube, TikTok (tanpa watermark), Instagram, Facebook. Format MP4, MOV, MKV, MP3, M4A, WAV, FLAC. Ada panel admin dan chatbot bantuan.

## Cara ia berfungsi

| Bahagian | Fungsi | Di mana |
|---|---|---|
| `public/` | Frontend (HTML/CSS/JS statik) dan panel admin `/admin.html` | GitHub Pages **atau** pelayan Zamrud |
| `server/` | API: semak pautan, muat turun guna **yt-dlp + ffmpeg**, statistik, admin | Perlu hos yang boleh jalankan proses (Render, Fly, VPS) |
| `data/db.json` | "Pangkalan data": platform, FAQ chatbot, statistik | Dicipta automatik oleh pelayan |

GitHub Pages hanya hos fail statik. Ia **tidak boleh** menjalankan yt-dlp, jadi muat turun sebenar perlu pelayan Zamrud (`server/`). Pelayan yang sama juga boleh melayan frontend, jadi satu hos sudah cukup.

## Jalankan sendiri

```bash
pip install yt-dlp && sudo apt install ffmpeg   # sekali sahaja
cd sites/zamrud
ADMIN_PASSWORD=... npm start                      # http://localhost:8080 (isi kata laluan sendiri)
```

Pratonton reka bentuk tanpa pelayan: buka `public/index.html?demo`.

## Deploy

1. **Pelayan** (Render): sambung repo, pilih `sites/zamrud/render.yaml` (Blueprint). Isi `ADMIN_PASSWORD`. Atau `docker build -t zamrud sites/zamrud`.
2. **Frontend di GitHub Pages**: Settings > Pages > Source = *GitHub Actions*. Tambah *Variable* `ZAMRUD_API_BASE` = URL pelayan (cth `https://zamrud.onrender.com`). Merge ke `main`, workflow `Zamrud - Deploy Pages` akan hoskan.
3. `ALLOWED_ORIGIN` pada pelayan mesti sama dengan URL frontend (cth `https://izzulisyraf011207.github.io`).

### Tukar ke domain sendiri
Settings > Pages > Custom domain. Di DNS domain: `CNAME www -> izzulisyraf011207.github.io` (atau rekod `A` GitHub untuk apex). Kemudian kemas `ALLOWED_ORIGIN` pada pelayan dengan domain baru.

## Admin
`/admin.html`: ringkasan statistik, tambah/edit/hidupkan/matikan platform (satu domain sudah cukup, yt-dlp sokong 1000+ laman), edit jawapan chatbot, pengumuman, mod penyelenggaraan. Kata laluan = `ADMIN_PASSWORD`.

## Had yang perlu tahu
- Video **private**, had umur, atau perlu log masuk tidak boleh, kecuali anda sediakan `cookies.txt` melalui `YTDLP_COOKIES`.
- YouTube kadang-kadang menyekat IP pusat data. Jika berlaku, guna cookies atau hos dari IP kediaman/VPS lain.
- Kemas yt-dlp dengan kerap (`yt-dlp -U`), platform sentiasa ubah. Docker image tarik versi terkini setiap kali build.
- Muat turun hanya kandungan yang pengguna ada hak untuk simpan.
