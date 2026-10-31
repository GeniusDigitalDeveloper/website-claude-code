# Klinik Gigi Sumayyah — Website + Panel Admin

Website statik (HTML/CSS/JS) disambung ke projek Firebase **SumayyahDental** (`sumayyahdental`).
Semua kandungan diedit dari panel admin dan muncul **serta-merta** (realtime) di website awam.

| Halaman | Fail | Akses |
|---|---|---|
| Website awam | `public/index.html` | Semua orang |
| Panel admin | `public/admin.html` (URL: `/admin`) | Hanya akaun UID `PBq9CMPmd2O8q71us6OAqeaqhdu1` |

## Mula guna (kali pertama)
1. Buka `/admin`, log masuk dengan e-mel & kata laluan akaun admin Firebase Auth.
2. Di **Papan Pemuka**, tekan **Isi Data Contoh** — semua kandungan contoh disalin ke Firestore.
3. Edit apa sahaja: Tetapan & Logo, Banner Utama, Banner Promosi, Perkhidmatan, Pakej, Doktor, Galeri, Testimoni, Soalan Lazim, Statistik & Kelebihan, Status & Pengumuman.

Gambar dimampatkan dalam pelayar dan disimpan terus dalam Firestore (tak perlu Firebase Storage / pelan Blaze).

## Struktur data
**Firestore**
- `tetapan/umum` — nama, logo, telefon, WhatsApp, e-mel, alamat, peta, sosial, waktu operasi, jadual
- `tetapan/hero`, `tetapan/statistik`, `tetapan/kelebihan`
- `banner`, `perkhidmatan`, `pakej`, `galeri`, `doktor`, `testimoni`, `soalan` — koleksi (medan `susunan` untuk turutan)
- `tempahan` — borang tempahan awam (awam boleh cipta sahaja; admin baca/urus)

**Realtime Database**
- `status` — `modOperasi` (auto/buka/tutup), `pengumuman`, `pengumumanAktif`

**SQL** — `database/schema.sql` (PostgreSQL) dan `database/schema.gql` (Firebase SQL Connect) dengan jadual setara.

## Rules
- `firestore.rules` dan `database.rules.json` — **sudah di-deploy** ke projek `sumayyahdental`.
- `storage.rules` — sedia untuk masa depan (Storage perlukan pelan Blaze).

## Deploy / jalankan
```bash
npx firebase-tools deploy --only hosting      # terbitkan website ke https://sumayyahdental.web.app
npx firebase-tools deploy --only firestore,database   # deploy semula rules
python3 -m http.server 8080 -d public          # uji secara lokal
```

## Tukar UID admin
Tukar UID di 3 tempat: `public/js/firebase.js`, `firestore.rules`, `database.rules.json`, kemudian deploy rules semula.
