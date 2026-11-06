// Pintu masuk statistik. Menukar penyedia = ubah satu baris di sini.
import { NullProvider } from './provider.js';
import { dayKey, monthKey } from './kl-time.js';
import { store } from '../utils/storage.js';

// import { FirebaseProvider } from './firebase-provider.js';
// import { firebaseConfig } from '../../firebase/firebase-config.js';
export const provider = new NullProvider(); // → new FirebaseProvider(firebaseConfig)

/**
 * Catat lawatan sekali sehari bagi setiap pelayar (kunci hari Malaysia).
 * NOTA: ini hanya mengelak catatan berganda daripada pelayar yang sama; kiraan global
 * sebenar datang daripada pangkalan data kongsi, bukan localStorage.
 */
export async function trackVisit() {
  if (!provider.connected) return false;
  const today = dayKey();
  if (store.get('lastVisitDay') === today) return false;
  try { await provider.recordVisit(); store.set('lastVisitDay', today); return true; } catch { return false; }
}

export async function loadSummary() {
  try { return { connected: provider.connected, ...(await provider.getSummary()) }; }
  catch { return { connected: false, registeredUsers: null, today: null, month: null, total: null }; }
}

export { dayKey, monthKey };
