# Laporan: Anatomi Website Perkhidmatan yang Padu & Gah

Skop: website syarikat/agensi/firma yang menawarkan beberapa perkhidmatan dan bergantung pada butang CTA untuk tukar pelawat jadi pelanggan (contoh jenis: agensi digital, firma guaman/akaun, klinik, kontraktor, konsultan, SaaS servis).

Nota: analisis ini berdasarkan corak biasa pada website perkhidmatan kelas atas, bukan audit satu URL tertentu. Bagi audit URL sebenar, bagi pautan dan saya semak.

---

## 1. Ringkasan eksekutif

Website perkhidmatan yang padu menjawab **5 soalan pelawat dalam 10 saat pertama**:

1. Awak ni siapa / buat apa?
2. Ini untuk saya ke?
3. Kenapa saya patut percaya awak?
4. Berapa kos / macam mana prosesnya?
5. Apa langkah seterusnya? (CTA)

Kegahan visual (animasi, glassmorphism, gradient) hanya **lapisan atas**. Yang menukar pelawat ialah: mesej jelas, bukti kepercayaan, dan laluan CTA yang tiada geseran.

---

## 2. Struktur halaman (urutan seksyen yang terbukti)

| # | Seksyen | Tujuan | Wajib? |
|---|---|---|---|
| 1 | **Navbar** (logo, 4-6 menu, CTA utama di kanan) | Navigasi + CTA sentiasa nampak (sticky) | Ya |
| 2 | **Hero** | Headline manfaat, sub-headline, 1 CTA utama + 1 CTA sekunder, visual/video | Ya |
| 3 | **Bar bukti pantas** (logo klien / "50+ projek" / ulasan bintang) | Kepercayaan segera sebelum scroll | Ya |
| 4 | **Masalah → penyelesaian** | Pelawat rasa "ini cakap pasal saya" | Sangat digalakkan |
| 5 | **Perkhidmatan** (3-6 kad) | Terangkan tawaran, setiap kad ada ikon, manfaat, CTA kecil | Ya |
| 6 | **Proses / Cara kerja** (3-5 langkah) | Kurangkan ketakutan "apa jadi lepas saya hubungi?" | Ya |
| 7 | **Portfolio / Kajian kes** (sebelum → selepas, angka) | Bukti hasil | Ya |
| 8 | **Testimoni** (nama, gambar, syarikat, hasil spesifik) | Bukti sosial | Ya |
| 9 | **Harga / pakej** (atau "bermula dari RM…") | Tapis pelawat tak sesuai, bina keyakinan | Digalakkan |
| 10 | **Tentang / pasukan** (muka sebenar, pengalaman, sijil) | Humanize + autoriti | Ya |
| 11 | **FAQ** (6-8 soalan) | Hapus bantahan, bantu SEO | Ya |
| 12 | **CTA penutup** (jalur penuh, kontras tinggi) | Tangkap yang scroll sampai bawah | Ya |
| 13 | **Footer** (hubungi, alamat, media sosial, pautan undang-undang) | Kredibiliti + navigasi | Ya |

Di luar halaman: butang **WhatsApp terapung** (kritikal untuk pasaran Malaysia) dan bar CTA melekat di mobile.

---

## 3. Anatomi CTA (bahagian paling penting)

### 3.1 Jenis CTA

| Jenis | Contoh teks | Letak |
|---|---|---|
| **Utama** (komitmen rendah-sederhana) | "Dapatkan Sebut Harga Percuma", "Tempah Konsultasi 15 Minit" | Navbar, hero, CTA penutup |
| **Sekunder** (komitmen sangat rendah) | "Lihat Portfolio", "Tengok Cara Kami Kerja" | Sebelah CTA utama hero |
| **Kontekstual** (per perkhidmatan) | "Tanya tentang Servis SEO" | Dalam setiap kad perkhidmatan |
| **Segera / chat** | "WhatsApp Kami" | Terapung, kekal sepanjang scroll |
| **Lead magnet** | "Muat turun Senarai Semak PDF" | Untuk pelawat belum bersedia beli |

### 3.2 Peraturan copy CTA

- **Kata kerja + manfaat**, bukan "Hantar" / "Klik di sini". Contoh: "Dapatkan Audit Percuma" lebih kuat daripada "Hantar".
- Kurangkan risiko dalam teks: "Percuma", "Tanpa komitmen", "Balas dalam 24 jam".
- **Satu CTA utama setiap skrin.** Banyak pilihan setara = tiada tindakan.
- CTA sama ayat merentasi halaman supaya konsisten.

### 3.3 Peraturan visual CTA

- Warna kontras tertinggi dalam halaman (satu warna aksen khas CTA sahaja).
- Saiz sentuh ≥ 44×44px, jarak jelas dari elemen lain.
- Kontras teks ≥ 4.5:1 (peraturan repo kita).
- Keadaan: hover, focus-visible (untuk papan kekunci), active, loading, disabled.
- Animasi halus sahaja (naik 2px / bayang bercahaya), guna `transform`/`opacity`.

### 3.4 Selepas klik

