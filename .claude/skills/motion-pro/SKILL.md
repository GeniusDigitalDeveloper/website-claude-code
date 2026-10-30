---
name: motion-pro
description: Bina video gaya motion designer pro (kinetic text, glass UI, timeline app 3D, portfolio grid, orbit, kursor klik) bila pengguna taip "MOTION PRO", "gaya motion pro", /motion-pro, atau minta teks bergerak, glass UI, timeline atau grid portfolio yang smooth.
---

# Motion Pro (gaya motion designer)

Rujukan wajib: `docs/analisis-gaya-motion-portfolio.md` (ada dalam setiap repo). Teknik
dirujuk dengan kod **M1–M14**. Bahagian 3 (peraturan smooth) dan bahagian 4 (peta guna)
ditaati dalam setiap video.

## Senarai skill (ringkas)

| Kod | Skill | Inti |
|---|---|---|
| M1 | Latar mesh gradien | gumpalan kabur bergerak perlahan |
| M2 | Kinetic text | taip+kursor, line-mask, titik aksen, tajuk mengecil, kunci tajuk |
| M3 | Penyerlah bar | `scaleX` dari kiri di belakang kata kunci |
| M4 | Peralihan bulatan | `clip-path: circle` jadi bingkai avatar |
| M5 | Lencana terapung | pop spring, putar sedikit, apung |
| M6 | Pil bertindan | stagger 150–200ms, offset melintang berbeza |
| M7 | Kursor palsu + klik | laluan lengkung, cincin riak, butang tukar keadaan |
| M8 | Mockup timeline 3D | tetingkap condong → rata, pipeline menyala, bar memanjang, kamera tolak masuk |
| M9 | Glass UI | `backdrop-filter`, isian 35–55%, sempadan 1px, elemen dalam bergerak |
| M10 | Portfolio grid | kad menegak berlabel, condong 3D, pan melintang, paralaks |
| M11 | Motion blur / jejak | blur + translate, peralihan kabur |
| M12 | Orbit hub-satelit | `rotate(θ) translateX(r) rotate(-θ)` |
| M13 | Kunci CTA | butang pil + URL + kursor, tahan 1.5–2s |
| M14 | Sistem rekaan | palet terhad, satu font tebal, bayang lembut, easing konsisten |

## Bila dipanggil

Balas dengan template ini dalam satu code block:

```
1. Topik / mesej video :
2. Teknik nak guna (M2 teks, M8 timeline, M9 glass, M10 grid, M12 orbit, atau "ikut cadangan") :
3. Palet warna (atau "ikut cadangan") :
4. Orientasi & tempoh (9:16 / 16:9, saat) :
5. CTA :
```

Kalau "ikut cadangan": pilih teknik ikut peta guna (bahagian 4 dokumen), palet terhad 2 warna
aksen + hitam + putih, 9:16 untuk TikTok/Reels/Shorts, tempoh 20–35s.

## Bila template dah diisi

1. Tanya hanya medan yang kosong.
2. Tulis pelan babak (`scenes.json`: masa, babak, teknik M, teks) dan tunjuk kepada ustaz
   sebagai jadual ringkas. **Tunggu setuju** sebelum bina.
3. Bina dengan HyperFrames (ikut skill `video-ai` untuk init/versi) atau Remotion kalau dalam
   repo Video-Infografik. Jangan ubah projek, skill atau tools sedia ada kecuali ustaz minta.
4. Peraturan smooth (wajib): tiada easing linear; masuk `expo.out`/`back.out`, keluar `power2.in`
   lebih pantas; stagger 60–200ms; peralihan bertindih ~0.3s; tahan 0.4–0.8s selepas reveal;
   sentiasa ada gerakan halus semasa tahan; satu fokus setiap babak; setiap elemen ada masuk
   dan keluar; SFX ringan pada pop/peralihan.
5. Semak `snapshot` pada masa utama dan baiki sebelum render. Render 30fps.
6. Hantar MP4 kepada ustaz, commit sumber (bukan MP4). Tanya nak terus post: guna template "MCP".

## Batasan

- Rujukan gaya sahaja; jangan tiru nama, logo, muka atau teks pengajar asal.
- Batasan agama sama seperti skill `video-ai`: jangan visualkan Allah, nabi, malaikat, sahabat;
  Quran dan hadis dipapar tenang tanpa gimik; tiada dakwaan duit.
