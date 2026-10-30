# Sambungan Firebase (Firestore + Authentication)

Projek: **Website Claude Code** (`website-claude-code-izzul`).

## Status
- Aplikasi web "Ibnu Yazid Website" didaftarkan; `firebase-config.js` diisi.
- Firestore Database `(default)` dicipta: `asia-southeast1` (Singapura), mod Native, peringkat percuma.
- Firestore Rules (`firebase/firestore.rules`) dipasang pada projek.
- Dua akaun admin (Firebase Authentication, Email/Password):
  - `ibnumohdyazid01@gmail.com`  UID `A7c8OilGg5d3kUBBAfQfbsirvqR2`
  - `izzulmedia01@gmail.com`     UID `Ky8ziH4OBPaEQDeJFS0LylB81xd2`
- Rules dan pintu masuk admin menggunakan UID (bukan emel), jadi tukar emel tidak memecahkan akses.

## Cara guna
Buka `ibnu-yazid-admin.html`, log masuk dengan emel dan kata laluan salah satu akaun di atas.
Kali pertama, data asal dihantar ke Firestore secara automatik.

## Struktur data
| Laluan | Kandungan | Baca | Tulis |
|---|---|---|---|
| `site/config` | Semua teks, senarai, tema (tanpa gambar) | semua | admin |
| `images/{id}` | `{ album, data }` satu gambar (data URL, maks 900KB) | semua | admin |
| `stats/total`, `stats/d-YYYY-MM-DD` | `{ count }` pelawat | semua | pelawat tambah tepat +1, admin bebas |
| `leads/{id}` | Pertanyaan dari borang sebut harga | admin | semua boleh cipta (disahkan), admin ubah/padam |

## Realtime Database (tidak digunakan oleh laman)
`firebase/database.rules.json` ialah Rules sedia pakai untuk Realtime Database dengan model yang sama. Laman ini menggunakan Firestore, jadi fail ini hanya diperlukan jika anda mengaktifkan Realtime Database.

## Ujian
- Firestore Rules: 43 kes (emulator), semua lulus.
- Realtime Database Rules: 21 kes (emulator), semua lulus.
- Admin dan pelawat hujung-ke-hujung: 23 semakan, semua lulus.
- Rules di projek sebenar: bacaan awam dibenarkan, tulisan dan bacaan sensitif tanpa log masuk ditolak.

## Nota
- Pelawat boleh menokok kaunter tepat +1 dan menghantar pertanyaan; untuk menghalang spam, aktifkan App Check (pilihan).
- Selepas Rules dipasang, ia mengambil sehingga ~1 minit untuk berkuat kuasa.
