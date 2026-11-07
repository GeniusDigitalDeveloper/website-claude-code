// Sambungan Firebase (projek fetchrbox-app-izzul). Kunci web Firebase memang awam; keselamatan dijaga oleh firestore.rules.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, orderBy, limit, serverTimestamp, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCKtaQCKn8mRG4mDmxTWAuNzECwpcrQMyc',
  authDomain: 'fetchrbox-app-izzul.firebaseapp.com',
  projectId: 'fetchrbox-app-izzul',
  storageBucket: 'fetchrbox-app-izzul.firebasestorage.app',
  messagingSenderId: '226405297083',
  appId: '1:226405297083:web:2c24902f277e53192a729e',
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
  /** Nama pengguna ini masih kosong? (dokumen usernames/{nama} tidak wujud) */
  async usernameFree(name) { try { return !(await getDoc(doc(db, 'usernames', name))).exists(); } catch { return true; } },
  /** Daftar, tuntut nama pengguna + simpan profil secara atomik, kemudian log keluar supaya pengguna terus ke skrin log masuk. */
  async register(email, password, lang, username) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      const b = writeBatch(db);
      b.set(doc(db, 'usernames', username), { uid: cred.user.uid });
      b.set(doc(db, 'users', cred.user.uid), { email: cred.user.email, createdAt: serverTimestamp(), lang, username, bio: '' });
      await b.commit();
    } catch (e) {
      // Nama pengguna diambil orang lain serentak: batalkan akaun supaya e-mel boleh digunakan semula.
      try { await cred.user.delete(); } catch { /* abaikan */ }
      const err = new Error('username-taken'); err.code = 'app/username-taken'; throw err;
    }
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

  /* ---- Notifikasi: admin hantar ke semua pengguna, setiap pengguna ada keadaan baca/padam sendiri ---- */
  watchNotifs(cb) { return onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(100)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([])); },
  watchNState(uid, cb) { return onSnapshot(collection(db, 'users', uid, 'nstate'), (s) => { const m = {}; s.docs.forEach((d) => { m[d.id] = d.data(); }); cb(m); }, () => cb({})); },
  async markRead(uid, ids) { const b = writeBatch(db); ids.slice(0, 400).forEach((id) => b.set(doc(db, 'users', uid, 'nstate', id), { read: true }, { merge: true })); await b.commit(); },
  async deleteNotifs(uid, ids) { const b = writeBatch(db); ids.slice(0, 400).forEach((id) => b.set(doc(db, 'users', uid, 'nstate', id), { read: true, deleted: true }, { merge: true })); await b.commit(); },
  sendNotif: (n) => addDoc(collection(db, 'notifications'), { ...n, createdAt: serverTimestamp() }),
  removeNotif: (id) => deleteDoc(doc(db, 'notifications', id)),

  /* ---- Notis peribadi (keputusan permohonan) ---- */
  watchMyNotices(uid, cb) { return onSnapshot(collection(db, 'users', uid, 'notices'), (s) => cb(s.docs.map((d) => ({ id: 'p_' + d.id, ...d.data() }))), () => cb([])); },
  sendNotice: (uid, n) => addDoc(collection(db, 'users', uid, 'notices'), { ...n, createdAt: serverTimestamp() }),

  /* ---- Permohonan kelulusan kandungan berhak cipta ---- */
  /** Token ID pengguna: dihantar kepada pelayan supaya ia boleh menyemak kelulusan atas nama pengguna. */
  async idToken() { const u = auth.currentUser; return u ? u.getIdToken() : ''; },
  createRequest: (data) => addDoc(collection(db, 'requests'), { ...data, status: 'pending', createdAt: serverTimestamp() }),
  watchMyRequests(uid, cb) { return onSnapshot(query(collection(db, 'requests'), where('uid', '==', uid)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 9e9) - (a.createdAt?.seconds || 9e9))), () => cb([])); },
  watchRequests(cb) { return onSnapshot(query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(200)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([])); },
  decideRequest: (id, status, note, by) => updateDoc(doc(db, 'requests', id), { status, adminNote: String(note || '').slice(0, 200), decidedAt: serverTimestamp(), decidedBy: by }),

  /* ---- Chat pengguna <-> admin ---- */
  watchMyChat(uid, cb) { return onSnapshot(query(collection(db, 'chats', uid, 'messages'), orderBy('at', 'asc'), limit(200)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([])); },
  watchChatMeta(uid, cb) { return onSnapshot(doc(db, 'chats', uid), (s) => cb(s.exists() ? s.data() : {}), () => cb({})); },
  async sendToAdmin(user, text, lang) {
    await addDoc(collection(db, 'chats', user.uid, 'messages'), { from: 'user', text, lang, at: serverTimestamp() });
    await setDoc(doc(db, 'chats', user.uid), { email: user.email, lang, lastText: text.slice(0, 120), lastFrom: 'user', lastAt: serverTimestamp(), unreadAdmin: true }, { merge: true });
  },
  markChatReadUser(uid) { return updateDoc(doc(db, 'chats', uid), { unreadUser: false }).catch(() => {}); },
  // Admin
  watchChats(cb) { return onSnapshot(query(collection(db, 'chats'), orderBy('lastAt', 'desc'), limit(100)), (s) => cb(s.docs.map((d) => ({ uid: d.id, ...d.data() }))), () => cb([])); },
  watchThread(uid, cb) { return onSnapshot(query(collection(db, 'chats', uid, 'messages'), orderBy('at', 'asc'), limit(300)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([])); },
  async sendAsAdmin(uid, text, trUser, toLang) {
    const m = { from: 'admin', text, lang: 'ms', at: serverTimestamp() };
    if (trUser) { m.trUser = trUser; m.toLang = toLang; }
    await addDoc(collection(db, 'chats', uid, 'messages'), m);
    await updateDoc(doc(db, 'chats', uid), { lastText: text.slice(0, 120), lastFrom: 'admin', lastAt: serverTimestamp(), unreadAdmin: false, unreadUser: true });
  },
  markChatReadAdmin: (uid) => updateDoc(doc(db, 'chats', uid), { unreadAdmin: false }).catch(() => {}),
  saveTrMs: (uid, mid, text) => updateDoc(doc(db, 'chats', uid, 'messages', mid), { trMs: text }),

  /* ---- Profil pengguna ---- */
  watchProfile(uid, cb) { return onSnapshot(doc(db, 'users', uid), (s) => cb(s.exists() ? s.data() : {}), () => cb({})); },
  /** Cipta rekod profil jika belum ada (cth akaun yang dicipta terus dalam Firebase). */
  async ensureProfile(user, lang) {
    try { const r = doc(db, 'users', user.uid); if (!(await getDoc(r)).exists()) await setDoc(r, { email: user.email, createdAt: serverTimestamp(), lang }); } catch { /* abaikan */ }
  },
  savePhoto: (uid, dataUrl, srcUrl) => updateDoc(doc(db, 'users', uid), srcUrl ? { photo: dataUrl, photoSrc: srcUrl } : { photo: dataUrl }),
  saveProfileInfo: (uid, bio, link) => updateDoc(doc(db, 'users', uid), { bio: String(bio).slice(0, 150), link: String(link).slice(0, 200) }),
  saveBio: (uid, bio) => updateDoc(doc(db, 'users', uid), { bio: String(bio).slice(0, 150) }),

  /** Statistik awam untuk footer: { total, days: { 'YYYY-MM-DD': n } } (ditulis oleh pelayan). */
  watchPublicStats(cb) { return onSnapshot(doc(db, 'stats', 'public'), (s) => cb(s.exists() ? s.data() : {}), () => cb({})); },

  /* ---- Statistik masa nyata (admin) ---- */
  watchSummary(cb) { return onSnapshot(doc(db, 'stats', 'summary'), (s) => cb(s.exists() ? s.data() : {}), () => cb({})); },
  watchDaily(cb, days = 400) {
    return onSnapshot(query(collection(db, 'daily'), orderBy('__name__', 'desc'), limit(days)), (s) => cb(s.docs.map((d) => ({ day: d.id, ...d.data() }))), () => cb([]));
  },
  watchUsers(cb) {
    return onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200)), (s) => cb(s.docs.map((d) => ({ uid: d.id, ...d.data() }))), () => cb([]));
  },
};
