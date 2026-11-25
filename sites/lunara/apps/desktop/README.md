# LUNARA MUSIC untuk Windows

**Muat turun:** `sites/lunara/downloads/LUNARA-MUSIC-Setup.exe` (pautan awam dalam Tetapan → Aplikasi).

## Versi edaran: `lite/` (≈450 KB)
- `LUNARA MUSIC.exe` membuka app dalam tetingkap sendiri (tanpa bar pelayar) menggunakan enjin Microsoft Edge
  yang sedia ada dalam Windows 10/11 (Chrome sebagai sandaran).
- Ia sentiasa memuatkan https://lunara-music.web.app, jadi **setiap deploy terus sampai kepada pengguna**:
  tiada butang Update, tiada muat turun semula. App web pula memuat semula sendiri bila versi baharu
  dikesan (hanya ketika muzik tidak dimainkan).
- Pemasang: satu klik, per-pengguna (tiada admin), pintasan Desktop + Start Menu, nyahpasang dari Settings → Apps.
- Bina (Linux/Windows): `npm run dist:lite` (perlukan `makensis`).

## Versi penuh: Electron (`main.js`, ≈117 MB)
`npm run dist:full`. Tidak diedarkan sekarang kerana Firebase Hosting pelan Spark melarang fail .exe
dan saiznya besar. Boleh diedar melalui GitHub Releases jika perlu.
