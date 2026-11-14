import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Konfigurasi web Firebase adalah awam (bukan rahsia); keselamatan dikawal oleh Rules.
const config = {
  apiKey: "AIzaSyA5UxGC00d8KkFPjrg2XbM9OycG2m-3uOA",
  authDomain: "solat-digital-my.firebaseapp.com",
  storageBucket: "solat-digital-my.firebasestorage.app",
  messagingSenderId: "743274540051",
  projectId: "solat-digital-my",
  appId: "1:743274540051:web:99ab2749c1ec73f01223e6",
  databaseURL: "https://solat-digital-my-default-rtdb.firebaseio.com",
};
// Panel Owner (/super) guna aplikasi Firebase berasingan supaya sesi log masuknya TIDAK bercampur dengan panel masjid / TV
// (kedua-duanya satu alamat web; tanpa pengasingan, akaun Owner boleh "terlog masuk" pada panel masjid).
const isOwnerPanel = typeof location !== "undefined" && location.pathname.startsWith("/super");
const appName = isOwnerPanel ? "owner" : "[DEFAULT]";
const app = getApps().find((a) => a.name === appName) ?? (isOwnerPanel ? initializeApp(config, "owner") : initializeApp(config));
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
