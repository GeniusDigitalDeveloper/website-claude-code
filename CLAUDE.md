# CLAUDE.md — Otak Repo `website-claude-code`

Repo ini ialah kilang website. Tugas utama: tukar prompt ringkas pengguna jadi website premium dengan animasi profesional, glassmorphism, gradient dan layout yang polished, menggunakan **UI UX Pro Max** (keputusan design) dan **21st.dev** (komponen siap).

Asal aliran kerja: video TikTok @ai.with.andrew — "Claude Code turns basic prompts into stunning website builds with UI UX Pro Max and 21st.dev".

## Bahasa

- Berbual dengan pengguna dalam **Bahasa Melayu** (santai, ringkas). Istilah teknikal boleh kekal dalam BI.
- Kandungan website ikut bahasa yang pengguna minta; default Bahasa Melayu.
- Query ke `search.py` dan 21st.dev dalam Bahasa Inggeris (pangkalan data mereka dalam BI).

## Skill dalam repo ini

| Skill | Fungsi | Bila |
|---|---|---|
| `website-builder` | Aliran kerja penuh prompt → website (8 langkah) | **Setiap** permintaan bina/ubah website — mula di sini |
| `ui-ux-pro-max` | Design system: 79 gaya, 192 palet, 74 pasangan font, 119 garis panduan UX, preset GSAP, 22 stack | Langkah 2 (design system) dan semakan UX |
| `21st-ui` | Cari, ambil dan pasang komponen React/Tailwind dari 21st.dev melalui MCP | Langkah 4 (komponen) |

Sumber: `ui-ux-pro-max` daripada github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT), `21st-ui` daripada github.com/21st-dev/magic-mcp (ISC). Lesen ada dalam folder skill masing-masing.

## Peraturan wajib

1. **Design system dulu.** Setiap website baru mesti ada `sites/<slug>/design-system/<project-slug>/MASTER.md` sebelum tulis UI. Baca MASTER.md sebelum ubah website sedia ada.
2. **Komponen 21st.dev dulu, tulis sendiri kemudian.** Cari di 21st.dev untuk seksyen utama; jika tiada kunci API atau kuota habis, guna resipi `.claude/skills/website-builder/references/effects.md`.
3. **3-5 kesan "wow" setiap halaman**, bukan semua. Animasikan `transform`/`opacity` sahaja. Hormati `prefers-reduced-motion`.
4. **Kontras teks ≥ 4.5:1**, terutama atas glass dan gradient.
5. **Ikon SVG** (lucide-react), bukan emoji. Butang ikon perlu `aria-label`.
6. **Responsif** pada 375 / 768 / 1440px, tiada scroll mendatar.
7. **Copy sebenar**, bukan lorem ipsum.
8. **QA sebelum serah:** `npm run build` lulus + tangkapan skrin dengan `.claude/skills/website-builder/scripts/screenshot.mjs`, dan lihat sendiri tangkapan skrin itu.
9. Jangan panggil `generate` 21st.dev (kredit berbayar) kecuali pengguna minta.

## Struktur repo

```
.claude/
  skills/
    website-builder/     # aliran kerja utama + resipi kesan + templat prompt + skrip QA
    ui-ux-pro-max/       # design intelligence (Python, tiada dependency)
    21st-ui/             # komponen 21st.dev
.mcp.json                # pelayan MCP 21st.dev (kunci dari env API_KEY_21ST)
docs/PANDUAN.md          # panduan pengguna (BM)
sites/<slug>/            # SATU folder untuk setiap website
  design-system/<project-slug>/MASTER.md
  ...projek Next.js atau index.html
.qa/                     # tangkapan skrin QA (diabaikan git)
```

## Stack

- **Default:** Next.js (App Router, TypeScript) + Tailwind CSS + shadcn/ui + Motion (`motion/react`) + lucide-react. Sebab: komponen 21st.dev ialah React/Tailwind/shadcn.
- **Pantas:** satu `index.html` + Tailwind CDN + GSAP (cdnjs) — bila pengguna minta simple / GitHub Pages / tiada Node.
- Setiap `sites/<slug>/` ialah projek berasingan dengan `package.json` sendiri. Jalankan arahan npm dari dalam folder itu.

## Arahan berguna

```bash
# Design system baru
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<produk> <industri> <gaya>" --design-system --persist -p "<Nama>" --output-dir sites/<slug>

# Carian khusus
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain style|color|typography|landing|ux|gsap|icons
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack nextjs|html-tailwind|shadcn

# QA
node .claude/skills/website-builder/scripts/screenshot.mjs http://localhost:3000 .qa/<slug>
```

## Git

- Kerja di branch semasa; commit dengan mesej jelas; push bila siap.
- Jangan commit `node_modules/`, `.next/`, `.env*`, `.qa/`.
- Jangan buat PR melainkan pengguna minta.

<!-- claude-kit:mula (diurus oleh Video-Claude/scripts/sync-claude-skills.sh, edit di sana) -->
## Panggilan pengguna

Sentiasa panggil pengguna **"ustaz"** dalam setiap balasan, dalam setiap sesi.
## Gaya teks video (tetap)

Semua teks dalam video ustaz guna **Poppins Bold** dan warna **biru air cerah** sahaja (cadangan
`#4FC3F7`, lebih cerah/aqua pun boleh, kekalkan satu keluarga biru air). Ini termasuk kapsyen,
tajuk, teks bergerak dan teks latar yang watak cakap.

Pengecualian: teks **dalam infografik** (label, angka, carta) ikut gaya infografik sendiri.
Jika teks latar watak sedang bercakap, ia kekal Poppins Bold + biru air cerah.
Terpakai untuk HyperFrames, Remotion dan FFmpeg, dalam semua repo.
<!-- claude-kit:tamat -->

## Gaya video AI (@brandlogistics) — tambahan

Rujukan gaya video motion graphic yang dianalisis dari 9 video TikTok @brandlogistics:
`docs/analisis-gaya-video-brandlogistics.md`. Ia mengandungi bank teknik T1–T14, bila
sesuai dan bila jangan guna ikut jenis video ustaz, dan cara bina.

Bila ustaz taip **"VIDEO AI"**, "template video AI" atau `/video-ai`, guna skill
`.claude/skills/video-ai`: beri template 5 perkara, kemudian bina video dengan
HyperFrames ikut dokumen itu.

Ini tambahan sahaja. Jangan ubah skill, framework atau tools yang sedia ada dalam repo
ini kerananya, kecuali ustaz minta.

## Flash Link — deploy automatik (arahan tetap ustaz)

Bila kerja `sites/flash-link` siap, **terus deploy tanpa tanya dan tanpa tunggu ustaz sebut "deploy"**.
Urutan: sahkan rules hidup sama dengan backup dahulu → deploy rules (hanya tambah, kunci/koleksi `flashlink*`; backup ke `backup/`) → deploy `hosting:flashlink` ke site `genius-digital-flashlink-40bc9-5effc` (projek `genius-digital-40bc9`) → uji URL hidup → laporkan.
Masih WAJIB berhenti dan tanya jika rules hidup berbeza daripada backup, ada rule sedia ada yang bertembung, atau perubahan akan menyentuh app/site lain dalam projek yang sama. Jangan padam atau ubah rules/site app lain.
