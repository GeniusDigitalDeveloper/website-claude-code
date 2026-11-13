# Flash Link (V-22)

Sistem link-in-bio satu fail: `public/index.html` (HTML + CSS + JS + Tailwind CDN + Firebase modular v10).

## Setup
1. Firebase Console > GENIUS DIGITAL > Project Settings > Your apps > **FLASH LINK** > salin config.
2. Tampal ke `FIREBASE_CONFIG` di dalam `public/index.html` (hanya app FLASH LINK).
3. Authentication: aktifkan Email/Password dan Google sahaja (jangan ubah provider lain). Tambah domain hosting ke Authorized domains.
4. Isi `.firebaserc` dengan Project ID sebenar.

## Rules (HANYA TAMBAH)
- `rules/*.additions.*` ialah snippet sahaja. `firebase.json` sengaja TIADA bahagian firestore/database supaya tidak terdeploy secara tidak sengaja.
- Backup dahulu rules semasa ke `backup/firestore.rules.bak` dan `backup/database.rules.bak.json`, gabungkan di bawah rules lama, tunjuk diff, baru deploy.

## Deploy hosting (site baharu, tidak timpa yang sedia ada)
```
# site khas FLASH LINK sudah wujud (kosong): genius-digital-flashlink-40bc9-5effc
firebase target:apply hosting flashlink genius-digital-flashlink-40bc9-5effc
firebase deploy --only hosting:flashlink
```

## Struktur data
`flashlink_users/{uid}`, `flashlink_usernames/{username}`, `flashlink_links/{id}`, `flashlink_events/{id}`, `flashlink_leads/{id}`; RTDB `flashlink/live/{uid}`.
Medan tambahan dalam `flashlink_users`: `bannerUrl`, `testimonials[]`.

## Demo tanpa Firebase
`/demo?t=minimal|grid|dark|landing|store`

## Had diketahui
- SEO/Open Graph dijana oleh JS (Spark, tiada Cloud Functions) — pengecam pautan yang tak jalankan JS tidak nampak avatar.
- Tiada muat naik fail: imej guna URL.

## Statistik masa nyata (footer)
RTDB `flashlink/stats/{users,total,daily/YYYY-MM-DD,monthly/YYYY-MM}`. Setiap sesi pelayar menaikkan hari + bulan + keseluruhan serentak (waktu Malaysia, UTC+8), jadi "reset" 12 malam dan awal bulan berlaku melalui kunci tarikh — tiada Cloud Functions. Dipaparkan dengan `onValue` (masa nyata). Kaunter dibuka kepada klien (+1 sahaja), maka angka boleh dipalsukan oleh pihak yang berniat jahat; ia untuk paparan, bukan bil.
