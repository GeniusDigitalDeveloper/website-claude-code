// Sambungan ke projek Firebase GENIUS DIGITAL (app: INVOICE DIGITAL & QUOTATION).
// Config web Firebase ialah awam mengikut amalan Firebase; keselamatan dijamin oleh Security Rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import * as A from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import * as F from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyA6jQBsL6OahJ2FcMBFf38ISoGQiTTYg2s",
  authDomain: "genius-digital-40bc9.firebaseapp.com",
  projectId: "genius-digital-40bc9",
  storageBucket: "genius-digital-40bc9.firebasestorage.app",
  messagingSenderId: "508099045190",
  appId: "1:508099045190:web:f4ec1d3f5c38ae391e2747",
};
export const app = initializeApp(firebaseConfig);
// Auth: sesi kekal. Iframe popup hanya dimuat awal pada halaman log masuk/daftar (jika dimuat di semua halaman, pemulihan sesi tertangguh).
const onAuthPage = /^#\/(login|register)/.test(location.hash);
export const auth = A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence], ...(onAuthPage ? { popupRedirectResolver: A.browserPopupRedirectResolver } : {}) });
// Firestore: cache IndexedDB (data dipaparkan serta-merta pada lawatan seterusnya, disegarkan dari pelayan di latar).
let _db; try { _db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); } catch { _db = F.getFirestore(app); }
export const db = _db;
export { A, F };
