// Jadikan pengguna pertama admin (custom claim). Percuma (Admin SDK + Auth tidak perlukan Blaze). Jalankan sekali:
//   gcloud auth application-default login
//   cd tools && npm i firebase-admin && GOOGLE_CLOUD_PROJECT=genius-digital-40bc9 node set-admin.js email@domain.com
const admin = require("firebase-admin");
admin.initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
(async () => {
  const email = process.argv[2];
  if (!email) { console.error("Guna: node scripts/set-admin.js <email>"); process.exit(1); }
  const u = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(u.uid, { ...(u.customClaims || {}), admin: true });
  console.log(`OK: ${email} (${u.uid}) kini admin. Log keluar & masuk semula untuk refresh token.`);
})().catch(e => { console.error(e.message); process.exit(1); });
