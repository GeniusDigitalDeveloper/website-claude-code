# GENIUS DIGITAL — Corporate Digital Products & Systems Portal

**Digital Innovation. Intelligent Systems.**

Website rasmi syarikat + katalog produk digital + Admin Panel berasaskan Firebase.
HTML, CSS dan JavaScript biasa (tanpa framework, tanpa build step, tanpa VPS).

| Fail | Fungsi |
|---|---|
| `index.html` | Website awam: Home, About, Products (masa nyata dari Firestore), Contact, Footer |
| `admin.html` | Admin Panel **berasingan** (login Firebase Auth, dashboard, CRUD produk, upload thumbnail). Tiada pautan ke halaman ini dalam `index.html`; buka terus melalui `/admin.html` |
| `firestore.rules` | Security Rules Cloud Firestore (dipakai) |
| `database.rules.json` | Rules Realtime Database — pilihan, **tidak dipakai** oleh projek ini (lihat bahagian 10) |
| `firebase.json`, `firestore.indexes.json` | Konfigurasi Firebase CLI (Hosting, rules, emulator) |
| `preview.html` | Pratonton desktop + mobile (iframe). Tidak diterbitkan ke Hosting |
| `tools/set-admin-claim.js` | Skrip menetapkan / membuang akses admin |
| `test/rules.test.js` | 53 ujian automatik untuk Firestore Rules |

---

## 1. Cara paling pantas melihat hasilnya (tanpa Firebase)

Buka `preview.html` dalam pelayar (klik dua kali). Ia memaparkan website dalam bingkai desktop dan telefon, serta Admin Panel dalam **Demo Mode**.

Selagi `firebaseConfig` masih placeholder (`YOUR_...`):

- `index.html` berjalan dalam **Preview Mode** dan memaparkan 2 produk contoh.
- `admin.html` memaparkan skrin setup. Butang **Buka Demo Mode** (`admin.html?demo=1`) membuka Admin Panel dengan data dalam memori sahaja (hilang bila dimuat semula, tiada apa disimpan). Demo Mode **mati sepenuhnya** sebaik sahaja Firebase dikonfigurasi, jadi ia tidak boleh digunakan untuk memintas login.

---

## 2. Kos: hanya perkhidmatan percuma (Spark)

Projek ini **tidak menggunakan Firebase Storage**, jadi pelan **Spark (percuma)** mencukupi dan tiada kad bayaran diperlukan.

| Perkhidmatan | Pelan Spark (percuma) | Catatan |
|---|---|---|
| Authentication (Email/Password) | Ya | Percuma |
| Cloud Firestore | Ya, ada kuota harian percuma | Semua data produk **dan thumbnail** disimpan di sini. Website guna *real-time listener*; trafik rendah kekal dalam kuota |
| Hosting | Ya | Kuota percuma mencukupi untuk website korporat kecil |
| Cloud Storage | **Tidak digunakan** | Tidak perlu diaktifkan |

### Cara thumbnail disimpan (tanpa Storage)

- Semasa memilih imej, `admin.html` memotongnya ke nisbah 16:10, memampatkannya kepada JPEG kecil (640×400, **maksimum kira-kira 100 KB**) dan menyimpannya sebagai *data URL* dalam medan `thumbnailURL` dokumen produk di Firestore.
- Memadam produk memadam imejnya sekali. Tiada fail yatim, tiada pembersihan Storage.
- Had dokumen Firestore ialah 1 MiB; rules menetapkan `thumbnailURL` maksimum 150,000 aksara, jadi mustahil melebihi had itu.
- Kos: imej dibaca setiap kali halaman dimuatkan (sekitar 30 – 100 KB setiap produk). Untuk katalog beberapa puluh produk ini kekal jauh di bawah kuota percuma. Jika katalog menjadi sangat besar, pertimbangkan hosting imej luar dan simpan URL `https://` dalam `thumbnailURL` (rules membenarkannya).

---

## 3. Sediakan projek Firebase

1. Pergi ke <https://console.firebase.google.com> → **Add project**.
2. Nama projek: **Genius Digital**. Firebase menjana *Project ID* (contoh `genius-digital-ab12c`). Catat ID ini.
3. Google Analytics: boleh dimatikan.

### 3.1 Daftar Web App & dapatkan Firebase Configuration

