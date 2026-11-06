// Pengesahan Admin = Firebase Authentication (e-mel/kata laluan). TIADA kata laluan dalam kod.
// Pengawal di bawah hanya untuk UX; akses data sebenar dikawal oleh Firestore Security Rules (isAdmin()).
import { FirebaseAuthProvider } from './firebase-admin.js';

export const auth = new FirebaseAuthProvider();

/** @returns {Promise<{mode:'ok'|'anon'|'denied', user?:object}>} */
export async function guard() {
  const user = await auth.currentUser();
  if (!user) return { mode: 'anon' };
  return (await auth.isAdmin(user)) ? { mode: 'ok', user } : { mode: 'denied', user };
}
