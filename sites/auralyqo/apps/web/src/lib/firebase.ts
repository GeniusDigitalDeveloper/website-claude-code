"use client";
/**
 * Firebase client. Activated only when NEXT_PUBLIC_FIREBASE_* env vars are present
 * (see .env.example). Without them AURALYQO runs in "device mode": everything works,
 * data is kept on this device, and sign-in screens explain what is missing.
 * Only public web config lives here. Admin keys stay in Cloud Functions.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
export function fb() {
  if (!firebaseEnabled) return null;
  if (!app) app = getApps()[0] ?? initializeApp(config);
  return app;
}
export const auth = (): Auth | null => (fb() ? getAuth(fb()!) : null);
let firestore: Firestore | null = null;
/** Firestore with offline persistence: writes queue while offline and sync when back online. */
export const db = (): Firestore | null => {
  if (!fb()) return null;
  if (!firestore) firestore = initializeFirestore(fb()!, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  return firestore;
};
export const storage = (): FirebaseStorage | null => (fb() ? getStorage(fb()!) : null);
export const functions = (): Functions | null => (fb() ? getFunctions(fb()!, "asia-southeast1") : null);
