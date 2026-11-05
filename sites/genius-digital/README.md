# GENIUS DIGITAL — Portal Produk Digital + Admin Panel (Firebase)

HTML + CSS + JavaScript biasa (tiada framework, tiada build). Backend: Firebase (Authentication, Cloud Firestore, Storage).

```
index.html        Website awam (nav, hero, about, products, contact, footer)
admin.html        Admin Panel (login, dashboard, CRUD produk, upload thumbnail)
bahagian GENIUS_CONFIG dalam index.html dan admin.html         SATU tempat: Firebase config + maklumat kenalan
firestore.rules   Rules Firestore          storage.rules    Rules Storage
database.rules.json  Rules Realtime Database (TIDAK digunakan — lihat nota)
firebase.json     Konfigurasi deploy rules + hosting
scripts/set-admin.js  Tetapkan admin (jalankan di komputer anda)
design-system/    MASTER.md (warna, font, peraturan reka bentuk)
```

## 0. Lihat preview serta-merta (tanpa Firebase)
```bash
cd sites/genius-digital
python3 -m http.server 8000      # kemudian buka http://localhost:8000/preview.html
```
Selagi `bahagian GENIUS_CONFIG dalam index.html dan admin.html` masih placeholder: website memaparkan 2 produk contoh (banner "Mod demo"), dan `admin.html` ada butang **"Lihat UI demo"** (data dalam memori sahaja; hilang automatik bila Firebase dikonfigurasi). Ini bukan login palsu: tiada kata laluan dan tiada akses ke data sebenar.

## 1. Sediakan projek Firebase
1. https://console.firebase.google.com → **Add project** → nama: `Genius Digital`. Google Analytics boleh dimatikan.
2. **Project settings → General → Your apps → `</>` Web** → daftar app → salin objek `firebaseConfig`.

## 2. Authentication
**Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
**Users → Add user** → masukkan emel + kata laluan admin anda (kata laluan kuat, jangan tulis dalam kod).

## 3. Firestore
**Build → Firestore Database → Create database** → pilih lokasi (cth. `asia-southeast1`) → mula dalam mod *production* (rules akan diganti di langkah 7).

## 4. Storage (⚠️ kos)
**Build → Storage → Get started.** Nota kos: Google kini mewajibkan pelan **Blaze (bayar ikut guna)** untuk mengaktifkan Cloud Storage pada projek baharu. Ia ada kuota percuma, tetapi kad bayaran diperlukan dan kos boleh timbul jika melebihi kuota. Tiada apa diaktifkan automatik oleh kod ini. Sila semak harga semasa di halaman *Firebase Pricing* sebelum menaik taraf. Jika tidak mahu Blaze, Firestore + Authentication kekal percuma (Spark); thumbnail produk akan guna aset SVG lalai dalam `assets/thumbs/`. Anda boleh set Budget alert di Google Cloud Billing.

## 5. Masukkan konfigurasi ke dalam kod
Buka `bahagian GENIUS_CONFIG dalam index.html dan admin.html`, gantikan nilai `firebase: { ... }` dengan `firebaseConfig` anda. Config web Firebase bukan rahsia; keselamatan datang daripada Rules + Auth. Isi juga `contact` (emel, WhatsApp, media sosial) bila sedia. Kosong = dipaparkan "akan dikemas kini", bukan pautan.

Dalam Firebase Console → Authentication → **Settings → Authorized domains**, tambah domain hosting anda (`localhost` sudah ada).

## 6. Tetapkan admin (custom claim)
Admin ditentukan oleh claim `admin: true` pada token, yang hanya boleh ditetapkan melalui Admin SDK (bukan browser). Jadi pengguna tak boleh menjadikan diri sendiri admin.
1. Console → **Project settings → Service accounts → Generate new private key** → simpan fail JSON di komputer anda. **Jangan commit, jangan kongsi, jangan tampal dalam chat.** (Ia tidak diperlukan oleh website, hanya skrip ini.)
2. ```bash
   cd sites/genius-digital/scripts
   npm install firebase-admin
   export GOOGLE_APPLICATION_CREDENTIALS=/laluan/ke/serviceAccountKey.json
   node set-admin.js emel-admin@anda.com
   ```
3. Admin **log keluar dan log masuk semula** supaya token baharu diterima. Untuk buang akses: tambah `--remove`.

