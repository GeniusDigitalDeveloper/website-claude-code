# MASTER — Genius Digital (design system)

> Dijana dengan `ui-ux-pro-max` (`--design-system`), kemudian **disesuaikan** ikut brief ustaz:
> korporat teknologi, terang (bukan dark mode), navy + electric blue + cyan. Fail ini menggantikan
> output asal (indigo/hijau "Vibrant & Block") yang tak sepadan dengan brief.

## Gaya
Modern SaaS corporate · glassmorphism sederhana · gradient elegan · bayang lembut · 3D halus.
Terang, bersih, formal, tegas.

## Warna (token CSS)
| Token | Nilai | Guna |
|---|---|---|
| `--navy` | `#0B1F4B` | Primary, heading, teks utama, latar footer/CTA |
| `--blue` | `#1553E8` | Secondary (electric blue), butang, pautan (kontras 6.3:1 atas putih) |
| `--cyan` | `#00C2E0` | Accent: hiasan, garis, ikon atas navy. **Bukan** teks atas putih |
| `--bg` | `#F4F7FC` | Latar halaman |
| `--surface` | `#FFFFFF` | Kad |
| `--text` | `#0B1F4B` / `--muted` `#41506B` | Teks (muted atas putih 7.9:1) |
| `--line` | `#DCE5F3` | Garis/border |
| `--ok` `#0E7A4F` · `--warn` `#8A5A00` · `--danger` `#B42318` | Status |

## Typography
- Hero: **Bebas Neue** (tegas, condensed, huruf besar)
- Heading: **Manrope** 700–800
- Body: **Inter** 400–600
- Fluid: `clamp()` untuk h1/h2; body 16px minimum (elak zoom iOS pada input).

## Layout & responsif (mobile-first)
- Breakpoint: 320 → 480 → 768 → 1024 → 1440. Tiada scroll mendatar.
- Grid produk: 1 lajur (mobile) → 2 (≥640px) → 3 (≥1024px).
- Sasaran sentuh ≥ 44px. Navigasi → hamburger < 860px. Admin: sidebar → drawer < 960px, jadual → kad.
- Thumbnail nisbah tetap 16:10 (`aspect-ratio`) + `object-fit: cover`.

## Kesan "wow" (4 sahaja, `transform`/`opacity`)
1. Hero: aurora gradient + grid halus + tindanan kad 3D terapung.
2. Kad produk: tilt 3D mengikut penunjuk (desktop sahaja) + hover lift.
3. Scroll-reveal (IntersectionObserver).
4. Garis cahaya gradient pada kad bila hover.
Semua dimatikan bawah `prefers-reduced-motion`.

## Peraturan
- Ikon SVG sahaja (gaya Lucide), tiada emoji.
- Kontras teks ≥ 4.5:1 (cyan tak pernah jadi warna teks atas latar cerah).
- `:focus-visible` jelas pada semua kawalan.
- Tiada lorem ipsum; kenalan = placeholder dalam `config.js`.

## Elak
Dark mode penuh · animasi berlebihan · template generik · gambar rosak · data kenalan rekaan.
