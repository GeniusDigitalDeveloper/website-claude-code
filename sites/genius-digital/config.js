/* =====================================================================
   GENIUS DIGITAL — KONFIGURASI (satu tempat sahaja untuk diubah)
   Dikongsi oleh index.html dan admin.html.
   ===================================================================== */
window.GENIUS_CONFIG = {
  /* 1) Gantikan dengan konfigurasi Firebase sebenar anda:
        Firebase Console → Project settings → General → Your apps → Web app → SDK setup and configuration.
        Nilai ini BUKAN rahsia (keselamatan dikawal oleh Security Rules + Authentication). */
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },

  /* 2) Maklumat hubungan (placeholder). Biarkan kosong "" jika belum ada — ia dipaparkan sebagai
        "Akan dikemas kini" dan TIDAK menjadi pautan. Bila diisi, ia terus menjadi pautan. */
  contact: {
    email: "",          // contoh: "hello@domainanda.com"
    whatsapp: "",       // nombor penuh tanpa +/ruang, contoh: "60123456789"
    facebook: "",       // contoh: "https://facebook.com/halamananda"
    instagram: "",      // contoh: "https://instagram.com/akaunanda"
    linkedin: ""        // contoh: "https://linkedin.com/company/syarikatanda"
  },

  /* 3) Halaman produk. Buat masa ini semua butang "Explore Product" memaparkan "Product Coming Soon".
        Bila halaman produk sedia, tukar kepada true: produk berstatus Active yang mempunyai productURL
        akan dibuka di tab baharu. */
  productPagesEnabled: false
};