- Borang **pendek**: nama, telefon/emel, mesej. Setiap medan tambahan menurunkan penukaran.
- Halaman/mesej "Terima kasih" dengan langkah seterusnya ("Kami hubungi dalam 24 jam").
- Jejak penukaran (event analytics) pada setiap CTA.

---

## 4. Elemen kepercayaan (trust signals)

Pelanggan perkhidmatan beli **keyakinan**, bukan produk. Wajib ada sekurang-kurangnya 4:

1. Logo klien sebenar
2. Testimoni dengan nama + gambar + hasil angka ("Jualan naik 3x dalam 4 bulan")
3. Kajian kes terperinci (masalah → tindakan → hasil)
4. Angka kredibiliti ("12 tahun", "300+ klien")
5. Sijil / pengiktirafan / lesen / ahli persatuan
6. Muka dan nama pasukan sebenar
7. Jaminan (pulangan wang, SLA, tempoh siap)
8. Alamat fizikal, no. telefon, SSM/no. pendaftaran, dasar privasi

---

## 5. Elemen reka bentuk yang bagi rasa "gah"

Mengikut peraturan repo (3-5 kesan "wow" setiap halaman, bukan semua):

| Kesan | Fungsi sebenar | Kos prestasi |
|---|---|---|
| Hero dengan gradient mesh / aurora + teks besar | Kesan pertama premium | Rendah |
| Glassmorphism pada kad perkhidmatan | Kedalaman, rasa moden | Sederhana (hati-hati `backdrop-filter`) |
| Scroll-reveal (fade + naik) | Aliran bercerita | Rendah |
| Counter angka beranimasi | Tekankan bukti | Rendah |
| Marquee logo klien | Bukti sosial bergerak | Rendah |
| Hover lift + spotlight pada kad | Interaktif, panggil klik | Rendah |
| Tipografi: pasangan font heading + body yang kuat | 50% persepsi "premium" | Rendah |
| Ruang putih bernafas, grid konsisten | Kemewahan datang dari ruang | Tiada |

Ruang putih dan tipografi memberi kesan lebih besar daripada animasi. Animasi berlebihan = nampak murahan dan lambat.

---

## 6. Keperluan teknikal (yang pelawat tak nampak tapi rasa)

| Aspek | Sasaran |
|---|---|
| Kelajuan | LCP < 2.5s, CLS < 0.1, imej WebP/AVIF, font dimuat optimum |
| Responsif | 375 / 768 / 1440px, tiada scroll mendatar, mobile-first (majoriti trafik Malaysia dari telefon) |
| Kebolehcapaian | Kontras 4.5:1, focus ring, `aria-label` butang ikon, `prefers-reduced-motion`, alt text |
| SEO asas | Satu H1, meta title/description, schema (LocalBusiness / Service / FAQ), URL bersih, sitemap |
| Keselamatan | HTTPS, borang ada perlindungan spam (honeypot/captcha), dasar privasi |
| Analitik | GA4 + event pada CTA, borang, klik WhatsApp; Meta Pixel jika ada iklan |
| Ikon | SVG (lucide), bukan emoji |
| Kandungan | Copy sebenar, tiada lorem ipsum |

---

## 7. Kesilapan biasa yang menjatuhkan website perkhidmatan

1. Headline kabur ("Penyelesaian inovatif untuk anda") tanpa sebut apa yang dijual
2. CTA terlalu banyak atau semua sama warna, tiada hierarki
3. Tiada harga atau julat langsung, pelawat tak tahu mampu atau tidak
4. Testimoni tanpa nama/gambar, nampak palsu
5. Borang panjang
6. Tiada WhatsApp (kehilangan lead besar di Malaysia)
7. Animasi berat memperlahankan mobile
8. Teks atas gradient/glass kontras rendah
9. Senarai perkhidmatan tanpa manfaat (hanya ciri)
10. CTA penutup tiada, halaman tamat mati

---

## 8. Senarai semak sebelum serah (ringkas)

- [ ] Hero: headline manfaat + 1 CTA utama + 1 sekunder
- [ ] CTA ada dalam navbar, hero, setiap kad perkhidmatan, dan penutup
- [ ] WhatsApp terapung + bar CTA mobile
- [ ] Sekurang-kurangnya 4 elemen kepercayaan
- [ ] Seksyen proses + FAQ + harga/pakej
- [ ] 3-5 kesan "wow", `prefers-reduced-motion` dihormati
- [ ] Kontras ≥ 4.5:1, saiz sentuh ≥ 44px
- [ ] Borang ≤ 4 medan, mesej terima kasih jelas
- [ ] `npm run build` lulus, tangkapan skrin 375/768/1440 disemak
- [ ] Analitik pada semua CTA

---

## 9. Cadangan langkah seterusnya

1. Pilih jenis perkhidmatan (agensi, klinik, guaman, kontraktor, dll.) dan saya jana design system guna `ui-ux-pro-max`.
2. Cari komponen 21st.dev untuk hero, kad perkhidmatan, pricing, testimoni, FAQ dan CTA.
3. Bina template "website perkhidmatan" boleh guna semula di `sites/<slug>/` mengikut struktur seksyen di atas.
