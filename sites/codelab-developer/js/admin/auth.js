// ============================================================================
//  PLACEHOLDER PENGESAHAN ADMIN — BUKAN sistem log masuk.
//  Tiada kata laluan keras (hardcoded), tiada "login palsu". Selagi Firebase Authentication
//  belum disambungkan, panel admin hanya pratonton UI tanpa sebarang data sebenar.
//
//  KESELAMATAN SEBENAR (fasa akan datang) mesti berlaku di PELAYAN, bukan di fail ini:
//    1. Firebase Authentication (emel/kata laluan + MFA) untuk log masuk.
//    2. Peranan admin ditetapkan sebagai custom claim `admin: true` melalui Firebase Admin SDK
//       (Cloud Function / skrip pentadbir dipercayai) — bukan daripada klien.
//    3. Firestore Security Rules menyemak `request.auth.token.admin == true` bagi setiap
//       bacaan/tulisan data admin (lihat /firebase/firestore.rules).
//  Menyembunyikan butang atau mengalihkan URL di frontend BUKAN kawalan keselamatan.
// ============================================================================

export class NullAuth {
  get name() { return 'none'; }
  get connected() { return false; }
  async currentUser() { return null; }
  async isAdmin() { return false; }
  async signIn() { throw new Error('auth-not-connected'); }
  async signOut() { /* tiada sesi */ }
}

// Fasa akan datang:
// import { FirebaseAuthProvider } from './firebase-auth-provider.js';
// export const auth = new FirebaseAuthProvider(firebaseConfig);
export const auth = new NullAuth();

/**
 * Pengawal UX sahaja (bukan keselamatan). Pelayan/Security Rules yang menentukan akses sebenar.
 * @returns {Promise<{mode:'preview'|'ok'|'denied', user?:object}>}
 */
export async function guard() {
  if (!auth.connected) return { mode: 'preview' };
  const user = await auth.currentUser();
  if (!user || !(await auth.isAdmin(user))) { location.replace('login.html'); return { mode: 'denied' }; }
  return { mode: 'ok', user };
}
