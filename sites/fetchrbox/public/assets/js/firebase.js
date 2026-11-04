// Sambungan Firebase (projek fetchr-box-izzul). Kunci web Firebase memang awam; keselamatan dijaga oleh firestore.rules.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCZi-nFSqEE3vQ-WARpgf0ePuByEmLJjkM',
  authDomain: 'fetchr-box-izzul.firebaseapp.com',
  projectId: 'fetchr-box-izzul',
  storageBucket: 'fetchr-box-izzul.firebasestorage.app',
  messagingSenderId: '87434149496',
  appId: '1:87434149496:web:4c990197042a24c783378d',
};
// Hanya petunjuk UI. Kuasa sebenar menulis ditentukan oleh firestore.rules.
const ADMIN_EMAILS = ['izzulmedia01@gmail.com'];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const AUTH_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
let authMod, auth;
async function getAuthMod() {
  if (!authMod) { authMod = await import(AUTH_URL); auth = authMod.getAuth(app); }
  return authMod;
}

let defaultsCache;
export async function getDefaults() {
  if (!defaultsCache) defaultsCache = await (await fetch('assets/defaults.json')).json();
  return defaultsCache;
}

export const fb = {
  /** Tetapan tapak. Jika dokumen belum wujud, guna nilai lalai. */
  async getSite() {
    const d = await getDefaults();
    let remote = {};
    try { const snap = await getDoc(doc(db, 'site', 'config')); if (snap.exists()) remote = snap.data(); } catch { /* guna lalai */ }
    return { platforms: remote.platforms || d.platforms, faq: remote.faq || d.faq, settings: { ...d.settings, ...(remote.settings || {}) } };
  },
  async saveSite(part) { await setDoc(doc(db, 'site', 'config'), part, { merge: true }); },
  async getStats() {
    try { const s = await getDoc(doc(db, 'stats', 'summary')); return s.exists() ? s.data() : null; } catch { return null; }
  },
  isAdminHint: (email) => ADMIN_EMAILS.includes((email || '').toLowerCase()),
  async signIn() { const m = await getAuthMod(); return m.signInWithPopup(auth, new m.GoogleAuthProvider()); },
  async signInEmail(email, pw) { const m = await getAuthMod(); return m.signInWithEmailAndPassword(auth, email, pw); },
  async verifyEmail(user) { const m = await getAuthMod(); return m.sendEmailVerification(user); },
  async signOut() { const m = await getAuthMod(); return m.signOut(auth); },
  async onUser(cb) { const m = await getAuthMod(); return m.onAuthStateChanged(auth, cb); },
};
