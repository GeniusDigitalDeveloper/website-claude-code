---
name: website-builder
description: "Aliran kerja utama repo ini — tukar prompt ringkas jadi website premium (landing page, website bisnes, portfolio, SaaS, kedai) dengan animasi profesional, glassmorphism, gradient dan layout yang kemas. Gabungkan skill ui-ux-pro-max (design system) dan 21st-ui (komponen 21st.dev). Guna setiap kali pengguna minta bina, reka, ubah atau baiki website, landing page, hero section atau mana-mana halaman web."
argument-hint: "[nama bisnes / jenis website / gaya]"
---

# Website Builder — Prompt → Website Premium

Ini aliran kerja yang ditunjuk dalam video TikTok @ai.with.andrew: Claude Code terima prompt biasa, guna **UI UX Pro Max** untuk keputusan design dan **21st.dev** untuk komponen siap, kemudian tambah animasi, glassmorphism, gradient dan layout yang polished.

Ikut langkah 1 → 8 mengikut turutan. Jangan langkau langkah 2 (design system) dan langkah 7 (QA).

## 1. Brief — fahamkan permintaan

Ekstrak daripada prompt pengguna (jangan tanya semula apa yang dah jelas):

| Perkara | Contoh | Default jika tiada |
|---|---|---|
| Nama & jenis bisnes | "Kopi Santai, kafe" | Tanya — ini wajib |
| Matlamat / CTA utama | WhatsApp order, daftar, beli | "Hubungi kami" (WhatsApp) |
| Audiens | Pelajar, korporat, ibu muda | Umum Malaysia |
| Bahasa kandungan | BM / EN / rojak | Bahasa Melayu |
| Gaya | glassmorphism, dark, minimal, mewah | Ikut cadangan design system |
| Stack | Next.js atau HTML tunggal | Next.js (lihat CLAUDE.md) |

Jika nama/jenis bisnes tiada, tanya **satu soalan** sahaja yang gabungkan semua yang kurang. Selain itu, buat andaian munasabah dan nyatakan andaian itu dalam ringkasan akhir.

Slug projek = nama bisnes dalam kebab-case, cth `kopi-santai`. Semua fail website ini masuk `sites/<slug>/`.

## 2. Design system (WAJIB) — skill `ui-ux-pro-max`

Jalankan dari root repo:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<jenis produk> <industri> <2-3 kata gaya>" \
  --design-system --persist -p "<Nama Projek>" --output-dir sites/<slug> \
  --variance 7 --motion 7 --density 3
