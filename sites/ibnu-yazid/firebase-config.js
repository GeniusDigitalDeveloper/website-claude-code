/* Konfigurasi Firebase untuk projek "Website Claude Code" (website-claude-code-izzul).
   Nota: apiKey Firebase bukan rahsia. Keselamatan ditentukan oleh Rules (lihat firebase/firestore.rules). */
window.IY_FIREBASE = {
  apiKey: "AIzaSyAsjBZFpfTi-ECdPQf-2XR24A0YyFBJNdA",
  authDomain: "website-claude-code-izzul.firebaseapp.com",
  projectId: "website-claude-code-izzul",
  storageBucket: "website-claude-code-izzul.firebasestorage.app",
  messagingSenderId: "1080602945324",
  appId: "1:1080602945324:web:6ada2051513646f607ee89"
};

// Akaun admin yang dibenarkan masuk panel (UID dari Firebase Authentication).
// Penguatkuasaan sebenar ada dalam Firestore Rules; senarai ini hanya menolak akaun lain di pintu masuk.
window.IY_ADMIN_UIDS = [
  "A7c8OilGg5d3kUBBAfQfbsirvqR2", // ibnumohdyazid01@gmail.com
  "Ky8ziH4OBPaEQDeJFS0LylB81xd2"  // izzulmedia01@gmail.com
];
