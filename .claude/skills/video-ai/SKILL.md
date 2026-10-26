---
name: video-ai
description: Beri template video AI (5 perkara) bila pengguna taip "VIDEO AI", "template video AI" atau /video-ai, kemudian bina video gaya motion graphic (ala @brandlogistics) dengan HyperFrames bila template diisi.
---

# Template video AI (HyperFrames)

Bila dipanggil, balas dengan template ini dalam satu code block supaya senang di-copy:

```
1. Klip / fail video :
2. Jenis video (tazkirah / infografik / nasyid / promosi / sirah / belakang tabir) :
3. Palet warna :
4. Tempoh (saat) :
5. CTA komen (kata kunci) :
```

Tambah satu baris pendek di bawahnya: kalau tak pasti, tulis "ikut cadangan" di
nombor 3, 4 atau 5. Untuk nombor 1 boleh beri fail yang dimuat naik, link Google
Drive, atau beberapa klip sekaligus.

## Rujukan wajib

Baca `docs/analisis-gaya-video-brandlogistics.md` (ada dalam setiap repo) sebelum
merancang. Teknik dirujuk dengan kod **T1–T14** dalam dokumen itu. Bahagian 5
("Peta guna") menentukan teknik dan masa ikut jenis video.

## Bila template dah diisi

1. **Semak 5 perkara.** Kalau ada yang kosong, tanya yang kosong sahaja. Untuk
   "ikut cadangan":
   - Palet: tazkirah/infografik = biru malam + emas, sirah = krim + hijau zamrud,
     promosi = putih + hijau, nasyid = ikut projek lagu dalam MUSIC-VIDEO.
   - Tempoh: 30–45s (tazkirah, promosi), 45–60s (sirah), 15–30s (potongan nasyid).
   - CTA: satu perkataan yang berkait dengan isi, contohnya DOA, DAFTAR atau NOTA.
2. **Semak klip.** Klip mesti rakaman ustaz sendiri atau ada izin. Kalau klip orang
   lain (podcast, ceramah orang lain), tanya dulu sama ada ada izin.
3. **Buat projek HyperFrames** dalam repo semasa, di folder
   `video-ai/<YYYY-MM-DD>-<slug>/`:
   ```
   npx --yes hyperframes@0.8.201 init hf --video <klip> --resolution portrait --model small --language ms --non-interactive
   ```
   Guna versi HyperFrames yang sama dengan projek sedia ada dalam MUSIC-VIDEO
   (sekarang 0.8.201). Jangan naik taraf atau ubah projek, skill dan tools sedia ada
   kecuali ustaz minta. (Projek nasyid pergi ke repo MUSIC-VIDEO sebagai folder baru,
   ikut struktur projek lagu yang sedia ada.)
   Selepas init, ikut `hf/CLAUDE.md` dan guna skill HyperFrames yang dipasang:
   `/hyperframes` (kontrak + aliran kerja), `/hyperframes-registry` (cari blok siap
   dulu sebelum bina sendiri), `/media-use` (transkrip, cutout untuk T5, sound effect,
   gred warna).
4. **Masa setiap perkataan.** Guna transkrip dari `init` (Whisper). Untuk Bahasa
   Melayu yang kurang tepat, guna `ctc_align.py` dalam repo MUSIC-VIDEO (adapter
   `zlm`). Simpan sebagai `words.json`.
5. **Pelan babak.** Tulis `scenes.json` (format dalam bahagian 6 dokumen analisis).
   Tunjuk kepada ustaz sebagai jadual ringkas (masa, babak, teknik, teks) dan
   **tunggu setuju** sebelum bina. Peraturan:
   - Visual pertama sebelum saat ke-2. Satu teknik "wow" (T5 atau objek besar) dalam
     3 saat pertama.
   - Tukar visual setiap 1.5–3s (tazkirah, infografik, promosi) atau 3–5s (sirah, nasyid).
   - Video bercakap: muka ustaz kembali setiap 3–5s, kira-kira 50/50 muka dan grafik.
   - Satu palet untuk satu video.
   - 3 saat terakhir: kad ringkasan (T7) + CTA "Komen <KATA>" (T13).
   - Sari kata kecil, hanya kata kunci diwarnakan (T6).
6. **Batasan agama.** Jangan visualkan Allah, nabi, malaikat atau sahabat; guna
   kaligrafi, cahaya abstrak atau teks. Ayat Al-Quran dan hadis dipapar tenang dan
   lengkap dengan terjemahan, tanpa gimik. Tiada bahasa kesat atau dakwaan duit.
   Label "EDITED WITH ..." / bingkai Raw vs Edited (T1) hanya untuk jenis
   "belakang tabir".
7. **Bina dan semak.** Bina komposisi, kemudian `npm run check` dan
   `npx hyperframes snapshot --at <saat-saat penting>`. Lihat snapshot sendiri dan
   baiki sebelum render. Fail audio/video besar jangan di-commit (ikut `.gitignore`).
8. **Render** 1080x1920 @ 30fps (`npm run render`), hantar fail MP4 kepada ustaz,
   dan commit sumber projek (bukan MP4) ke branch kerja.
9. Tanya sama ada nak terus post. Kalau ya, guna template "MCP" (skill `template-mcp`
   dalam repo Video-Claude): video ini di nombor 1, cadangkan caption (dengan CTA
   nombor 5) dan tajuk YouTube.
