# Malaysia Image Tools

Laman awam (`public/index.html`) + panel admin (`public/admin/index.html`), disambung ke projek Firebase **GENIUS DIGITAL** (`genius-digital-40bc9`), web app "Malaysia Image Tools".

- Config: `public/firebase-config.js`
- Firestore (koleksi berawalan `mit_`): `mit_settings`, `mit_tools`, `mit_feedback`, `mit_private`
- Realtime DB (skema kongsi projek): `apps/image-tools/visits/*`, `apps/image-tools/stats/*`
- PWA: `manifest.webmanifest`, `sw.js`, ikon dalam `icons/` (boleh dipasang ke skrin utama / desktop)
- Admin login: Firebase Auth e-mel + kata laluan (ikon mata untuk tunjuk/sembunyi). Akaun mesti ada dokumen `admins/{uid}` atau e-mel pemilik.

## Deploy rules (projek DIKONGSI — `firestore.rules` mengandungi rules semua app)
Sebelum deploy, WAJIB ambil rules semasa (app lain kerap mengemas kini fail yang sama) (`firebase_get_security_rules`) dan pastikan tiada blok app lain yang hilang.

```bash
firebase deploy --only firestore:rules,database --project genius-digital-40bc9
firebase deploy --only hosting   # site: malaysia-image-tools (https://malaysia-image-tools.web.app)
```

## Alat baharu (lencana NEW hijau sehingga 24 Dis 2026)
- `image-to-embed`: jana kod HTML/Markdown/BBCode/CSS/React (sepenuhnya di peranti).
- `image-to-link`: muat naik ke ImgBB. Isi `public/imgbb-config.js` (`window.MIT_IMGBB_KEY`) untuk mengaktifkan; selagi kosong alat ini disembunyikan.
- Tarikh tamat lencana: `NEW_UNTIL` dalam `public/js/tools-4.js`.
