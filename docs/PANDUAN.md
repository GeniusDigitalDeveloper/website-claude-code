# Panduan: Hasilkan Website Premium dengan Claude Code

Panduan ini terangkan cara guna repo `website-claude-code` untuk hasilkan website seperti dalam video TikTok @ai.with.andrew: prompt biasa jadi website dengan animasi profesional, glassmorphism, gradient dan layout yang kemas.

## Apa yang ada dalam "otak" repo ni

| Bahagian | Fail | Fungsi |
|---|---|---|
| Otak utama | `CLAUDE.md` | Peraturan dan aliran kerja yang Claude baca setiap kali sesi bermula |
| Skill aliran kerja | `.claude/skills/website-builder/` | 8 langkah: brief → design system → scaffold → komponen 21st.dev → kesan wow → kandungan → QA → deploy |
| UI UX Pro Max | `.claude/skills/ui-ux-pro-max/` | Pangkalan data design: 79 gaya UI, 192 palet warna, 74 pasangan font, 119 garis panduan UX, preset animasi GSAP |
| 21st.dev | `.claude/skills/21st-ui/` + `.mcp.json` | Akses 10,000+ komponen React/Tailwind siap (hero, navbar, pricing, testimoni...) |
| Resipi kesan | `.claude/skills/website-builder/references/effects.md` | Kod siap: aurora gradient, glass card, word reveal, scroll reveal, marquee, border beam, bento grid |
| Templat prompt | `.claude/skills/website-builder/references/prompt-templates.md` | Prompt sedia salin untuk pelbagai jenis website |

## Langkah 1: Setup sekali sahaja

### a) Dapatkan kunci API 21st.dev (percuma)

1. Pergi ke **https://21st.dev/mcp** dan log masuk.
2. Jana API key.
3. Simpan kunci itu sebagai pemboleh ubah persekitaran bernama **`API_KEY_21ST`**:
   - **Claude Code di web/app (cloud):** buka menu environment di bar tajuk sesi → **Edit** → tambah di bahagian *Network secrets* / *API credentials* (atau *Environment variables*) dengan nama `API_KEY_21ST`. Sesi baru akan guna kunci itu.
   - **Claude Code di komputer sendiri:** `export API_KEY_21ST="kunci-anda"` dalam `~/.zshrc` atau `~/.bashrc`.

Jangan tampal kunci API dalam chat atau commit ke repo.

Pelan percuma 21st.dev: carian tanpa had, 2 pemasangan komponen sehari. Kalau tiada kunci, Claude tetap boleh bina website menggunakan resipi kesan dalam repo. Cuma pilihan komponen siap kurang.

### b) Benarkan pelayan MCP 21st

Bila buka repo ini kali pertama, Claude Code akan tanya sama ada mahu guna pelayan MCP `21st` daripada `.mcp.json`. Pilih **Yes / Approve**.

### c) Keperluan (komputer sendiri sahaja)

- Node.js 20+ dan npm
- Python 3 (untuk UI UX Pro Max, tiada pakej tambahan)
- Untuk QA tangkapan skrin: `npm i -g playwright && npx playwright install chromium`

Sesi cloud Claude Code dah ada semua ini.

## Langkah 2: Minta website

Buka sesi Claude Code dalam repo ini, kemudian taip prompt. Contoh:

```
Bina landing page untuk Kopi Santai, kafe di Kuantan.
CTA: order WhatsApp 60123456789.
Gaya: premium, hangat, glassmorphism dengan gradient dan animasi scroll.
Bahasa Melayu.
```

Atau mula dengan arahan skill: `/website-builder kafe Kopi Santai, gaya premium glassmorphism`.

Lebih banyak contoh: `.claude/skills/website-builder/references/prompt-templates.md`.

## Langkah 3: Apa yang Claude buat (automatik)

1. **Brief.** Faham bisnes, audiens, CTA dan gaya. Tanya hanya jika nama/jenis bisnes tiada.
2. **Design system.** Jalankan UI UX Pro Max untuk pilih gaya, warna, font, struktur seksyen dan perkara yang perlu dielak. Simpan di `sites/<slug>/design-system/.../MASTER.md`.
3. **Scaffold.** Cipta projek Next.js + Tailwind + shadcn/ui + Motion di `sites/<slug>/` (atau satu fail HTML jika diminta).
4. **Komponen 21st.dev.** Cari dan pasang komponen terbaik untuk hero, features, pricing dan lain-lain, kemudian sesuaikan dengan design system.
5. **Kesan wow.** Tambah 3-5 kesan: aurora gradient, glass card, headline gradient, reveal semasa scroll, marquee, border beam.
6. **Kandungan.** Copy sebenar dalam bahasa pilihan, SEO metadata.
7. **QA.** `npm run build`, tangkapan skrin di mobile/tablet/desktop, semak kontras, responsif dan aksesibiliti, kemudian baiki.
8. **Serah.** Ringkasan apa yang dibina dan apa yang perlu anda tukar (nombor, gambar).

## Langkah 4: Lihat dan ubah

- **Lihat secara lokal:** `cd sites/<slug> && npm install && npm run dev` → buka http://localhost:3000
- **Minta perubahan:** "Hero lebih dramatik", "Tukar pricing guna komponen 21st.dev lain", "Buat dark mode", "Ambil screenshot mobile dan baiki".

## Langkah 5: Deploy

**Vercel (disyorkan untuk Next.js):**
1. vercel.com → *Add New Project* → import repo `website-claude-code`.
2. *Root Directory* → `sites/<slug>`.
3. Deploy. Setiap push ke branch akan auto-deploy.

**GitHub Pages (satu fail HTML):**
Settings → Pages → pilih branch dan folder `sites/<slug>`.

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| Claude kata 21st.dev tidak tersedia | Semak `API_KEY_21ST` sudah ditetapkan dan pelayan `21st` diluluskan; mulakan sesi baru |
| "Old Magic API keys were reset" | Jana kunci baru di 21st.dev/mcp (kunci Magic lama tak berfungsi lagi) |
| Kuota komponen habis | Normal untuk pelan percuma (2 sehari). Claude akan guna resipi kesan dalam repo |
| `python3` tiada (Windows) | Guna `python` atau `py -3` |
| Glass nampak pudar | Glass perlu latar berwarna di belakang. Minta "tambah aurora gradient di belakang kad" |

## Kredit

- UI UX Pro Max — https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT)
- 21st.dev MCP & skill — https://github.com/21st-dev/magic-mcp (ISC)
- Idea aliran kerja — TikTok @ai.with.andrew
