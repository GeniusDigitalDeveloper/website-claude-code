# MY DEVICE CONTROL

Dashboard dalaman untuk menguruskan telefon/tablet Android dan laptop Windows di tempat kerja. Firebase projek: `my-devide-control`.
`index.html` terbuka terus untuk sesiapa (baca sahaja, hanya nama/status/bateri). `admin.html`: log masuk dengan akaun Firebase Authentication anda terus masuk panel admin. Tiada pendaftaran organisasi atau pengesahan e-mel.

| Fail | Fungsi |
|---|---|
| `index.html` | Paparan awam status peranti, terbuka terus tanpa log masuk (satu fail lengkap) |
| `admin.html` | Panel admin dengan log masuk e-mel/kata laluan (satu fail lengkap) |
| `firestore.rules` | Rules Firestore |
| `database.rules.json` | Rules Realtime Database (heartbeat pilihan) |
| `preview.html` / `preview-artifact.html` | Preview + butang salin. Jana semula: `python3 build-preview.py` |
| `rules-test/` | Ujian rules Firestore (emulator): `cd rules-test && npm i && npm test` |

Penting: Firebase Console → Authentication → Settings → User actions → matikan **Enable create (sign-up)**.
