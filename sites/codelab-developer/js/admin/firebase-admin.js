// Pengesahan & data Admin melalui Firebase (projek GENIUS DIGITAL). Keselamatan SEBENAR = Security Rules di pelayan
// (isAdmin() menyemak token pengesahan); kod ini hanya UX. Tiada kata laluan disimpan dalam kod.
import { firebaseConfig } from '../../firebase/firebase-config.js';
import { FirebaseProvider } from '../statistics/firebase-provider.js';
import { dayKey } from '../statistics/kl-time.js';

const ADMIN_BUNDLE = '../../assets/vendor/firebase-admin.bundle.js';
export const fb = new FirebaseProvider(firebaseConfig, ADMIN_BUNDLE);

export class FirebaseAuthProvider {
  get name() { return 'firebase-auth'; }
  get connected() { return true; }
  async _auth() { await fb.init(); return (this.a ||= fb.m.getAuth(fb.app)); }
  async currentUser() {
    const a = await this._auth();
    await new Promise((res) => { const off = fb.m.onAuthStateChanged(a, () => { off(); res(); }); });
    return a.currentUser;
  }
  /** Admin? Tanya PELAYAN: baca dokumen yang rules benarkan untuk admin sahaja (permission-denied = bukan admin). */
  async isAdmin(user) {
    try { await fb.init(); await fb.m.getDoc(fb.m.doc(fb.db, 'codelab_users', user.uid)); return true; } catch { return false; }
  }
  async signIn(email, password) { const a = await this._auth(); return (await fb.m.signInWithEmailAndPassword(a, email, password)).user; }
  async signOut() { const a = await this._auth(); await fb.m.signOut(a); }
}

export class FirestoreAdminData {
  get connected() { return true; }
  async summary() { try { return { connected: true, ...(await fb.getSummary()) }; } catch { return {}; } }
  async dailySeries(days = 30) {
    await fb.init(); const { collection, query, where, documentId, orderBy, getDocs } = fb.m;
    const start = new Date(Date.now() - (days - 1) * 86400000);
    const snap = await getDocs(query(collection(fb.db, 'codelab_stats_daily'), where(documentId(), '>=', dayKey(start)), orderBy(documentId())));
    return snap.docs.map((d) => ({ key: d.id, visits: d.data().visits || 0 }));
  }
  async getConfig(id) { await fb.init(); const s = await fb.m.getDoc(fb.m.doc(fb.db, 'codelab_config', id)); return s.exists() ? s.data() : null; }
  async saveConfig(id, data) { await fb.init(); const { doc, setDoc, serverTimestamp } = fb.m; await setDoc(doc(fb.db, 'codelab_config', id), { ...data, updatedAt: serverTimestamp() }); }
  async saveTools(disabled) { await this.saveConfig('tools', { disabled }); await this.log('tools', `disabled=${disabled.length}`); }
  async saveSettings(v) { await this.saveConfig('site', v); await this.log('settings', 'site'); }
  async getContent(type, lang) { await fb.init(); const s = await fb.m.getDoc(fb.m.doc(fb.db, 'codelab_content', `${type}_${lang}`)); return s.exists() ? s.data().texts : null; }
  async saveContent(type, lang, texts) { await fb.init(); const { doc, setDoc, serverTimestamp } = fb.m; await setDoc(doc(fb.db, 'codelab_content', `${type}_${lang}`), { texts, updatedAt: serverTimestamp() }); await this.log('content', `${type}_${lang}`); }
  async log(type, detail, user) {
    await fb.init(); const { collection, addDoc, serverTimestamp } = fb.m; const a = fb.m.getAuth(fb.app);
    await addDoc(collection(fb.db, 'codelab_activity'), { type, detail: String(detail).slice(0, 200), actor: (user || a.currentUser)?.email || '', at: serverTimestamp() });
  }
  async listActivity(n = 15) {
    await fb.init(); const { collection, query, orderBy, limit, getDocs } = fb.m;
    const s = await getDocs(query(collection(fb.db, 'codelab_activity'), orderBy('at', 'desc'), limit(n)));
    return s.docs.map((d) => ({ id: d.id, ...d.data(), at: d.data().at?.toDate?.() }));
  }
  async listUsers() { return []; }
  async toolUsage() { return null; }
}
export const adminData = new FirestoreAdminData();
