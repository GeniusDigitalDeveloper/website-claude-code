# Malaysia Image Tools

Laman awam (`public/index.html`) + panel admin (`public/admin/index.html`), disambung ke projek Firebase **GENIUS DIGITAL** (`genius-digital-40bc9`), web app "Malaysia Image Tools".

- Config: `public/firebase-config.js`
- Firestore (koleksi berawalan `mit_`): `mit_settings`, `mit_tools`, `mit_feedback`, `mit_private`
- Realtime DB: `visits/*`, `stats/*`
- Admin login: Firebase Auth e-mel + kata laluan (ikon mata untuk tunjuk/sembunyi). Akaun mesti ada dokumen `admins/{uid}` atau e-mel pemilik.

## Deploy rules (projek DIKONGSI — `firestore.rules` mengandungi rules semua app)
Sebelum deploy, ambil rules semasa (`firebase_get_security_rules`) dan pastikan tiada blok app lain yang hilang.

```bash
firebase deploy --only firestore:rules,database --project genius-digital-40bc9
firebase deploy --only hosting --project genius-digital-40bc9
```
