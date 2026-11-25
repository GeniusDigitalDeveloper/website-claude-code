# AURALYQO — Your Music. Your Universe.

Ekosistem penstriman muzik & pemain muzik tempatan, tanpa iklan. Logo: `brand/` (latar putih dibuang, PNG lutsinar + ikon app).

## Jalankan
```bash
cd apps/web
cp .env.example .env.local   # pilihan: isi config Firebase untuk log masuk & sync
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```
Tanpa Firebase, app berjalan dalam **mod peranti** (semua ciri muzik berfungsi, data di peranti). Lihat `docs/SETUP-FIREBASE.md`.

## Struktur
`apps/web` (web, desktop, PWA, /tv, /admin) · `apps/mobile` (Flutter, belum) · `backend/` (rules, functions, skema, templat e-mel) · `packages/` (design tokens, jenis kongsi) · `docs/` · `tests/`

## Status ujian penerimaan (brief §30)
✅ = dilaksana **dan diuji** di sini · 🟡 = kod siap, perlu kunci/akaun luar untuk diuji · ❌ = belum

| # | Ciri | Status |
|---|---|---|
| 1–4 | Daftar/log masuk Google & e-mel | 🟡 kod Firebase Auth siap; perlu projek Firebase |
| 5 | Pengesahan e-mel | 🟡 |
| 6–7 | Lupa kata laluan + e-mel reset berjenama | 🟡 Cloud Function + templat HTML siap (ujian unit lulus); perlu SMTP |
| 8 | Tunjuk/sorok kata laluan | ✅ |
| 9–10 | Edit profil, potong/zum/ubah kedudukan gambar, potong semula dari gambar asal | ✅ mod peranti · 🟡 Storage |
| 11 | Pengesanan automatik muzik Android (MediaStore) | ❌ perlu app Flutter native. Web: import fail + imbas folder (Chrome/Edge) ✅ |
| 12 | Import manual iOS | ✅ melalui pemilih fail (PWA Safari) |
| 13–14 | Tambah muzik peribadi, edit metadata & kulit | ✅ (MP3 & FLAC diuji, tag ID3 dibaca) |
| 15 | Carian global | ✅ katalog Deezer sebenar, cadangan segera, sejarah, trending |
| 16 | Penstriman berlesen | ✅ pratonton 30s Deezer (dilabel). Lagu penuh perlu lesen — `docs/licensing` |
| 17–20 | Main/jeda, fade out, fade in, next/prev dengan fade | ✅ gain 0→1 & 1→0 dalam 2s diukur dari enjin audio; jeda hanya selepas fade |
| — | Crossfade (berasingan) | ✅ diukur |
| 21–23 | Shuffle, repeat, giliran (susun seret, buang, main seterusnya, kosongkan, simpan) | ✅ |
| 24–27 | Playlist (cipta, edit, kulit, susun, duplikasi, padam, awam/peribadi), kegemaran, album | ✅ |
| 28 | Halaman artis | ✅ (biografi: pembekal tidak sediakan) |
| 29 | Main balik latar & kawalan skrin kunci | ✅ Media Session API (web/PWA); native ❌ |
| 30–31 | Mod terang/gelap/sistem | ✅ |
| 32 | Sync antara peranti | 🟡 kod Firestore + offline siap; perlu Firebase |
| 33–34 | Web responsif, desktop | ✅ 375/768/1440, tiada scroll mendatar |
| 35 | Navigasi TV | ✅ `/tv` D-pad diuji |
| 36 | Tiada iklan | ✅ tiada SDK iklan |
| 37 | Keselamatan pangkalan data | 🟡 rules ditulis; perlu deploy + ujian emulator |
| 38 | Prestasi | ✅ build production lulus |

## Layout boleh diubah
Bukan template kekal: `/studio` (4 preset, aksen, saiz kad, kepadatan, sudut, sidebar kiri/kanan, panel kanan, pemain bar/terapung, susun/sorok/namakan seksyen, eksport/import JSON) atau butang **Edit layout** di Utama.
