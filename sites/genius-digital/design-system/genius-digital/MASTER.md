# MASTER — Genius Digital

Dua fail statik: `index.html` (laman awam) dan `admin.html` (panel admin). Data produk melalui Firebase (Auth + Firestore); tanpa config, index masuk Mod Pratonton dan admin boleh guna `?demo=1`.

## Warna
Navy `#0A1F44` (primer), Electric Blue `#0A66FF`, Cyan `#00C8F5` (aksen), latar `#F4F7FC`, teks `#0B1B3A`. Mod gelap melalui `data-theme="dark"`.

## Fon
Bebas Neue (jenama/hero), Montserrat (tajuk), Inter (isi), Cairo (Arab).

## Bahasa
BM (lalai), BI, BA (RTL). Pilihan disimpan dalam `localStorage` (`gd-lang`, `gd-theme`) dan dikongsi antara kedua-dua halaman.

## Gaya
Glassmorphism ringan, gradient biru→cyan, hero 3D tilt, reveal on scroll. Hormati `prefers-reduced-motion`.

## Konfigurasi
Isi `firebaseConfig` dalam kedua-dua fail; isi `CONTACT` dalam `index.html`.
