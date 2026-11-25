# Sambungkan Firebase (kira-kira 15 minit)

1. Firebase console → projek baharu (cth. `lunara`). Aktifkan pelan **Blaze** (perlu untuk Cloud Functions & SMTP keluar).
2. **Authentication** → Sign-in method → aktifkan **Google** dan **Email/Password**. Tambah domain web anda di *Authorized domains*.
3. **Firestore** (mod production, rantau `asia-southeast1`) dan **Storage**.
4. Project settings → Your apps → **Web app** → salin config ke `apps/web/.env.local` (ikut `.env.example`).
5. Deploy backend:
   ```bash
   npm i -g firebase-tools && firebase login
   cd backend/firebase && firebase use --add <project-id>
   cd ../functions && npm install
   firebase functions:secrets:set SMTP_HOST   # cth. smtp.resend.com / smtp.gmail.com
   firebase functions:secrets:set SMTP_PORT   # 465
   firebase functions:secrets:set SMTP_USER
   firebase functions:secrets:set SMTP_PASS
   echo 'APP_URL=https://domain-anda' > .env.<project-id>
   echo 'MAIL_FROM="LUNARA MUSIC <no-reply@domain-anda>"' >> .env.<project-id>
   cd ../firebase && firebase deploy --only firestore,storage,functions
   ```
6. Templat e-mel Firebase lalai: Authentication → Templates → Password reset → *Customize action URL* = `https://domain-anda/reset-password` (fallback jika function tidak tersedia).
7. Lantik admin: `GOOGLE_APPLICATION_CREDENTIALS=sa.json npm run set-admin -- emel@anda.com`.
8. (Pilihan) **App Check** dengan reCAPTCHA Enterprise, kemudian tukar `enforceAppCheck: true` dalam functions.

Tanpa langkah ini app berjalan dalam **mod peranti** (semua ciri muzik berfungsi, data disimpan di peranti).
