// Hubungkan SEMUA akaun Firebase Auth sedia ada ke organisasi sebagai admin.
// Guna: GOOGLE_APPLICATION_CREDENTIALS=/laluan/service-account.json \
//       node scripts/link-existing-admins.mjs <orgId> [ORG_ADMIN|DEVICE_MANAGER|VIEWER] [--dry]
// Service account kekal di mesin anda; JANGAN commit atau hantar dalam chat.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [orgId, role = 'ORG_ADMIN'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry');
if (!orgId || !['ORG_ADMIN', 'DEVICE_MANAGER', 'VIEWER'].includes(role)) {
  console.error('Guna: node scripts/link-existing-admins.mjs <orgId> [ORG_ADMIN|DEVICE_MANAGER|VIEWER] [--dry]');
  process.exit(1);
}
initializeApp({ credential: applicationDefault(), projectId: process.env.GCLOUD_PROJECT || 'my-devide-control' });
const auth = getAuth(); const db = getFirestore();
if (!(await db.doc(`organizations/${orgId}`).get()).exists) { console.error('orgId tidak wujud'); process.exit(1); }

let token, n = 0, skipped = 0;
do {
  const page = await auth.listUsers(1000, token);
  for (const u of page.users) {
    if (u.customClaims?.orgId && u.customClaims.orgId !== orgId) { skipped++; console.log('langkau (org lain):', u.email ?? u.uid); continue; }
    console.log(dry ? '[dry]' : 'hubung:', u.email ?? u.uid, '→', role, `(${u.providerData.map((p) => p.providerId).join(',') || 'anon'})`);
    if (!dry) {
      await auth.setCustomUserClaims(u.uid, { orgId, role: u.customClaims?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : role });
      await db.doc(`organizations/${orgId}/users/${u.uid}`).set({
        uid: u.uid, email: u.email ?? null, displayName: u.displayName ?? null,
        role: u.customClaims?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : role,
        provider: u.providerData[0]?.providerId ?? null, updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    n++;
  }
  token = page.pageToken;
} while (token);
console.log(`Selesai: ${n} akaun${dry ? ' (dry-run)' : ''}, ${skipped} dilangkau. Pengguna perlu log masuk semula.`);
