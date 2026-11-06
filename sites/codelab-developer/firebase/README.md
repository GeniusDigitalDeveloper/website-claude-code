# Integrasi Firebase — projek GENIUS DIGITAL (`genius-digital-40bc9`)

Status: **Firestore disambungkan** untuk statistik footer. App web berdaftar: "CodeLab Developer"
(`1:508099045190:web:89c17b1f48fd1c231e2747`). Konfigurasi web ada di `firebase/firebase-config.js` (bukan rahsia).

## Projek dikongsi — baca ini dahulu
Rules Firestore projek ini ialah **satu fail** untuk 5 aplikasi (Genius Digital, Malaysia PDF Tools, Fetchr Box,
Streamverse Gaming, CodeLab). `firebase/firestore.rules` ialah gabungan penuh; bahagian CodeLab di hujung dengan
awalan `codelab_`. `firebase deploy --only firestore:rules` **menggantikan semua** — sebelum mengubah, ambil rules semasa
projek dahulu supaya perubahan aplikasi lain tidak hilang.

## Model data
```
codelab_stats/total                { visits, registeredUsers? }
codelab_stats_daily/{YYYY-MM-DD}   { visits }   <- kunci waktu Malaysia (reset 00:00 MYT automatik)
codelab_stats_monthly/{YYYY-MM}    { visits }   <- kunci bulan waktu Malaysia
codelab_config / codelab_content / codelab_activity / codelab_users   (admin; sedia untuk fasa admin)
```
Bacaan statistik awam (agregat sahaja). Penulisan awam dihadkan: cipta dengan `visits == 1` atau naik tepat +1.
Satu lawatan dikira sekali sehari setiap pelayar. `registeredUsers` hanya boleh ditulis admin (CodeLab belum ada pendaftaran, papar 0).

## Baki tugas keselamatan
* Hadkan API key kepada domain tapak (Google Cloud Console → Credentials) dan aktifkan **App Check** supaya kiraan tak boleh disepam.
* Panel Admin masih pratonton UI (`NullAuth`). Sambungan Firebase Authentication + custom claim `admin` ialah fasa seterusnya;
  `isAdmin()` dalam rules sudah menyemak claim tersebut.
* SDK ialah bundle setempat `assets/vendor/firebase-firestore.bundle.js` (Apache-2.0); CSP hanya benarkan `firestore.googleapis.com`.
