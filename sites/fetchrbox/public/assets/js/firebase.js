// Sambungan Firebase (projek fetchr-box-izzul). Kunci web Firebase memang awam; keselamatan dijaga oleh firestore.rules.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCZi-nFSqEE3vQ-WARpgf0ePuByEmLJjkM',
  authDomain: 'fetchr-box-izzul.firebaseapp.com',
  projectId: 'fetchr-box-izzul',
  storageBucket: 'fetchr-box-izzul.firebasestorage.app',
  messagingSenderId: '87434149496',
  appId: '1:87434149496:web:4c990197042a24c783378d',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let defaultsCache;
export async function getDefaults() {
  if (!defaultsCache) defaultsCache = await (await fetch('assets/defaults.json')).json();
  return defaultsCache;
}

/** Gabung dokumen Firestore dengan nilai lalai (supaya laman sentiasa ada kandungan). */
async function withDefaults(remote = {}) {
  const d = await getDefaults();
  return {
    platforms: remote.platforms || d.platforms,
    faq: remote.faq || d.faq,
    settings: { ...d.settings, ...(remote.settings || {}) },
  };
}

export const fb = {
  /** Langgan tetapan tapak secara masa nyata. Perubahan admin terus sampai ke laman awam. */
  watchSite(cb) {
    withDefaults().then(cb);
    return onSnapshot(doc(db, 'site', 'config'), (snap) => withDefaults(snap.exists() ? snap.data() : {}).then(cb), () => {});
  },
  async getSite() {
    try { const s = await getDoc(doc(db, 'site', 'config')); return withDefaults(s.exists() ? s.data() : {}); } catch { return withDefaults(); }
  },
  async saveSite(part) { await setDoc(doc(db, 'site', 'config'), part, { merge: true }); },

  /* ---- Pengesahan (e-mel + kata laluan sahaja) ---- */
  onUser: (cb) => onAuthStateChanged(auth, cb),
  currentUser: () => auth.currentUser,
  /** Daftar, simpan profil, kemudian log keluar supaya pengguna terus ke skrin log masuk. */
  async register(email, password, lang) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try { await setDoc(doc(db, 'users', cred.user.uid), { email: cred.user.email, createdAt: serverTimestamp(), lang }); } catch { /* profil pilihan */ }
    await signOut(auth);
  },
  login: (email, password) => signInWithEmailAndPassword(auth, email, password),
  logout: () => signOut(auth),
  resetPassword: (email) => sendPasswordResetEmail(auth, email),
  /** Untuk panel admin: { ok, owner }. Pemilik = claim admin; admin lain = e-mel dalam koleksi admins. */
  async adminState(user) {
    const r = await user.getIdTokenResult(true);
    if (r.claims.admin === true) return { ok: true, owner: true };
    try { const s = await getDoc(doc(db, 'admins', String(user.email).toLowerCase())); return { ok: s.exists(), owner: false }; } catch { return { ok: false, owner: false }; }
  },
  watchAdmins(cb) { return onSnapshot(collection(db, 'admins'), (s) => cb(s.docs.map((d) => ({ email: d.id, ...d.data() }))), () => cb([])); },
  addAdmin: (email, by) => setDoc(doc(db, 'admins', email.toLowerCase()), { addedBy: by, addedAt: serverTimestamp() }),
  removeAdmin: (email) => deleteDoc(doc(db, 'admins', email.toLowerCase())),

  /* ---- Profil pengguna ---- */
  watchProfile(uid, cb) { return onSnapshot(doc(db, 'users', uid), (s) => cb(s.exists() ? s.data() : {}), () => cb({})); },
  /** Cipta rekod profil jika belum ada (cth akaun yang dicipta terus dalam Firebase). */
  async ensureProfile(user, lang) {
    try { const r = doc(db, 'users', user.uid); if (!(await getDoc(r)).exists()) await setDoc(r, { email: user.email, createdAt: serverTimestamp(), lang }); } catch { /* abaikan */ }
  },
  savePhoto: (uid, dataUrl) => updateDoc(doc(db, 'users', uid), { photo: dataUrl }),

  /* ---- Statistik masa nyata (admin) ---- */
  watchSummary(cb) { return onSnapshot(doc(db, 'stats', 'summary'), (s) => cb(s.exists() ? s.data() : {}), () => cb({})); },
  watchDaily(cb, days = 400) {
    return onSnapshot(query(collection(db, 'daily'), orderBy('__name__', 'desc'), limit(days)), (s) => cb(s.docs.map((d) => ({ day: d.id, ...d.data() }))), () => cb([]));
  },
  watchUsers(cb) {
    return onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200)), (s) => cb(s.docs.map((d) => ({ uid: d.id, ...d.data() }))), () => cb([]));
  },
};
