"use client";
import { create } from "zustand";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  browserLocalPersistence,
  browserSessionPersistence,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  deleteUser,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, firebaseEnabled, functions } from "@/lib/firebase";

export interface Profile {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  photoURL?: string;
  createdAt?: number;
  providers: string[];
  emailVerified: boolean;
  isAdmin: boolean;
}

interface AuthState {
  ready: boolean;
  user: User | null;
  profile: Profile | null;
  init: () => void;
  google: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  forgot: (email: string) => Promise<void>;
  changePassword: (current: string | null, next: string) => Promise<void>;
  linkPassword: (password: string) => Promise<void>;
  changeEmail: (current: string | null, email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  updateName: (name: string, username: string) => Promise<void>;
  setPhoto: (url: string | null) => Promise<void>;
  deleteAccount: (current: string | null) => Promise<void>;
  refresh: () => Promise<void>;
}

const resetUrl = () => `${window.location.origin}/reset-password`;

export const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Emel atau kata laluan tidak betul.",
  "auth/wrong-password": "Kata laluan semasa tidak betul.",
  "auth/user-not-found": "Akaun dengan emel ini tidak wujud.",
  "auth/email-already-in-use": "Emel ini sudah didaftarkan. Cuba log masuk atau guna Google.",
  "auth/weak-password": "Kata laluan terlalu lemah (minimum 8 aksara).",
  "auth/too-many-requests": "Terlalu banyak cubaan. Cuba lagi sebentar.",
  "auth/popup-closed-by-user": "Tetingkap Google ditutup sebelum selesai.",
  "auth/requires-recent-login": "Sila sahkan semula identiti anda dahulu.",
  "auth/network-request-failed": "Tiada sambungan internet.",
  "auth/invalid-email": "Format emel tidak sah.",
  "auth/expired-action-code": "Pautan sudah tamat tempoh. Minta pautan baharu.",
  "auth/invalid-action-code": "Pautan tidak sah atau sudah digunakan.",
  "auth/provider-already-linked": "Kata laluan sudah dipautkan pada akaun ini.",
};
export const authMessage = (e: unknown) => AUTH_ERRORS[(e as { code?: string }).code ?? ""] ?? (e as Error).message ?? "Ralat tidak diketahui";

function need() {
  const a = auth();
  if (!a) throw new Error("Firebase belum disambungkan. Lihat Tetapan → Akaun untuk langkah persediaan.");
  return a;
}

async function loadProfile(u: User): Promise<Profile> {
  const token = await u.getIdTokenResult();
  const base: Profile = {
    uid: u.uid,
    displayName: u.displayName ?? u.email?.split("@")[0] ?? "Pengguna",
    username: (u.email?.split("@")[0] ?? u.uid.slice(0, 8)).toLowerCase(),
    email: u.email ?? "",
    photoURL: u.photoURL ?? undefined,
    createdAt: u.metadata.creationTime ? Date.parse(u.metadata.creationTime) : undefined,
    providers: u.providerData.map((p) => p.providerId),
    emailVerified: u.emailVerified,
    isAdmin: token.claims.admin === true,
  };
  const d = db();
  if (!d) return base;
  const ref = doc(d, "users", u.uid);
  const snap = await getDoc(ref).catch(() => null);
  if (snap?.exists()) {
    const x = snap.data();
    return { ...base, displayName: x.displayName ?? base.displayName, username: x.username ?? base.username, photoURL: x.photoURL ?? base.photoURL };
  }
  // first login (Google or email): create the user document automatically
  await setDoc(ref, { displayName: base.displayName, username: base.username, email: base.email, photoURL: base.photoURL ?? null, createdAt: serverTimestamp(), role: "user" }, { merge: true }).catch(() => {});
  return base;
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: !firebaseEnabled,
  user: null,
  profile: null,
  init: () => {
    const a = auth();
    if (!a) return set({ ready: true });
    onAuthStateChanged(a, async (u) => {
      set({ user: u, profile: u ? await loadProfile(u) : null, ready: true });
    });
  },
  refresh: async () => {
    const u = auth()?.currentUser;
    if (!u) return;
    await u.reload();
    set({ user: auth()!.currentUser, profile: await loadProfile(auth()!.currentUser!) });
  },
  google: async () => {
    const a = need();
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(a, p);
  },
  register: async (name, email, password) => {
    const a = need();
    const cred = await createUserWithEmailAndPassword(a, email, password);
    await updateProfile(cred.user, { displayName: name });
    await sendEmailVerification(cred.user, { url: `${window.location.origin}/login?verified=1` });
    set({ profile: await loadProfile(cred.user) });
  },
  login: async (email, password, remember) => {
    const a = need();
    await setPersistence(a, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(a, email, password);
  },
  logout: async () => {
    const a = auth();
    if (a) await signOut(a);
  },
  forgot: async (email) => {
    const fns = functions();
    // Branded HTML email through Cloud Function when deployed; fall back to Firebase's built-in email.
    if (fns) {
      try {
        await httpsCallable(fns, "sendBrandedPasswordReset")({ email, continueUrl: resetUrl() });
        return;
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code !== "functions/not-found" && code !== "functions/internal" && code !== "functions/unavailable") throw e;
      }
    }
    await sendPasswordResetEmail(need(), email, { url: `${window.location.origin}/login?reset=1` });
  },
  changePassword: async (current, next) => {
    const u = need().currentUser;
    if (!u) throw new Error("Sila log masuk dahulu.");
    if (current && u.email) await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
    else await reauthenticateWithPopup(u, new GoogleAuthProvider());
    await updatePassword(u, next);
  },
  linkPassword: async (password) => {
    const u = need().currentUser;
    if (!u?.email) throw new Error("Sila log masuk dahulu.");
    await linkWithCredential(u, EmailAuthProvider.credential(u.email, password));
    await get().refresh();
  },
  changeEmail: async (current, email) => {
    const u = need().currentUser;
    if (!u) throw new Error("Sila log masuk dahulu.");
    if (current && u.email) await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
    else await reauthenticateWithPopup(u, new GoogleAuthProvider());
    await verifyBeforeUpdateEmail(u, email);
  },
  resendVerification: async () => {
    const u = need().currentUser;
    if (u) await sendEmailVerification(u, { url: `${window.location.origin}/login?verified=1` });
  },
  updateName: async (name, username) => {
    const u = need().currentUser;
    if (!u) return;
    await updateProfile(u, { displayName: name });
    const d = db();
    if (d) await setDoc(doc(d, "users", u.uid), { displayName: name, username: username.toLowerCase() }, { merge: true });
    await get().refresh();
  },
  setPhoto: async (url) => {
    const u = need().currentUser;
    if (!u) return;
    await updateProfile(u, { photoURL: url });
    const d = db();
    if (d) await setDoc(doc(d, "users", u.uid), { photoURL: url }, { merge: true });
    await get().refresh();
  },
  deleteAccount: async (current) => {
    const u = need().currentUser;
    if (!u) return;
    if (current && u.email) await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
    else await reauthenticateWithPopup(u, new GoogleAuthProvider());
    await deleteUser(u); // Cloud Function onDelete cleans Firestore + Storage
  },
}));
