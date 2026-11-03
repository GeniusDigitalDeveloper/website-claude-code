# Enrollment peranti (Fasa 2, belum dibina)

Tiada Cloud Functions. Aliran yang rules sokong:

1. Admin: All Devices → Daftar peranti → panel mencipta `enrollments/{kod}` (kod rawak 32 aksara, sah 48 jam, sekali guna) dan memaparkan QR `{v:1, projectId, code}`.
2. Agent peranti: log masuk **Anonymous** → dalam satu batch: cipta `devices/{uid}` (nama/jenis mesti sama dengan enrollment, `enrollmentCode`=kod) dan kemas kini `enrollments/{kod}` kepada `status:USED, deviceId:uid`. Rules menolak kod yang sudah USED, tamat atau tidak wujud.
3. Heartbeat: agent mengemas kini `devices/{uid}` (`status`, `batteryLevel`, `lastSeen`, ...) kira-kira setiap 5 minit. Agent juga menulis `publicStatus/{uid}` (`deviceName`, `deviceType`, `status`, `batteryLevel`, `lastSeen`) untuk paparan awam `index.html`; jangan letak maklumat sensitif di situ. Panel menganggap peranti OFFLINE jika `lastSeen` > 10 minit. (Pilihan: `presence/{uid}` dalam Realtime Database.)
4. Arahan: agent membaca `commands` miliknya dan menukar status mengikut urutan PENDING → SENT → ACKNOWLEDGED → EXECUTED/FAILED. Rules menolak PENDING → EXECUTED terus dan arahan tamat tempoh.

Lock sebenar di Android memerlukan agent Kotlin sebagai Device Owner (Android Enterprise). APK biasa tidak cukup.
