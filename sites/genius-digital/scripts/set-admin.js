#!/usr/bin/env node
/**
 * Tetapkan / buang custom claim `admin` pada akaun Firebase Authentication.
 * Dijalankan di KOMPUTER ANDA SAHAJA (bukan dalam website). Percuma di pelan Spark.
 *
 * Guna:
 *   npm install firebase-admin            (sekali sahaja, dalam folder scripts/)
 *   export GOOGLE_APPLICATION_CREDENTIALS=/laluan/ke/serviceAccountKey.json   (fail ini PRIVAT — jangan commit/kongsi)
 *   node scripts/set-admin.js emel@anda.com          # jadikan admin
 *   node scripts/set-admin.js emel@anda.com --remove # buang admin
 *
 * Selepas dijalankan, admin mesti LOG KELUAR dan LOG MASUK semula supaya token baharu diterima.
 */
const admin = require("firebase-admin");

const [email, flag] = process.argv.slice(2);
if (!email || email.startsWith("--")) {
  console.error("Guna: node scripts/set-admin.js <emel> [--remove]");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });

(async () => {
  const user = await admin.auth().getUserByEmail(email);
  const makeAdmin = flag !== "--remove";
  await admin.auth().setCustomUserClaims(user.uid, makeAdmin ? { admin: true } : { admin: null });
  console.log(`${makeAdmin ? "Admin DIBERI" : "Admin DIBUANG"}: ${email} (uid ${user.uid}). Minta pengguna log keluar & masuk semula.`);
  process.exit(0);
})().catch(err => { console.error("Gagal:", err.message); process.exit(1); });
