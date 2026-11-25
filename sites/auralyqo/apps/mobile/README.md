# apps/mobile — Flutter (Android + iOS) — BELUM DIBINA

Status: **belum dimulakan.** Persekitaran pembinaan ini tiada Flutter SDK / Android SDK / Xcode, jadi app native tidak dapat dibina atau diuji di sini. Tiada kod Flutter yang diserahkan supaya tiada ciri yang didakwa siap tanpa diuji.

Sementara itu, **apps/web ialah PWA** yang boleh dipasang pada Android dan iPhone (Tambah ke Skrin Utama) dengan kawalan media skrin kunci (Media Session API), main balik latar, fade/crossfade sebenar, import muzik peranti.

## Pelan app native (Fasa 6)
| Keperluan | Pakej Flutter |
|---|---|
| Imbasan automatik muzik Android (MediaStore) | `on_audio_query` + kebenaran `READ_MEDIA_AUDIO` (Android 13+) / `READ_EXTERNAL_STORAGE` |
| Import iOS dari app Files | `file_picker` (UIDocumentPicker) |
| Enjin audio + fade (volume ramp sebenar) + crossfade | `just_audio` (2 pemain), logik fade sama seperti `apps/web/src/lib/audio-engine.ts` |
| Notifikasi media Android / skrin kunci iOS / Bluetooth / fon kepala | `audio_service` + `audio_session` |
| Firebase Auth / Firestore / Storage | `firebase_auth`, `google_sign_in`, `cloud_firestore`, `firebase_storage` |

Skema data dan sync sama seperti web (`docs/database/SCHEMA.md`), jadi playlist/kegemaran terus disegerak antara telefon dan web.

Untuk mula: pasang Flutter 3.24+ pada mesin anda, `flutter create --org app.auralyqo mobile`, kemudian ikut jadual di atas.