1. Di halaman utama projek tekan ikon **Web `</>`**.
2. Nama app: `Genius Digital Web`. **Jangan** tandakan Firebase Hosting lagi (boleh kemudian).
3. Salin objek `firebaseConfig` yang dipaparkan. Ia boleh dilihat semula di **Project settings → General → Your apps → SDK setup and configuration**.

### 3.2 Masukkan konfigurasi ke dalam kod

Gantikan blok ini di **dua** fail: `index.html` dan `admin.html` (cari `firebaseConfig`):

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

> `storageBucket` tidak digunakan (tiada Firebase Storage). Anda boleh biarkan `YOUR_STORAGE_BUCKET` seperti sedia ada; Mod Preview akan berhenti hanya apabila `apiKey`, `authDomain`, `projectId` dan `appId` diisi.

> `apiKey` Firebase Web **bukan rahsia**. Ia sekadar pengenal projek. Keselamatan data ditentukan oleh Security Rules dan Authentication (bahagian 6 dan 7). Jangan sekali-kali meletakkan *service account key* atau kata laluan dalam fail HTML.

Versi SDK ditetapkan di satu tempat sahaja dalam setiap fail: `FIREBASE_SDK_VERSION = "12.12.0"` (SDK modular, dimuat dari `gstatic.com`). Kedua-dua fail mesti menggunakan versi yang sama.

### 3.3 Aktifkan Authentication

1. **Build → Authentication → Get started**.
2. **Sign-in method → Email/Password → Enable → Save**.
3. **Users → Add user**: masukkan email dan kata laluan admin anda (gunakan kata laluan kuat).
4. Syor keselamatan: **Settings → User actions** → matikan **Enable create (sign-up)** jika pilihan itu ada. Tiada pengguna awam perlu mendaftar. (Walaupun seseorang berjaya mendaftar, mereka bukan admin dan rules menolak semua tulisan mereka.)
5. **Settings → Authorized domains**: `localhost` sudah ada. Tambah domain website anda selepas deploy (contoh `genius-digital.web.app` sudah automatik; domain tersuai perlu ditambah).

### 3.4 Sediakan Cloud Firestore

1. **Build → Firestore Database → Create database**.
2. Edition: **Standard**; mod: **Production mode** (jangan pilih test mode). Lokasi sebaik-baiknya `asia-southeast1` (Singapura). Lokasi tidak boleh ditukar kemudian.
3. Terbitkan rules (bahagian 6).

### 3.5 Firebase Storage

**Tidak perlu.** Jangan aktifkan Storage. Thumbnail disimpan dalam Firestore (bahagian 2).

---

## 4. Tetapkan admin dengan selamat (Custom Claims)

Hanya akaun dengan custom claim `admin: true` dianggap admin. **Log masuk sahaja bukan bukti admin.** Claim hanya boleh ditetapkan menggunakan Firebase Admin SDK (server / Cloud Shell). Pengguna **tidak boleh** menetapkannya dari frontend, dan rules memeriksa `request.auth.token.admin == true` pada setiap tulisan.

### Kaedah disyorkan: Google Cloud Shell (tiada fail kunci)

1. Buka <https://shell.cloud.google.com> dengan akaun Google pemilik projek.
2. Jalankan:

```bash
mkdir gd-admin && cd gd-admin
npm init -y && npm install firebase-admin
# muat naik tools/set-admin-claim.js ke folder ini (menu ⋮ → Upload), kemudian:
export GOOGLE_CLOUD_PROJECT=ID-PROJEK-ANDA        # cth. genius-digital-ab12c
node set-admin-claim.js emel-admin@anda.com
```

3. Output yang betul: `Custom claims semasa: {"admin":true}`.
4. Log keluar dan log masuk semula dalam `admin.html` (token mesti disegarkan; Admin Panel memaksa penyegaran semasa log masuk).

Untuk membuang akses: `node set-admin-claim.js emel-admin@anda.com --remove`.

### Kaedah alternatif: fail service account pada komputer anda

Firebase Console → Project settings → **Service accounts → Generate new private key**. Simpan fail itu **di luar folder projek**, `export GOOGLE_APPLICATION_CREDENTIALS=/laluan/key.json`, kemudian jalankan skrip yang sama. **Jangan commit, emel atau hantar fail kunci ini kepada sesiapa** (termasuk AI). `.gitignore` sudah menghalang nama fail lazim, tetapi tanggungjawab menyimpannya tetap pada anda.

