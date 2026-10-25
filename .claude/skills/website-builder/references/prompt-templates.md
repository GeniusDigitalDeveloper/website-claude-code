# Templat Prompt

Salin, tukar bahagian `<...>`, dan tampal dalam Claude Code. Claude akan ikut skill `website-builder` secara automatik. Boleh juga mula dengan `/website-builder` diikuti brief.

---

## A. Landing page bisnes (paling biasa)

```
Bina landing page untuk <nama bisnes>, sebuah <jenis bisnes> di <lokasi>.
Audiens: <siapa pelanggan>.
CTA utama: <WhatsApp 60123456789 / daftar / beli>.
Gaya: premium, moden, glassmorphism dengan gradient dan animasi scroll yang halus.
Seksyen: hero, kelebihan, produk/servis, testimoni, harga, FAQ, CTA, footer.
Bahasa: Bahasa Melayu.
Guna UI UX Pro Max untuk design system dan 21st.dev untuk komponen.
```

## B. SaaS / produk AI (gaya video)

```
Bina website untuk <nama produk>, platform AI yang <apa ia buat>.
Gaya: dark mode, aurora gradient di hero, glass cards, bento grid untuk features,
headline gradient dengan animasi perkataan, kad pricing "Popular" dengan border beam.
Seksyen: navbar glass, hero + 2 CTA, logo marquee, features bento, cara ia berfungsi (3 langkah),
testimoni, pricing 3 pelan, FAQ, CTA akhir, footer.
Bahasa: English.
```

## C. Portfolio peribadi

```
Bina portfolio untuk <nama>, seorang <profesion>.
Gaya: minimal mewah, latar gelap, spotlight ikut kursor, tipografi besar, bento grid projek.
Seksyen: hero intro, projek terpilih (6), servis, pengalaman, testimoni, hubungi.
Bahasa: <BM/EN>.
```

## D. Kedai / F&B

```
Bina website untuk <nama kedai>, <jenis makanan/produk>.
Gaya: hangat dan selesa, gambar besar dengan overlay gradient, kad menu glass, butang WhatsApp order yang menonjol.
Seksyen: hero, menu popular, kenapa kami, testimoni marquee, lokasi & waktu operasi, CTA order.
Bahasa: Bahasa Melayu.
```

## E. Satu fail HTML (cepat, tanpa Node)

```
Bina landing page satu fail HTML untuk <nama bisnes> (<jenis>).
Guna Tailwind CDN dan GSAP untuk animasi scroll. Glassmorphism + gradient.
Saya nak host di GitHub Pages.
```

---

## Prompt susulan (lepas versi pertama siap)

- `Tukar gaya hero jadi lebih dramatik — aurora lebih terang dan headline lebih besar.`
- `Cari komponen pricing yang lebih cantik di 21st.dev dan ganti seksyen harga.`
- `Tambah seksyen <galeri / pasukan / statistik> dengan animasi kiraan nombor.`
- `Semak semula website ni guna checklist UI UX Pro Max dan baiki semua isu.`
- `Buat versi dark mode dan tambah butang tukar tema.`
- `Ambil screenshot mobile dan baiki apa yang tak kemas.`
- `Deploy ke Vercel — terangkan langkahnya.`

## Tips prompt yang baik

1. Sebut **nama dan jenis bisnes** — ini menentukan design system.
2. Sebut **satu CTA utama** — website yang fokus lebih tinggi conversion.
3. Sebut **3-4 kata gaya** (cth "premium, gelap, glassmorphism, animasi halus") — lebih banyak belum tentu lebih baik.
4. Beri **kandungan sebenar** jika ada (harga, menu, nombor telefon, testimoni) — elak placeholder.
5. Lampirkan gambar/logo jika ada; Claude akan guna dalam `public/`.
