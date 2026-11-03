# Enrollment peranti Android

Aplikasi agent ada dalam `android-agent/` (lihat README di sana). Aliran yang rules sokong, tanpa Cloud Functions:

1. Admin: All Devices > Daftar peranti. Panel mencipta `enrollments/{kod}` (kod rawak 32 aksara, sah 47 jam, sekali guna) dan memaparkan QR/kod JSON `{v, projectId, code, name, type}`.
2. Agent: log masuk **Anonymous**, kemudian dalam satu batch: cipta `devices/{uid}` (nama/jenis mesti sama dengan enrollment), tanda `enrollments/{kod}` USED, cipta `publicStatus/{uid}` dan log DEVICE_REGISTERED. Rules menolak kod yang sudah USED, tamat atau tidak wujud.
3. Heartbeat: agent mengemas kini `devices/{uid}` dan `publicStatus/{uid}` (status, bateri, lastSeen) setiap 4 minit. Panel dan index menganggap peranti OFFLINE jika `lastSeen` > 10 minit.
4. Arahan: agent mendengar `commands` miliknya: PENDING → SENT → EXECUTED/FAILED. Rules menolak PENDING → EXECUTED terus dan arahan tamat tempoh.

Lock sebenar yang kekal (kiosk), unlock jauh dan reboot memerlukan Device Owner (Android Enterprise). Lihat `android-agent/README.md`.
