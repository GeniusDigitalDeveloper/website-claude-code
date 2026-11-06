# CodeLab Developer — Genius Digital

Pusat alat pembangun web serba lengkap: **73 alat** yang berjalan sepenuhnya dalam pelayar (HTML5 + CSS3 + JavaScript
vanilla, tanpa framework, tanpa build step). BM (lalai) · English · العربية (RTL).

* Tanpa VPS, tanpa API berbayar, tanpa backend, tanpa langganan, tiada kunci API dalam frontend.
* Statistik footer disambung ke **Firestore projek GENIUS DIGITAL** (lihat `firebase/README.md`); jika Firebase tak dapat dicapai, UI papar “—”, bukan angka palsu.
* Panel Admin berasingan di `/admin/` (UI sahaja; tiada log masuk palsu).

## Jalankan

Ia perlu dihidangkan melalui HTTP (kerana `fetch` fail terjemahan dan modul ES):

```bash
cd sites/codelab-developer
python3 -m http.server 8080      # buka http://localhost:8080/
```

Hosting: mana-mana hosting statik (GitHub Pages, Netlify, Cloudflare Pages, dsb.). Letak folder ini sebagai akar tapak.
Laluan menggunakan hash (`#/tool/json-formatter`) jadi tiada konfigurasi pelayan diperlukan.

## Struktur

```
index.html                  panel awam (shell + CSP)
admin/                      PANEL ADMIN berasingan: index, login, dashboard, tools, statistics, users, settings, content (.html)
assets/                     logo, imej latar (hero-bg.webp), fon, vendor/ (Prettier, Terser, sql-formatter — lesen disertakan)
css/                        fonts, base (token), layout (header/sidebar/footer), components, admin
locales/ms.json en.json ar.json   kamus terjemahan (kunci rata, ~840 kunci setiap bahasa)
js/
  main.js, pages.js, registry.js, config.js
  i18n/i18n.js              loader kamus, localStorage, RTL, applyI18n
  components/               header, sidebar, search, footer (statistik), toast, ui-parts
  utils/                    dom (h()), icons (Lucide), io (salin/muat turun/ZIP), storage, highlight
  tools/                    formatter-/minifier-/css-/color-/converter-/utility-/generator-tools.js
  tools/lib/                ui.js (kerangka), formatters, minifiers, convert, color
  statistics/               kl-time.js (waktu Malaysia), provider.js, firebase-provider.js (placeholder), stats.js
  admin/                    auth.js (placeholder), data.js, shell.js, pages.js, charts.js
firebase/                   README, firestore.rules, firebase-config.example.js
tests/kl-time.test.mjs      ujian peraturan reset harian/bulanan
```

## Alat (73)

| Kategori | Bil. | Nota |
|---|---|---|
| Code Formatter | 7 | HTML/CSS/JS/Markdown guna **Prettier**, SQL guna **sql-formatter**, JSON asli, XML pencetak sendiri |
| Minifier | 5 | JS guna **Terser**; CSS/HTML/SVG/JSON pengurai sendiri; tunjuk saiz asal/akhir/% |
| CSS Generator | 12 | Penyunting visual + pratonton langsung + praset + pratonton telefon/tablet/desktop |
| Color & Design | 10 | Palet (simpan setempat), kontras WCAG, buta warna (Machado 2009), pemilih warna imej |
| Converter | 14 | JSON/CSV/XML, Base64, URL, entiti HTML, Unicode, binari/perpuluhan/heksa (BigInt) |
| Utility | 15 | UUID v4/v7, kata laluan (`crypto.getRandomValues`), regex (Worker + had masa), JWT (tanpa pengesahan tandatangan) |
| Generator | 10 | HTML boilerplate, CSS reset, meta, OG, favicon (ICO+PNG+ZIP), robots, sitemap, .htaccess, manifest, JSON-LD |

Tambah alat: (1) baris dalam `js/registry.js`, (2) eksport fungsi dengan id yang sama dalam modul `js/tools/*-tools.js`,
(3) tambah `tool.<id>.name` dalam tiga fail `locales/*.json`.

## Statistik footer (peraturan reset)

* Kunci hari `YYYY-MM-DD` dan bulan `YYYY-MM` dikira dalam **Asia/Kuala_Lumpur** (`js/statistics/kl-time.js`), bukan jam
  peranti → reset tepat 00:00 MYT; bulan baharu bermula 00:00 MYT hari pertama; jumlah keseluruhan terkumpul.
* UI menunjukkan kunci hari semasa dan kiraan detik ke reset sebenar. Angka dibaca dari Firestore (`FirebaseProvider`); jika gagal, jatuh kepada “—”. `localStorage` tidak dipakai untuk statistik global.
* Uji: `node tests/kl-time.test.mjs`.

## Keselamatan

* CSP ketat (`script-src 'self'`, tiada `eval`/`new Function` dalam kod sendiri; Worker hanya `blob:`).
* Semua teks dimasukkan sebagai text node/`textContent` (tiada `innerHTML` untuk input pengguna); penyerlah sintaks membina DOM.
* JSON-LD melepaskan `<` sebagai `<`; sitemap/XML dilepaskan; CSV boleh melindungi formula (`=`, `+`, `-`, `@`).
* Admin: tiada kata laluan keras, tiada login palsu, `noindex`. Keselamatan sebenar = Firebase Auth + custom claim + Security Rules.
* Header seperti `X-Frame-Options`/`frame-ancestors` perlu ditetapkan oleh hosting (tidak boleh melalui `<meta>`).

## Lesen pihak ketiga (dalam `assets/vendor` dan `assets/fonts`)

Prettier (MIT) · Terser (BSD-2) · sql-formatter (MIT) · Lucide icons (ISC, inline dalam `js/utils/icons.js`) ·
Plus Jakarta Sans, Noto Sans Arabic, JetBrains Mono (SIL OFL 1.1). Fail lesen berada di `assets/vendor/LICENSE-*.txt`.

## Batasan yang jujur

* Pengesah HTML ialah semakan struktur asas, bukan pengesah W3C. JWT Decoder tidak mengesahkan tandatangan.
* Admin ialah pratonton UI; suis “Enable/Disable tools” ialah draf setempat sehingga disambung ke Firestore.
* Tiada library pihak ketiga dimuat dari CDN semasa runtime (semuanya setempat).
