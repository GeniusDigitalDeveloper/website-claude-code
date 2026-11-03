# Seni bina — MY DEVICE CONTROL (Fasa 1)

```
Admin (browser) ──► Web dashboard (Next.js, eksport statik, dihoskan di Interactive Link)
                      │  Firebase Auth (apa-apa penyedia) → ID token + Custom Claims {orgId, role}
                      ├─ baca masa nyata ─► Cloud Firestore (dikawal firestore.rules)
                      └─ tindakan ──────► Cloud Functions (callable, semak peranan & orgId, tulis audit log)
Peranti (agent) ─► registerDevice (token enrollment sekali guna) → custom token {role:DEVICE, orgId, deviceId}
                ─► heartbeat → Realtime Database /presence/{orgId}/{deviceId} (murah bateri)
                ─► fetchPendingCommands / ackCommand (Functions)
RTDB trigger onPresenceWrite ─► Firestore devices/{id}.status,lastSeen,batteryLevel
Jadual: markOfflineDevices (5 min, >10 min tiada heartbeat ⇒ OFFLINE), expireCommands (15 min)
```

## Keputusan utama
- **Hosting statik**: Interactive Link tidak diketahui menyokong Node, jadi `next build` mengeluarkan `out/` (HTML/JS/CSS). Backend sepenuhnya di Firebase.
- **Auth bebas penyedia**: peranan di Custom Claims, bukan bergantung pada penyedia. Tambah penyedia baharu = aktifkan di Console + satu baris di `web/src/lib/auth-providers.ts`, kemudian hubungkan akaun (Users & Roles → Hubungkan akaun, atau `firebase/scripts/link-existing-admins.mjs` untuk semua akaun sedia ada).
- **Command queue selamat**: klien tidak boleh menulis `commands`. Status `EXECUTED` hanya boleh ditetapkan oleh `ackCommand` dari token peranti itu sendiri; peralihan status disahkan (`logic.ts`, diuji).
- **Offline**: arahan kekal PENDING sehingga peranti mengambilnya (SENT), lalu ACK/EXECUTED; tamat 24 jam (EXPIRED).

## Apa yang boleh dibina dengan Firebase sahaja vs perlukan lebih
| Fungsi | Firebase/web sahaja? | Keperluan sebenar |
|---|---|---|
| Dashboard, peranti, kumpulan, log, RBAC, queue | Ya (Fasa 1) | — |
| Heartbeat / status | Perlu agent di peranti | Android/Windows agent (Fasa 2/5) |
| Lock/Unlock Android | Tidak | Agent Device Owner + `DevicePolicyManager`/Android Management API; enrollment Android Enterprise (QR/zero-touch/DPC), bukan APK biasa |
| Sekat/benarkan aplikasi | Tidak | Android Management API / Device Policy |
| Web filtering | Tidak | Managed browser, DNS filtering atau web gateway |
| Live screen | Tidak | MediaProjection + persetujuan pengguna + penunjuk kelihatan + WebRTC, atau remote support sah |
| Windows lock/pengurusan | Tidak | Agent berkhidmat berhak istimewa / Windows MDM |

## Status Fasa 1
Siap & diuji: UI, Auth, Firestore, Functions (kompil + ujian logik), rules Firestore (emulator). **Belum diuji**: Functions pada emulator/live, rules RTDB, integrasi dengan peranti sebenar, deploy ke Interactive Link.
