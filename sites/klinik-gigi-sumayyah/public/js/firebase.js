// Sambungan Firebase — projek "SumayyahDental" (sumayyahdental)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// Config web ini bukan rahsia — keselamatan dijaga oleh firestore.rules & database.rules.json.
export const firebaseConfig = {
  apiKey: "AIzaSyCujY_ZB-48l6q7CXiDlyvVlZOQazISYnk",
  authDomain: "sumayyahdental.firebaseapp.com",
  databaseURL: "https://sumayyahdental-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sumayyahdental",
  storageBucket: "sumayyahdental.firebasestorage.app",
  messagingSenderId: "136020778940",
  appId: "1:136020778940:web:5116898a730e7e105915b9",
  measurementId: "G-DV3T8MY9Z2",
};

// UID akaun admin (mesti sama dengan firestore.rules & database.rules.json)
export const ADMIN_UID = "PBq9CMPmd2O8q71us6OAqeaqhdu1";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
