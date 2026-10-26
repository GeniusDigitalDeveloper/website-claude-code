# Override: Laman Utama (index.html)

Fail ini mengatasi MASTER.md untuk laman utama. Sebab: pengguna minta tema **elegan, cerah, tidak gelap** dengan **animasi 3D**. Palet merah "Vibrant & Block-based" daripada MASTER.md tidak sesuai dengan permintaan itu, jadi gaya ditukar kepada *Luxury Minimal Light + 3D*. Pattern, dial gerakan dan senarai semak dalam MASTER.md masih terpakai.

## Gaya

- Cerah elegan: krim + pasir + satu aksen emas champagne. Tiada latar gelap (topbar dan footer juga cerah).
- 3D sebenar dengan CSS `preserve-3d` + vanilla JS (tiada library):
  1. Hero: pinggan 3D berketebalan (14 lapisan), condong 56°, berputar, bahan mengorbit dalam satah pinggan, ikut tetikus dan skrol.
  2. Karusel 3D "Pilihan Chef" (cincin `rotateY`, boleh seret).
  3. Kad tilt 3D dengan kilauan, reveal `rotateX` semasa skrol, parallax berlapis (Tentang).
- Kesan klik: riak + letupan bintang emas, imej terbang ke troli, toast slide dari kanan, drawer troli slide dari kanan, menu mudah alih slide dari kiri, modal masuk dari kanan dengan `rotateY`, invois "dicetak" dengan hujan bintang.

## Token warna

| Peranan | Hex | Variable |
|---|---|---|
| Latar | `#F7F4EF` | `--bg` |
| Latar 2 | `#EFE8DC` | `--bg-2` |
| Latar 3 | `#E5DAC6` | `--bg-3` |
| Kad | `#FFFDF9` | `--card` |
| Teks | `#1A1712` | `--ink` |
| Teks kedua | `#554C40` | `--ink-2` (7.7:1 atas latar) |
| Aksen | `#B8975A` | `--gold` (hiasan sahaja, bukan teks) |
| Aksen teks | `#7A5B22` | `--gold-deep` (5.7:1 atas latar) |
| WhatsApp | `#157A42` | `--wa` (putih atasnya 5.4:1) |

## Tipografi

- Tajuk: Cormorant Garamond 500–700
- Isi: DM Sans 300–700
- Label: huruf besar, `letter-spacing: .22em`, 12px

## Struktur

Header (topbar + nav + BM/EN + troli) → Hero 3D → Marquee → Kelebihan (3) → Karusel 3D → 10 Nasi → 20 Minuman → Tentang → Cara Tempah (3 langkah) → Galeri → Lokasi & CTA → Footer. Lapisan: drawer troli, checkout, invois, toast, butang WhatsApp terapung.
