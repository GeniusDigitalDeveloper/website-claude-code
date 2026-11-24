# MASTER — Temu Havenly Home

Projek ini diimport dari Gemini. **Layout, Firebase config, database dan rules dalam `panel-awam.html` dan `portal-admin.html` adalah asal — jangan ubah tanpa arahan ustaz.**

## Fail
- `index.html` — buku preview (2 halaman: Panel Awam + Portal Admin, iframe live)
- `panel-awam.html` — laman tetamu (asal, tidak diubah)
- `portal-admin.html` — portal admin (asal, tidak diubah)

## Gaya sedia ada (ikut bila edit)
- Font tajuk: Cinzel (600–800); badan: sans sistem
- Warna: slate (teks/latar) + emerald/teal (aksen, CTA)
- Stack: HTML tunggal + Tailwind CDN + lucide + Firebase Realtime Database (compat 10.12.0)

## Database
- Firebase project `temu-havenly-home-4443a` (Realtime Database, Singapura)
- Kedua-dua fail guna config yang sama; admin tulis, awam baca. Data & booking sedia ada kekal.
