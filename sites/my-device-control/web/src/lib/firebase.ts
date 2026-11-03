'use client';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

export const firebaseConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);

export const app = getApps().length ? getApp() : initializeApp(firebaseConfigured ? cfg : { apiKey: 'unset', projectId: 'unset', appId: 'unset' });

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_APPCHECK_SITE_KEY && firebaseConfigured) {
  try {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_APPCHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  } catch { /* sudah dimulakan */ }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-southeast1');
