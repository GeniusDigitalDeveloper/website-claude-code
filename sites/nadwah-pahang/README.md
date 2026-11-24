# Badan Nadwah Islamiah Pahang

Dua sistem (kod asal dari Gemini, layout tidak diubah):

| Sistem | Fail | URL (selepas domain siap) |
|---|---|---|
| Portal Awam | `public/index.html` | https://nadwahpahang.org |
| Panel Admin | `public/admin/index.html` | https://nadwahpahang.org/admin |

- Database: Firebase Realtime Database projek `nadwah-c5d27` (asia-southeast1). Config Firebase dalam kedua-dua fail kekal asal.
- `firebase.json` hanya ada `hosting`, jadi `firebase deploy` **tidak** sentuh database atau rules sedia ada.

## Deploy

```bash
cd sites/nadwah-pahang
npx firebase-tools deploy --only hosting --project nadwah-c5d27
```

## Domain nadwahpahang.org

Firebase Console → Hosting → Add custom domain → `nadwahpahang.org` (dan `www.nadwahpahang.org` redirect ke apex),
kemudian masukkan rekod DNS (TXT + A) yang Firebase beri di panel DNS pendaftar domain. SSL keluar sendiri dalam beberapa jam.

## Log masuk Panel Admin

Panel Admin guna **Firebase Authentication (Email/Password)**. Sesiapa yang ada akaun dalam
Firebase Console → Authentication → Users boleh log masuk terus (tiada senarai UID). Untuk tambah admin baru,
tambah user di situ sahaja. Untuk buang akses, padam atau disable user tersebut.

## Pautan bersih (tanpa #, path dalam Bahasa Inggeris)

Bahasa kandungan website default Bahasa Melayu; hanya path URL dalam BI.

Portal: `/news` (Berita), `/news/<id>` (baca berita), `/corporate`, `/about`, `/complex-plan`, `/programs`, `/gallery`, `/comments`, `/contact`,
`/committee`, `/main-committee`, `/general-committee`, `/introduction`.

Admin: `/admin`, `/admin/banner`, `/admin/cta`, `/admin/programs`, `/admin/committee`, `/admin/history`,
`/admin/complex-plan`, `/admin/news`, `/admin/gallery`, `/admin/corporate`, `/admin/comments`.

Pautan lama (`/#korporat`, `/korporat`, `/admin/korporat`, ...) auto ditukar ke path BI.
`firebase.json` ada `rewrites` supaya semua path ini buka `index.html` yang betul.

## Berita

- Data dalam Realtime Database nod `news/{id}`: `title` & `body` (HTML berformat), `date` (YYYY-MM-DD),
  `published`, `images` (data URL dimampatkan atau URL https) + `imageIds` (rujukan tetap), `headerIndex`, `headerHeight`, `headerWidth`,
  `headerFit`, `headerPos`, `lineHeight` (default 1.15), `createdAt`, `updatedAt`.
- Portal: penapis Tahun + Bulan (default bulan semasa), susunan terkini di atas, butang anak panah buka berita,
  butang **Cetak Berita** (berita sahaja, satu muka A4, auto kecil jika panjang).
- Admin: tab **Berita** (`/admin/news`) untuk tulis/edit/padam, muat naik gambar, pilih header & saiz,
  toolbar font/saiz/bold/italic/underline/jajaran (default justify), jarak baris.
- Gambar dalam teks: `<figure data-ref data-w data-ratio data-pos data-align>` dalam `body` (tiada data gambar,
  dirujuk melalui `imageIds`). Admin seret gambar dari panel **Gambar Dipilih** ke dalam teks; klik gambar untuk
  saiz, crop, fokus, kiri/tengah/kanan, alih atas/bawah, buang. Butang × pada panel memadam gambar terus dari database.
- Pratonton sentiasa terbuka di bawah editor: draf ditulis ke `localStorage` (`nadwahNewsPreview`), dipaparkan di `/news/__preview`.
- Simpan automatik 2.5 saat selepas perubahan terakhir (juga bila tukar tab/tutup halaman); butang Simpan Berita untuk simpan segera.

## Galeri & Pelawat

- Galeri: default kategori Pendidikan, "Semua" di hujung; papar 3 baris, selebihnya skrol dalam kotak galeri.
- Pelawat: Hari Ini (`visitors/daily/<YYYY-MM-DD>` waktu Malaysia), Bulan Ini (jumlah hari dalam bulan semasa),
  Keseluruhan (`visitors/total`).
