# Persediaan integrasi Firebase (fasa akan datang)

Buat masa ini **pangkalan data belum disambungkan**. Folder ini menyediakan struktur supaya sambungan nanti
mudah dan selamat. Semua alat berfungsi tanpa Firebase.

## Apa yang sudah siap

| Fail | Fungsi |
|---|---|
| `js/statistics/kl-time.js` | Kunci hari/bulan & kiraan masa reset berdasarkan **Asia/Kuala_Lumpur** (diuji) |
| `js/statistics/provider.js` | Kontrak penyedia statistik + `NullProvider` (tiada data → UI papar “—”) |
| `js/statistics/firebase-provider.js` | Kerangka `FirebaseProvider` (kod rujukan, belum aktif) |
| `js/admin/auth.js` | Kontrak `AuthProvider` + `NullAuth`; tiada log masuk palsu |
| `js/admin/data.js` | Lapisan data admin + skema koleksi Firestore |
| `firebase/firestore.rules` | Security Rules (tolak lalai, admin melalui custom claim) |
| `firebase/firebase-config.example.js` | Templat konfigurasi web (bukan rahsia) |

## Model statistik

```
stats/total                { visits, registeredUsers }
stats_daily/{YYYY-MM-DD}   { visits }   ← kunci waktu Malaysia
stats_monthly/{YYYY-MM}    { visits }   ← kunci waktu Malaysia
```

* **Hari ini**: dokumen `stats_daily/<tarikh MYT hari ini>`. Apabila jam MYT melepasi 00:00, kunci bertukar →
  kiraan bermula dari 0 secara automatik (tiada cron diperlukan).
* **Bulan ini**: dokumen `stats_monthly/<YYYY-MM MYT>`; bertukar pada 00:00 MYT hari pertama bulan baharu.
* **Keseluruhan**: `stats/total.visits` terkumpul, tidak pernah direset.
* **Pengguna berdaftar**: `stats/total.registeredUsers`, dikemas kini oleh Cloud Function pada `auth.user().onCreate`.

`localStorage` **tidak** digunakan untuk statistik global (ia hanya mewakili satu pelayar).

## Langkah sambungan

1. Cipta projek Firebase (pelan Spark percuma), aktifkan **Firestore** dan **Authentication**.
2. `cp firebase/firebase-config.example.js firebase/firebase-config.js` dan isi konfigurasi web.
3. Deploy peraturan: `firebase deploy --only firestore:rules`.
4. Dokumen awal: cipta `stats/total` dengan `{ visits: 0, registeredUsers: 0 }`.
5. Dalam `js/statistics/firebase-provider.js` buang `throw` dan aktifkan kod rujukan (SDK modular).
6. Dalam `js/statistics/stats.js` tukar `new NullProvider()` → `new FirebaseProvider(firebaseConfig)`.
7. Sangat disyorkan: aktifkan **Firebase App Check** dan/atau pindahkan penambahan kiraan ke Cloud Function untuk
   mengelak pelawat berniat jahat menokok kiraan.

## Keselamatan Admin

* Log masuk **mesti** guna Firebase Authentication (aktifkan MFA).
* Peranan admin = custom claim `admin: true`, ditetapkan **di pelayan** dengan Admin SDK:

  ```js
  // skrip Node.js dipercayai (JANGAN jalankan dalam pelayar)
  await getAuth().setCustomUserClaims(uid, { admin: true });
  ```
* Security Rules menyemak `request.auth.token.admin == true` bagi setiap data admin. Mengubah URL ke `/admin/…` atau
  menyahsembunyi butang **tidak** memberi akses data kerana pelayan akan menolak.
* Jangan commit `firebase-config.js` yang mengandungi kunci perkhidmatan, atau fail service-account.
