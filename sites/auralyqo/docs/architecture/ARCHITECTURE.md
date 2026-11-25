# Seni bina AURALYQO

```
apps/web (Next.js 15, TS, Tailwind 4, Motion, zustand)  ← web, desktop, tablet, PWA mudah alih, /tv, /admin
  ├─ /api/catalog/*   proksi baca-sahaja (senarai putih) ke Deezer API, cache 10 min
  ├─ lib/audio-engine Web Audio: 2 deck <audio> → GainNode fade → GainNode master (kelantangan)
  ├─ lib/local-music  IndexedDB (fail import) + File System Access (folder, baca di tempat)
  ├─ lib/sync         Firestore users/{uid}/data/{library|settings|layout}, offline cache, LWW per kumpulan
  └─ store/*          zustand persist (localStorage/IndexedDB), dipulihkan selepas hydrate
backend/
  ├─ security-rules   firestore.rules, storage.rules
  ├─ functions        sendBrandedPasswordReset, cleanupDeletedUser, setUserSuspended
  ├─ database         indeks + skema
  └─ email-templates  pratonton e-mel reset
packages/design-tokens, packages/shared-types
apps/mobile (Flutter, belum), apps/tv & apps/admin (kini laluan dalam web)
```

## Enjin fade (wajib dalam brief §8)
- Fade = automasi `AudioParam.linearRampToValueAtTime` pada GainNode, bukan animasi visual.
- Kelantangan pengguna di node master, jadi fade tidak menyentuh/menghilangkannya.
- Setiap operasi ambil token; operasi baharu membatalkan yang lama → tiada fade bertindih, tekan main/jeda laju tidak meninggalkan gain separuh.
- Jeda: gain → 0 dalam N saat, kemudian `pause()` (diuji: elemen kekal main sehingga gain 0).
- Main/sambung: dari posisi sama, gain 0 → 1.
- Next/prev: fade out → tukar sumber → fade in.
- Crossfade: lagu seterusnya dimulakan pada deck kedua N saat sebelum tamat; tetapan berasingan.
- iOS mengabaikan `audio.volume`; Web Audio digunakan supaya fade berfungsi di Safari iOS.

## Layout boleh-edit
Layout = data dalam `store/layout.ts` (preset, susunan & gaya seksyen, aksen, saiz kad, kepadatan, radius, sidebar, panel kanan, gaya pemain). Diedit di `/studio` atau terus di Utama ("Edit layout"), eksport/import JSON, disegerak ke akaun.

## Migrasi bila data besar
Pecahkan `library.playlists` ke `users/{uid}/playlists/{id}` bila dokumen melebihi ~800 KB.
