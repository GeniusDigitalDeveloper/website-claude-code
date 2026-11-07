# MASTER — Invoice Digital & Quotation (Genius Digital)

Design system ringkas untuk app. Ikut peraturan CLAUDE.md repo (kontras ≥ 4.5:1, ikon SVG, responsif 375/768/1440, `prefers-reduced-motion`).

## Gaya
- SaaS moden, **bright theme**: latar putih / `#f6f8fc`, kad putih, border `#e2e8f0`, bayang lembut, radius 16px.
- Gradient jenama: biru `#2563eb` → cyan `#06b6d4` → ungu `#7c3aed` (butang utama, hero, kad CTA, ikon ciri). Elak neon.
- Footer gelap `#0f172a` hanya sebagai kontras penutup; tema utama kekal cerah.

## Warna
| Token | Nilai | Guna |
|---|---|---|
| ink | `#0f172a` | teks utama |
| ink2 / mut | `#334155` / `#64748b` | teks sekunder |
| blue / cyan / purple | `#2563eb` / `#06b6d4` / `#7c3aed` | aksen & gradient |
| ok / warn / err | `#059669` / `#d97706` / `#dc2626` | status |

## Tipografi
Plus Jakarta Sans (400–800). H1 `clamp(1.5rem, 2.4vw, 1.9rem)`; hero `clamp(2rem, 4.4vw, 3.3rem)`.

## Komponen
Butang (primary gradient / ghost / accent / danger), kad, jadual (jadi kad bertindan pada < 760px), badge status, modal, toast, kad statistik, carta SVG ringan (bar + donut), sidebar (desktop) / drawer + bottom nav (mudah alih).

## Gerakan (3 kesan sahaja)
1. Hero banner condong lembut (`transform`), 2. ikon terapung (`transform`), 3. hover angkat kad ciri. Semua dimatikan oleh `prefers-reduced-motion`.

## Aset
Logo & banner dari bahan Genius Digital (`public/assets/img/`). PDF: 5 templat (classic, modern, minimal, corporate, elegant), A4, warna aksen boleh diubah.
