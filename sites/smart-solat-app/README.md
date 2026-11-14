# Smart Solat (app)

Sistem waktu solat pintar untuk TV masjid/surau. Dibina atas `sites/smart-solat/` (rujukan asal, tidak diubah). Next.js 15 (App Router) + Tailwind 4 + lucide-react. Tiada backend, tiada Firebase.

## Halaman

| Laluan | Fungsi |
|---|---|
| `/` | Senarai masjid, tambah, eksport/import JSON |
| `/tv?m=<id>` | Mod TV penuh skrin: waktu JAKIM, kiraan detik, kelip 1 minit sebelum waktu, pop-up + azan, slideshow latar, ticker pengumuman, wake lock, kawalan auto-sembunyi |
| `/admin?m=<id>` | Tetapan: nama, zon (auto/pilih), azan, pengumuman, slideshow, PIN |

## Data

Profil masjid disimpan dalam `localStorage` (kunci `ss_masjids`) pada peranti. Pindah ke TV lain melalui Eksport/Import JSON. PIN admin hanya halangan kasual (tiada backend). Untuk pelbagai peranti yang segerak dan admin sebenar, perlu tambah backend.

## Jalankan

```bash
npm install && npm run dev      # http://localhost:3000
npm run build && npm start
```

Pelayar perlu capai `www.e-solat.gov.my`, `api.waktusolat.app`, `ipwho.is`. Azan berbunyi selepas pengguna klik/ketik sekali (peraturan autoplay).

Design system: `design-system/smart-solat/MASTER.md`.
