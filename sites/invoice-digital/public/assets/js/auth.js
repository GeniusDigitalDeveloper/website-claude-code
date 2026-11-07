import { auth, db, A, F } from "./firebase.js";
import { t } from "./i18n.js";

export const errMsg = (e) => {
  const c = (e && e.code) || "";
  const m = {
    "auth/invalid-credential": "err_login", "auth/wrong-password": "err_login", "auth/user-not-found": "err_login", "auth/invalid-email": "err_email",
    "auth/email-already-in-use": "err_exists", "auth/weak-password": "err_weak", "auth/too-many-requests": "err_many", "auth/network-request-failed": "err_net",
    "auth/popup-closed-by-user": "err_popup", "auth/cancelled-popup-request": "err_popup", "auth/operation-not-allowed": "err_notallowed", "auth/unauthorized-domain": "err_domain",
    "permission-denied": "err_perm", "unavailable": "err_net",
  }[c.replace("firestore/", "")];
  return m ? t(m) : t("err_generic") + (c ? ` (${c})` : "");
};

export const onUser = (cb) => A.onAuthStateChanged(auth, cb);
export const signIn = (email, pw) => A.signInWithEmailAndPassword(auth, email, pw);
export const signOut = () => A.signOut(auth);
export const resetPw = (email) => A.sendPasswordResetEmail(auth, email);
// Popup dahulu (laju). Jika disekat pelayar (biasa pada mudah alih), guna redirect; hasil ditangkap oleh onAuthStateChanged.
export async function googleSignIn() {
  const prov = new A.GoogleAuthProvider(); prov.setCustomParameters({ prompt: "select_account" });
  try { return await A.signInWithPopup(auth, prov); }
  catch (e) { if (e.code === "auth/popup-blocked") return A.signInWithRedirect(auth, prov); throw e; }
}
export async function register(name, email, pw) {
  const cred = await A.createUserWithEmailAndPassword(auth, email, pw);
  if (name) await A.updateProfile(cred.user, { displayName: name });
  return cred;
}
export async function isAdminUser(user, force = false) {
  if (!user) return false;
  const r = await user.getIdTokenResult(force);
  return r.claims.admin === true;
}

// Cipta/kemas kini profil pengguna aplikasi. Pengguna baharu menaikkan kiraan awam pengguna (dalam transaksi yang sama).
// Selepas daftar/log masuk, panggilan Firestore pertama kadang-kadang dihantar sebelum token auth sedia -> permission-denied.
// Segarkan token dan cuba semula (maks 3 kali) sebelum menyerah.
export async function ensureUserDoc(user, lang) {
  let last;
  for (let i = 0; i < 3; i++) {
    try { await user.getIdToken(i > 0); return await ensureUserDocOnce(user, lang); }
    catch (e) { last = e; if (e.code !== "permission-denied") throw e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
}
async function ensureUserDocOnce(user, lang) {
  const ref = F.doc(db, "inv_users", user.uid);
  const stat = F.doc(db, "inv_stats", "users");
  const snap = await F.getDoc(ref);
  if (!snap.exists()) {
    const batch = F.writeBatch(db);
    batch.set(ref, { uid: user.uid, email: user.email || "", displayName: user.displayName || "", lang, createdAt: F.serverTimestamp(), lastLoginAt: F.serverTimestamp() });
    batch.set(stat, { count: F.increment(1) }, { merge: true });
    await batch.commit();
    return { disabled: false, isNew: true };
  }
  const d = snap.data();
  if (!d.disabled) await F.updateDoc(ref, { lastLoginAt: F.serverTimestamp() }).catch(() => {});
  return { disabled: d.disabled === true, isNew: false };
}