Jika anda log masuk dengan akaun bukan admin, Admin Panel memaparkan skrin **Akses Ditolak** berserta UID anda, supaya mudah menetapkan claim.

---

## 5. Struktur data Firestore

Koleksi `products`; **ID dokumen = slug** (unik dan tidak boleh diubah).

```js
{
  name: "QR Me Generator",
  slug: "qr-me-generator",            // sama dengan ID dokumen
  category: "Digital Tools",
  description: "…",
  thumbnailURL: "data:image/jpeg;base64,/9j/4AAQ…",   // imej kecil (≤ 100 KB) atau URL https:// atau ""
  status: "active" | "coming-soon" | "hidden",
  productURL: "",                      // kosong atau https:// sahaja
  displayOrder: 1,
  // Terjemahan (pilihan). Jika kosong, website memaparkan teks Bahasa Melayu di atas.
  nameEn: "", categoryEn: "", descriptionEn: "",          // Bahasa Inggeris (BI)
  nameAr: "", categoryAr: "", descriptionAr: "",          // Bahasa Arab (BA)
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

Data contoh (QR Me Generator, Malaysia PDF Tools) **tidak** dimasukkan secara automatik. Jika koleksi kosong, Admin Panel menawarkan butang **Masukkan produk contoh**. Ia menyemak setiap slug dahulu, jadi menekannya berulang kali tidak mencipta duplikasi.

Website awam hanya membaca `status in ['active','coming-soon']` (selari dengan rules) dan menyusun ikut `displayOrder` pada sisi klien, jadi **tiada composite index diperlukan**.

---

## 6. Terbitkan Security Rules

### Cara A: Firebase Console (salin & tampal)

| Rules | Tempat | Fail |
|---|---|---|
| Firestore | Build → Firestore Database → **Rules** → tampal → **Publish** | `firestore.rules` |

### Cara B: Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use --add                       # pilih projek Genius Digital
firebase deploy --only firestore:rules
```

`firebase.json` sengaja **tidak** menyenaraikan Realtime Database, jadi `database.rules.json` tidak diterbitkan.

### Ringkasan keselamatan

**Firestore**
- Awam: boleh baca produk `active` / `coming-soon`. Produk `hidden` dan semua koleksi lain ditolak.
- Admin (`admin == true` boolean): boleh baca semua dan tulis.
- Pengesahan tulisan: medan dibenarkan sahaja (`hasOnly`), jenis data, panjang, `status` sah, `slug == ID dokumen`, `productURL` kosong atau `https://`, `thumbnailURL` kosong / `https://` / data URL JPEG-PNG-WebP (maksimum 150,000 aksara; SVG dan `data:text/html` ditolak), `createdAt`/`updatedAt` mesti masa pelayan, `slug` dan `createdAt` tidak boleh diubah, tulis-ganti dokumen sedia ada ditolak.
- Tiada `allow read, write: if true`.

### Sahkan rules dengan ujian automatik (pilihan)

```bash
npm i --no-save firebase @firebase/rules-unit-testing firebase-tools   # perlukan Java
npx firebase emulators:exec --only firestore --project demo-genius "node test/rules.test.js"
```

53 ujian: akses awam, pengguna biasa, claim palsu (`admin: "true"` sebagai string), data tidak sah, thumbnail terlalu besar atau berjenis salah, medan terjemahan yang tidak sah, dan sebagainya.

---

## 7. Jalankan website

### Mod Preview (tiada Firebase)
Buka `index.html` / `preview.html` terus dalam pelayar.

### Dengan Firebase (setempat)
Modul ES dan Firebase Auth memerlukan `http://`, bukan `file://`:

```bash
cd genius-digital
python3 -m http.server 5000       # atau: npx serve   |   VS Code "Live Server"
```

Buka <http://localhost:5000> (website awam) dan <http://localhost:5000/admin.html> (Admin Panel, halaman berasingan tanpa pautan dari website awam).

### Uji tanpa menyentuh data sebenar (Emulator, pilihan)
`firebase emulators:start --only auth,firestore` kemudian buka `http://127.0.0.1:5000/admin.html?emulator=1`. Parameter ini hanya berfungsi pada `localhost` / `127.0.0.1`.

---

## 8. Sambung ke hosting

### Firebase Hosting (disyorkan, percuma pada Spark)

