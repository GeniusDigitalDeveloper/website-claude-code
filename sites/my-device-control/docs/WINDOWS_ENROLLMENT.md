# Enrollment Windows — Fasa 5

Belum dibina. Pendekatan sah: agent berkhidmat Windows (berhak istimewa, dipasang oleh admin) yang menggunakan aliran enrollment/heartbeat/command yang sama (`registerDevice`, RTDB presence, `fetchPendingCommands`, `ackCommand`), atau Windows MDM (Intune/OMA-DM). Lock skrin: `LockWorkStation`. Tiada remote shell tersembunyi; pantauan mesti dimaklumkan kepada pengguna.
