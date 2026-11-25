# apps/admin

Papan admin kini berada di **`/admin`** dalam apps/web (dilindungi custom claim `admin` + peraturan Firestore).
Ciri: kiraan pengguna, senarai pengguna + gantung akaun, playlist pilihan, genre, status API katalog, log ralat penstriman, laporan kandungan.
Lantik admin: `cd backend/functions && GOOGLE_APPLICATION_CREDENTIALS=sa.json npm run set-admin -- emel@anda.com`.
Boleh dipisahkan ke app Next.js sendiri kemudian tanpa ubah backend.