```

- Query dalam **Bahasa Inggeris** (pangkalan data dalam BI), cth `"coffee cafe cozy modern"`, `"AI SaaS startup glassmorphism"`.
- Dial yang sesuai untuk gaya video (premium, banyak animasi): `--variance 6-8 --motion 6-8 --density 3`. Untuk bisnes formal (bank, guaman, klinik) turunkan `--motion` ke 3-4.
- Hasilnya: `sites/<slug>/design-system/<project-slug>/MASTER.md`. Baca fail ini — ia sumber kebenaran untuk warna, font, pattern seksyen, kesan dan anti-pattern.
- Jika MASTER.md dah wujud, baca dan guna; jangan `--force` tanpa izin pengguna.
- Carian tambahan bila perlu: `--domain style "glassmorphism dark"`, `--domain landing "hero social-proof"`, `--domain gsap "scroll reveal stagger"`, `--stack nextjs "..."` atau `--stack html-tailwind "..."`.

Jika design system cadangkan sesuatu yang bercanggah dengan permintaan jelas pengguna (cth pengguna minta dark mode), **ikut pengguna**, kekalkan yang lain.

## 3. Scaffold projek

**Stack default — Next.js + Tailwind + shadcn/ui + Motion** (serasi terus dengan komponen 21st.dev):

```bash
cd sites
npx create-next-app@latest <slug> --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
cd <slug>
npx shadcn@latest init -d
npm i motion lucide-react clsx tailwind-merge
```

Jika folder `sites/<slug>/design-system/` dah dicipta di langkah 2 dan `create-next-app` enggan tulis ke folder tak kosong, pindahkan `design-system/` keluar sementara, scaffold, kemudian pindahkan semula.

**Stack pantas — satu fail HTML** (bila pengguna minta "simple", "satu fail", "GitHub Pages", atau tiada Node): `sites/<slug>/index.html` dengan Tailwind (CDN `cdn.tailwindcss.com`), GSAP + ScrollTrigger dari cdnjs, Google Fonts dari design system. Komponen 21st.dev (React) perlu diterjemah ke HTML + Tailwind biasa.

Masukkan token warna MASTER.md sebagai CSS variables dalam `globals.css` (`:root` + `.dark`) dan font melalui `next/font/google`. Jangan tulis hex mentah dalam komponen.

## 4. Komponen — skill `21st-ui` (21st.dev MCP)

Untuk setiap seksyen dalam pattern design system (Navbar, Hero, Features/Bento, Social proof/Logo marquee, Testimonials, Pricing, FAQ, CTA, Footer):

1. `search` di 21st MCP dengan query pendek BI: `"animated hero gradient"`, `"glass navbar"`, `"bento grid features"`, `"pricing cards"`, `"testimonial marquee"`.
2. Pilih yang paling sesuai dengan design system. Kalau tak jelas, tunjuk 2-3 calon kepada pengguna.
3. `get_component` → pasang mengikut arahan hasilnya (biasanya `npx shadcn@latest add "<url registry>"`) atau tulis fail yang dipulangkan ke `src/components/`.
4. **Adaptasi**: tukar warna ke token design system, tukar teks ke kandungan bisnes sebenar, buang demo yang tak berkaitan.
5. `search_logo` untuk logo jenama (cth logo pembayaran, partner) — satu jenama setiap panggilan.

Had pelan percuma: carian tanpa had, **2 pemasangan komponen sehari**. Guna kuota untuk seksyen yang paling memberi kesan (biasanya Hero dan Features), bina seksyen lain sendiri menggunakan resipi di `references/effects.md`.

Jangan panggil `generate` (guna kredit AI berbayar) kecuali pengguna minta dan `get_usage.aiGenerationEnabled` = true.

**Jika 21st MCP tidak tersedia** (tiada `API_KEY_21ST`, atau tool `mcp__21st__*` tiada): beritahu pengguna sekali dalam satu baris, kemudian teruskan dengan resipi `references/effects.md` + shadcn/ui. Jangan berhenti.

## 5. Lapisan "wow" — animasi, glassmorphism, gradient

Baca `references/effects.md` dan gunakan secara berhemah — **3 hingga 5 kesan utama** setiap halaman, bukan semua:

- Latar hero: aurora/mesh gradient beranimasi atau grid + spotlight
- Teks: headline gradient, reveal perkataan demi perkataan
- Kad: glass card (`backdrop-blur` + border separa telus) dengan hover lift
- Scroll: fade-up + stagger untuk setiap seksyen, logo marquee
- CTA: butang dengan shine/border beam

Peraturan wajib:
- Animasikan `transform` dan `opacity` sahaja.
- Hormati `prefers-reduced-motion` (Motion: `useReducedMotion`; CSS: `@media (prefers-reduced-motion: reduce)`).
- Glass mesti ada kontras teks ≥ 4.5:1 — letak lapisan latar yang cukup gelap/terang di belakang teks.
- Ikon SVG (lucide-react), jangan emoji sebagai ikon.

## 6. Kandungan

- Tulis copy sebenar untuk bisnes itu (bukan lorem ipsum), dalam bahasa yang diminta. Headline ≤ 8 patah perkataan, subheadline 1-2 ayat.
- CTA WhatsApp: `https://wa.me/60XXXXXXXXX?text=...` (minta nombor; guna placeholder jelas jika tiada).
- Gambar: guna gambar daripada pengguna jika ada; jika tiada, guna gradient/ilustrasi SVG atau placeholder Unsplash dengan `next/image`, dan beritahu pengguna untuk tukar.
- Metadata SEO: `title`, `description`, Open Graph, `lang="ms"` jika BM.

## 7. QA (WAJIB sebelum serah)

```bash
cd sites/<slug>
npm run build            # mesti lulus tanpa ralat
npm run start -- -p 3000 &   # atau npm run dev
node ../../.claude/skills/website-builder/scripts/screenshot.mjs http://localhost:3000 ../../.qa/<slug>
```

Skrip itu ambil tangkapan skrin penuh pada 375px, 768px, 1440px dan semak scroll mendatar. **Lihat sendiri tangkapan skrin** (Read imej) dan betulkan apa yang rosak. Kemudian semak senarai:

- [ ] Tiada scroll mendatar pada 375px
- [ ] Kontras teks ≥ 4.5:1 (terutama atas glass/gradient)
- [ ] Semua butang/link ada `cursor-pointer`, hover dan focus state yang nampak
- [ ] `prefers-reduced-motion` dihormati
- [ ] Tiada emoji sebagai ikon; ikon butang-ikon ada `aria-label`
- [ ] Gambar ada `alt`, saiz ditetapkan (tiada layout shift)
- [ ] Anti-pattern dalam MASTER.md tidak dilanggar

Untuk satu fail HTML: buka terus `file://.../index.html` dengan skrip yang sama.

## 8. Serah & deploy

Ringkasan kepada pengguna (BM): apa yang dibina, design system yang dipilih (gaya, warna, font), komponen 21st.dev yang digunakan, andaian yang dibuat, dan apa yang pengguna perlu tukar (nombor WhatsApp, gambar sebenar).

Deploy:
- **Vercel** (Next.js): import repo di vercel.com, set *Root Directory* = `sites/<slug>`.
- **GitHub Pages** (HTML tunggal): aktifkan Pages pada branch, folder `sites/<slug>`.

Commit dan push ke branch kerja semasa. Jangan buat PR melainkan diminta.
