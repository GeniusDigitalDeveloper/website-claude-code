# Badan Nadwah Islamiah Pahang

Dua sistem (kod asal dari Gemini, layout tidak diubah):

| Sistem | Fail | URL (selepas domain siap) |
|---|---|---|
| Portal Awam | `public/index.html` | https://nadwahpahang.org |
| Panel Admin | `public/admin/index.html` | https://nadwahpahang.org/admin |

- Database: Firebase Realtime Database projek `nadwah-c5d27` (asia-southeast1). Config Firebase dalam kedua-dua fail kekal asal.
- `firebase.json` hanya ada `hosting`, jadi `firebase deploy` **tidak** sentuh database atau rules sedia ada.

## Deploy

```bash
cd sites/nadwah-pahang
npx firebase-tools deploy --only hosting --project nadwah-c5d27
```

## Domain nadwahpahang.org

Firebase Console → Hosting → Add custom domain → `nadwahpahang.org` (dan `www.nadwahpahang.org` redirect ke apex),
kemudian masukkan rekod DNS (TXT + A) yang Firebase beri di panel DNS pendaftar domain. SSL keluar sendiri dalam beberapa jam.

## Log masuk Panel Admin

Panel Admin guna **Firebase Authentication (Email/Password)**. Sesiapa yang ada akaun dalam
Firebase Console → Authentication → Users boleh log masuk terus (tiada senarai UID). Untuk tambah admin baru,
tambah user di situ sahaja. Untuk buang akses, padam atau disable user tersebut.

## Pautan bersih (tanpa #)

Portal: `/korporat`, `/tentang`, `/pelan-kompleks`, `/program`, `/galeri`, `/komen`, `/hubungi-kami`,
`/ajk`, `/ajk-utama`, `/ajk-biasa`, `/pengenalan`. Pautan lama `/#korporat` auto ditukar ke `/korporat`.

Admin: `/admin`, `/admin/banner`, `/admin/cta`, `/admin/program`, `/admin/ajk`, `/admin/sejarah`,
`/admin/pelan-kompleks`, `/admin/galeri`, `/admin/korporat`, `/admin/komen`.

`firebase.json` ada `rewrites` supaya semua path ini buka `index.html` yang betul.