## 7. Terbitkan Security Rules
Cara CLI (disyorkan):
```bash
npm i -g firebase-tools && firebase login
cd sites/genius-digital
firebase use --add            # pilih projek anda
firebase deploy --only firestore:rules,storage
```
Atau salin-tampal: Console → Firestore → **Rules** (isi `firestore.rules`) dan Storage → **Rules** (isi `storage.rules`) → Publish.

Ringkasan: awam hanya boleh **membaca** produk `active`/`coming-soon` (produk `hidden` tidak boleh dibaca) dan melihat thumbnail. Hanya admin boleh tambah/ubah/padam; data disahkan (jenis, panjang, slug, status). Storage: imej JPG/PNG/WebP < 2 MB sahaja.

**`database.rules.json`**: fail berasingan untuk Realtime Database. Projek ini guna **Firestore**, jadi fail ini **tidak perlu diterbitkan**. Ia disediakan sebagai rules selamat (semua ditutup, kecuali contoh nod `publicProducts` yang boleh dibaca awam dan ditulis admin) jika anda guna RTDB kelak.

## 8. Data contoh (pilihan)
Log masuk admin → bila senarai kosong, tekan **"Muat produk contoh"**. ID dokumen = slug, jadi menekannya berulang kali tidak mencipta pendua.

## 9. Jalankan & hosting
- Setempat: `python3 -m http.server 8000` dalam folder ini (Firebase Auth perlu `http://localhost`, bukan `file://`).
- Firebase Hosting (Spark, percuma): `firebase init hosting` tidak perlu, `firebase.json` sudah ada → `firebase deploy --only hosting`.
- Atau GitHub Pages / Netlify / Cloudflare Pages: muat naik kandungan folder ini sahaja (tidak perlu `scripts/`, `*.rules`, `design-system/`).

## 10. Senarai ujian
| Ujian | Jangkaan |
|---|---|
| Buka `index.html` | Loading skeleton → kad produk dari Firestore |
| Log masuk dengan akaun BUKAN admin | Ditolak: "tiada akses admin" |
| Tambah produk (status Active) + thumbnail | Muncul di website serta-merta (real-time) |
| Tukar status ke Hidden | Hilang dari website; masih ada di admin |
| Edit nama/penerangan/susunan (butang naik/turun) | Website dikemas kini |
| Padam produk | Modal pengesahan → dokumen + fail Storage dipadam |
| Cuba tulis tanpa admin (Console Rules Playground) | Ditolak |
| Putuskan internet | Mesej ralat + butang "Cuba lagi" |

**Ujian peranti:** buka URL hosting/`http://IP-komputer:8000` pada iPhone (Safari), Android (Chrome), iPad/tablet, laptop dan desktop. Di desktop gunakan DevTools → Toggle device toolbar pada 320, 375, 390, 430, 768, 1024, 1366, 1920px. Semak: tiada scroll mendatar, hamburger di mobile, butang mudah disentuh, admin drawer + kad pada telefon.

## Struktur data produk
`products/{id}`: `name, slug, category, description, thumbnailURL, thumbnailPath, status (active|coming-soon|hidden), productURL, displayOrder, createdAt, updatedAt`. `thumbnailPath` (tambahan) ialah laluan fail dalam Storage supaya fail lama boleh dipadam bila diganti/dipadam produk.

## Halaman produk masa depan
Setiap kad ada `data-slug`. Buat masa ini butang "Explore Product" membuka modal *Product Coming Soon.* (tiada URL direka). Bila halaman produk sedia: set `productPagesEnabled: true` dalam `bahagian GENIUS_CONFIG dalam index.html dan admin.html` dan isi `productURL` pada produk berstatus Active.

## Had yang diketahui
- Keunikan slug disemak di klien sahaja (Firestore Rules tidak boleh menyemak dokumen lain).
- Thumbnail dalam Storage boleh dibaca sesiapa yang tahu URL penuh, walaupun produk Hidden.
- Versi Firebase SDK dikunci pada `11.10.0` (modular, CDN `gstatic`). Kemas kini dengan menukar pemalar `FIREBASE_VER` dalam kedua-dua fail.
- Kod Firebase tidak dapat diuji terhadap projek sebenar dalam sesi ini (tiada kelayakan); mod demo dan UI telah diuji dalam pelayar.
