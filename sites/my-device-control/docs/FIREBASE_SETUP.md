# Persediaan Firebase (projek `my-devide-control`)

Jalankan dari mesin anda (log masuk sebagai akaun yang memiliki projek):

```bash
npm i -g firebase-tools
firebase login
cd sites/my-device-control/firebase
firebase use my-devide-control
```

1. **Console → Authentication → Sign-in method**: aktifkan Email/Password (dan Google jika mahu). Penyedia lain boleh ditambah bila-bila masa.
2. **Console → Firestore Database**: Create database (lokasi pilihan anda, mod Production). **Realtime Database**: Create. **Storage**: aktifkan.
3. **Plan Blaze** diperlukan untuk Cloud Functions.
4. Tetapkan e-mel admin pertama: `cp functions/.env.example functions/.env` dan isi `BOOTSTRAP_ADMIN_EMAILS`.
5. Deploy rules, indeks dan functions:

```bash
(cd functions && npm install)
firebase deploy --only firestore:rules,firestore:indexes,database,storage
firebase deploy --only functions
```

6. **Web app**: Console → Project settings → Add app (Web) → salin config ke `web/.env.local` (lihat `web/.env.example`).
7. **Authentication → Settings → Authorized domains**: tambah domain Interactive Link anda.
8. **App Check**: daftar web app (reCAPTCHA v3), isi `NEXT_PUBLIC_APPCHECK_SITE_KEY`, kemudian tukar `enforceAppCheck` kepada `true` di `functions/src/index.ts` selepas disahkan berfungsi.
9. Log masuk di web dengan e-mel dalam `BOOTSTRAP_ADMIN_EMAILS` → skrin "Cipta organisasi".

## Hubungkan semua akaun Auth sedia ada
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/laluan/service-account.json   # kekal di mesin anda
cd firebase/functions && npm i && cd ..   # firebase-admin
node scripts/link-existing-admins.mjs <orgId> ORG_ADMIN --dry   # semak dahulu
node scripts/link-existing-admins.mjs <orgId> ORG_ADMIN
```
Akaun baharu (apa-apa penyedia): suruh mereka log masuk sekali, kemudian Users & Roles → Hubungkan akaun.

## Ujian
```bash
(cd functions && npm test)                 # logik command/peranan
(cd rules-test && npm i && npm test)       # rules Firestore pada emulator (perlu Java)
(cd rules-test && npm run test:rtdb)       # rules RTDB (perlu emulator Database dapat dimuat turun)
```
