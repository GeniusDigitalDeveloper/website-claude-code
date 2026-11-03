# Enrollment Android (HONOR) — Fasa 2

Fasa 1 sudah menyediakan sisi server: `createEnrollment` (token + payload QR), `registerDevice`, heartbeat RTDB, `fetchPendingCommands`, `ackCommand`.

**Fasa 2 perlu dibina dan diuji pada peranti fizikal:**
- Agent Kotlin (`android-agent/`) sebagai **Device Owner/DPC**. Memasang APK biasa **tidak** memberi Device Owner. Laluan sah: QR provisioning pada peranti yang di-factory-reset (ketik skrin 6 kali di skrin Welcome), zero-touch, atau `dpm set-device-owner` (hanya untuk pembangunan, peranti tanpa akaun).
- Lock: `DevicePolicyManager.lockNow()`. Unlock jauh tidak ditakrif oleh API Android; model yang sah ialah **kiosk/Lock Task mode** yang dikawal agent, atau reset kod laluan. Dokumentasikan pendekatan yang dipilih sebelum bina.
- Atau gunakan Android Management API (perlu akaun Google Cloud + enterprise binding).
- Agent: panggil `registerDevice` → `signInWithCustomToken` → tulis `presence/{orgId}/{deviceId}` setiap ~5 minit (WorkManager) → `fetchPendingCommands` apabila FCM `COMMANDS_AVAILABLE` / apabila kembali online → `ackCommand`.
