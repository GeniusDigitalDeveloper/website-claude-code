// Pintu masuk statistik. Penyedia: Firebase (Firestore, projek GENIUS DIGITAL).
// Jika Firebase gagal dimuat/dicapai, UI jatuh kembali kepada "—" (tiada angka palsu).
import { NullProvider } from './provider.js';
import { FirebaseProvider } from './firebase-provider.js';
import { firebaseConfig } from '../../firebase/firebase-config.js';
import { dayKey, monthKey } from './kl-time.js';
import { store } from '../utils/storage.js';

export const provider = new FirebaseProvider(firebaseConfig);
const fallback = new NullProvider();

/** Catat lawatan sekali sehari bagi setiap pelayar (kunci hari Malaysia). Kiraan global kekal di Firestore. */
let visitP;
export function trackVisit() { return (visitP ||= doTrack()); }
async function doTrack() {
  const today = dayKey();
  if (store.get('lastVisitDay') === today) return false;
  try { await provider.recordVisit(); store.set('lastVisitDay', today); return true; } catch { return false; }
}

export async function loadSummary() {
  try { const s = await provider.getSummary(); return { connected: true, ...s }; }
  catch { return { connected: false, ...(await fallback.getSummary()) }; }
}

export { dayKey, monthKey };
