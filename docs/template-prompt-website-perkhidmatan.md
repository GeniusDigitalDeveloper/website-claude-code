# Template Prompt: Website Perkhidmatan + CTA

Salin blok di bawah, ganti semua `[…]`, dan tampal ke Claude Code.

```
Guna skill website-builder. Bina website perkhidmatan profesional.

## Perniagaan
- Nama: [nama syarikat]
- Industri: [cth: agensi digital / klinik gigi / firma guaman / kontraktor]
- Lokasi: [bandar, negeri]
- Slug folder: sites/[slug]

## Sasaran pelawat
- Siapa: [cth: pemilik SME umur 30-50]
- Masalah utama mereka: [1-2 ayat]
- Tindakan yang saya nak mereka buat: [cth: WhatsApp / tempah konsultasi / minta sebut harga]

## Perkhidmatan (3-6)
1. [Nama servis] - [manfaat 1 ayat] - harga bermula [RMxxx / minta sebut harga]
2. [...]
3. [...]

## CTA
- CTA utama: "[cth: Dapatkan Sebut Harga Percuma]" -> [pautan WhatsApp wa.me/60xxxxxxxxx / borang]
- CTA sekunder: "[cth: Lihat Portfolio]"
- Letak CTA di: navbar, hero, setiap kad perkhidmatan, CTA penutup
- WhatsApp terapung + bar CTA melekat di mobile

## Seksyen (ikut urutan)
Navbar sticky, Hero, Bar bukti (logo klien / angka), Masalah->Penyelesaian, Perkhidmatan,
Proses [3-5] langkah, Portfolio/kajian kes, Testimoni, Harga/pakej, Tentang pasukan, FAQ (6-8),
CTA penutup, Footer.

## Bukti kepercayaan (guna data ini, jangan reka angka)
- Pengalaman: [cth: 10 tahun]
- Bilangan klien/projek: [cth: 200+]
- Testimoni: [nama, syarikat, petikan] (jika tiada, letak placeholder bertanda "GANTI")
- Sijil/lesen/SSM: [...]

## Gaya
- Rasa: [cth: premium, moden, dipercayai / mesra, cerah]
- Warna jenama: [hex atau "cadangkan"]
- Rujukan gaya: [URL, atau "biar ui-ux-pro-max cadangkan"]
- Kesan: glassmorphism, gradient hero, scroll-reveal, counter angka (3-5 kesan sahaja)

## Teknikal
- Stack: Next.js + Tailwind + shadcn + Motion + lucide-react (atau index.html jika saya minta pantas)
- Bahasa kandungan: Bahasa Melayu
- SEO: meta title/description, schema LocalBusiness + FAQ
- Borang: nama, telefon, mesej (maksimum 4 medan)

## Peraturan
- Design system dulu (MASTER.md) sebelum tulis UI
- Cari komponen 21st.dev dulu; jangan guna generate berbayar
- Kontras teks >= 4.5:1, ikon SVG bukan emoji, hormati prefers-reduced-motion
- Responsif 375/768/1440px, tiada scroll mendatar
- Copy sebenar, bukan lorem ipsum
- QA: npm run build lulus + screenshot dan semak sendiri
- Commit dan push bila siap
```

## Versi ringkas (bila malas isi semua)

```
Guna website-builder. Bina website perkhidmatan untuk [jenis bisnes] di [lokasi].
Perkhidmatan: [senarai]. CTA utama: "[teks CTA]" ke WhatsApp [no].
Gaya premium, gelap/cerah [pilih], glassmorphism + gradient. Bahasa Melayu.
Ikut urutan seksyen dalam docs/analisis-website-perkhidmatan-profesional.md.
```