```bash
firebase init hosting     # jika belum: public directory = .   | single-page app = No
firebase deploy --only hosting
```

`firebase.json` sudah mengecualikan `README.md`, `*.rules`, `tools/`, `test/` dan `preview.html` daripada deploy, serta menetapkan header keselamatan asas dan `no-store` untuk `admin.html`.

Domain tersuai: Hosting → **Add custom domain**, kemudian tambah domain itu ke **Authentication → Settings → Authorized domains**.

### Hosting lain (Cloudflare Pages, Netlify, GitHub Pages, cPanel)
Muat naik `index.html` dan `admin.html` sahaja. Tambah domain ke Authorized domains. Tiada pelayan atau VPS diperlukan.

### Kukuhkan API key (disyorkan selepas deploy)
Google Cloud Console → APIs & Services → Credentials → pilih *Browser key* → **Application restrictions: Websites** → masukkan domain anda dan `localhost`.

---

## 9. Cara menguji

### Senarai semak fungsi

1. `index.html`: loading → 2 kad produk; QR Me Generator = **Available**, Malaysia PDF Tools = **Coming Soon**.
2. Klik **Explore Product** → modal **“Product Coming Soon.”** (tiada pautan luar).
3. `index.html` tidak mempunyai butang / pautan Admin Login (semak menu, footer dan menu mobile). `admin.html`: buka URL terus, log masuk akaun admin → Dashboard memaparkan statistik sebenar.
4. Log masuk akaun bukan admin → **Akses Ditolak**.
5. Products → **Add Product** → isi borang, muat naik imej → produk muncul di website **tanpa muat semula**.
6. Edit nama / penerangan / imej → website dikemas kini serta-merta; imej lama digantikan.
7. Tukar status ke **Hidden** → produk hilang dari website. Kembalikan ke Active → muncul semula.
8. Naik / turun susunan → susunan di website berubah.
9. Cari dan tapis ikut kategori / status.
10. Padam produk → dialog pengesahan → dokumen **dan** imej dipadam.
11. Tukar bahasa BM → BI → BA (halaman bertukar kepada RTL dalam BA) dan tukar mod cerah ↔ gelap pada website **dan** Admin Panel. Muat semula: pilihan kekal.
12. Matikan internet / letak config salah → website memaparkan **ralat + butang Cuba Lagi**. Kosongkan koleksi → **empty state**.

### Ujian peranti dan resolusi

| Peranti | Cara |
|---|---|
| **iPhone (Safari)** | Selepas deploy, buka URL Hosting. Untuk ujian sebelum deploy: komputer dan iPhone pada Wi-Fi sama, jalankan `python3 -m http.server 5000 --bind 0.0.0.0`, buka `http://IP-KOMPUTER:5000` (mod Preview berfungsi tanpa Firebase). Untuk log masuk Firebase pada URL IP, domain/IP itu mesti ditambah ke Authorized domains. Lebih mudah: uji selepas deploy. |
| **Android (Chrome)** | Sama seperti di atas. Atau `chrome://inspect` untuk remote debugging melalui USB. |
| **iPad / tablet Android** | Buka URL deploy. Uji potret dan landskap. |
| **Laptop / desktop / monitor besar** | Buka dalam pelayar; tarik tetingkap atau gunakan monitor besar. |
| **Pelayar desktop (emulasi)** | Chrome/Edge: `F12` → ikon peranti (Ctrl+Shift+M) → ukuran **320, 375, 390, 430, 768, 1024, 1366, 1920**. Safari: *Develop → Enter Responsive Design Mode*. |

Perkara untuk disemak pada setiap saiz: tiada skrol mendatar, menu hamburger berfungsi pada ≤ 899 px, kad produk 1 / 2 / 3 lajur (mobile / tablet / desktop), butang sekurang-kurangnya 44 px, modal boleh dibaca dan ditutup, Admin Panel: sidebar menjadi drawer, jadual menjadi kad pada < 1100 px, borang boleh digunakan dengan papan kekunci skrin.

---

## 10. Realtime Database (`database.rules.json`)

Projek ini menggunakan **Cloud Firestore**, bukan Realtime Database. `database.rules.json` ialah rules **berasingan** untuk kegunaan masa hadapan dan **tidak perlu diterbitkan**. Ia menetapkan: tiada akses lalai, `publicProducts` boleh dibaca awam, tulis hanya admin (claim yang sama) dengan pengesahan skema yang sama. Jika suatu hari anda mengaktifkan Realtime Database, tampal fail ini di **Build → Realtime Database → Rules**. Fail ini disahkan sebagai JSON yang sah tetapi **tidak diuji** pada emulator.

