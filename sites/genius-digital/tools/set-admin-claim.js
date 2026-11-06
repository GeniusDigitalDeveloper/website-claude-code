#!/usr/bin/env node
/* =====================================================================
   GENIUS DIGITAL — tetapkan / buang custom claim "admin"
   ---------------------------------------------------------------------
   Guna:
     node tools/set-admin-claim.js emel@anda.com            # jadikan admin
     node tools/set-admin-claim.js emel@anda.com --remove   # buang akses admin

   Prasyarat:
     npm install firebase-admin
     Kelayakan (credentials) pentadbir Google Cloud — pilih SATU:
       A) Google Cloud Shell (disyorkan, tiada fail kunci):
            export GOOGLE_CLOUD_PROJECT=ID-PROJEK-ANDA
       B) Fail service account pada komputer anda (JANGAN commit / kongsi):
            export GOOGLE_APPLICATION_CREDENTIALS=/laluan/ke/serviceAccount.json
            export GOOGLE_CLOUD_PROJECT=ID-PROJEK-ANDA

   Selepas menetapkan claim, pengguna mesti LOG KELUAR dan LOG MASUK semula
   (atau tunggu token disegarkan) supaya claim baharu berkuat kuasa.
   ===================================================================== */
const admin = require('firebase-admin');

const email = process.argv[2];
const remove = process.argv.includes('--remove');
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

if (!email || email.startsWith('--')) {
  console.error('Guna: node tools/set-admin-claim.js emel@anda.com [--remove]');
  process.exit(1);
}
if (!projectId) {
  console.error('Tetapkan GOOGLE_CLOUD_PROJECT kepada ID projek Firebase anda (bukan nama paparan).');
  process.exit(1);
}

admin.initializeApp({ projectId });

(async () => {
  const auth = admin.auth();
  const user = await auth.getUserByEmail(email);
  const claims = { ...(user.customClaims || {}) };

  if (remove) delete claims.admin; else claims.admin = true;           // boolean true — bukan string
  await auth.setCustomUserClaims(user.uid, claims);
  if (remove) await auth.revokeRefreshTokens(user.uid);                // paksa token lama tamat

  const after = (await auth.getUser(user.uid)).customClaims || {};
  console.log(`${remove ? 'Akses admin DIBUANG' : 'Akses admin DITETAPKAN'} untuk ${email} (uid: ${user.uid})`);
  console.log('Custom claims semasa:', JSON.stringify(after));
  console.log('Pengguna perlu log keluar dan log masuk semula.');
})().catch((err) => {
  console.error('Gagal:', err.message);
  process.exit(1);
});