---

## 11. Bahasa (BM / BI / BA) dan mod cerah / gelap

Kedua-dua `index.html` dan `admin.html` menyokong tiga bahasa dan dua tema. Pilihan disimpan dalam `localStorage` (`gd-lang`, `gd-theme`) dan **dikongsi** antara website awam dan Admin Panel.

| Perkara | Perincian |
|---|---|
| Bahasa | **BM** Bahasa Melayu (lalai), **BI** English, **BA** العربية. Butang BM · BI · BA berada dalam menu (website) / sidebar dan skrin log masuk (admin) |
| Arah teks | BA menukar halaman kepada **RTL** (`dir="rtl"`) secara automatik: susun atur, ikon anak panah, sidebar dan jadual dicerminkan. Fon Arab ialah Cairo |
| Tema | Mod **cerah** ialah lalai. Butang bulan / matahari menukar kepada mod gelap. Tema tidak mengikut tetapan sistem peranti kecuali anda memilihnya sendiri |
| Jenama | “GENIUS DIGITAL” dan tagline “Digital Innovation. Intelligent Systems.” kekal dalam Bahasa Inggeris pada semua bahasa |
| Teks sistem | Semua teks antara muka berada dalam objek `I18N` (`ms`, `en`, `ar`) dalam skrip setiap fail. Untuk mengubah ayat, edit kunci yang sama pada ketiga-tiga bahasa |
| Teks produk | Nama, kategori dan penerangan produk ialah data, bukan teks sistem. Isi terjemahan di **Admin Panel → Produk → Tambah / Edit → Terjemahan produk (pilihan)**. Jika medan BI / BA dikosongkan, website memaparkan teks Bahasa Melayu |

Menambah bahasa keempat: tambah objek baharu dalam `I18N`, satu entri dalam `LANGS` (`dir`, `locale`) dan satu butang `data-lang` di kedua-dua fail.

---

## 12. Ubah suai

| Apa | Di mana |
|---|---|
| Email / WhatsApp / media sosial | `CONTACT` dalam skrip `index.html` (kosong = dipaparkan sebagai placeholder, bukan pautan) |
| Warna tema | Pembolehubah `:root` (mod cerah) dan `:root[data-theme="dark"]` (mod gelap) di bahagian atas `<style>` |
| Halaman produk sebenar (masa hadapan) | Cipta halaman produk, isi **Product URL** (`https://…`) dalam Admin Panel, kemudian tetapkan `ENABLE_PRODUCT_LINKS = true` dalam `index.html`. Butang akan membuka URL itu |
| Produk contoh Preview Mode | `PREVIEW_PRODUCTS` dalam `index.html` (hanya dipakai bila Firebase belum dikonfigurasi) |
| Thumbnail placeholder | Dijana oleh fungsi `placeholderThumbURL` (QR, PDF, generik) apabila produk belum ada imej atau imej gagal dimuat |

---

## 13. Penyelesaian masalah

| Gejala | Punca / penyelesaian |
|---|---|
| Website memaparkan “Preview Mode” | `firebaseConfig` masih placeholder |
| “Akses ke data ditolak” pada website | `firestore.rules` belum diterbitkan, atau produk semua `hidden` |
| Admin: “Akses Ditolak” | Claim `admin` belum ditetapkan, atau belum log keluar/masuk semula |
| Admin: “Email atau kata laluan tidak betul” | Akaun belum dicipta, atau Email/Password belum diaktifkan |
| Imej tidak boleh dipilih / disimpan | Fail mesti JPG, PNG atau WebP (maksimum 12 MB sebelum dimampatkan). Jika ralat `permission-denied`, semak `firestore.rules` telah diterbitkan dan akaun ialah admin |
| `auth/unauthorized-domain` | Tambah domain ke Authentication → Settings → Authorized domains |
| Query Firestore meminta index | Jangan tambah `orderBy` pada query awam (susunan dibuat pada klien) |
| Halaman kosong bila dibuka sebagai `file://` dengan Firebase | Guna pelayan HTTP (bahagian 7) |

---

© 2026 Genius Digital. All Rights Reserved.
