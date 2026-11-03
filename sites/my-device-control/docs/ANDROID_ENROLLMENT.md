# Enrollment peranti Android

Aplikasi agent ada dalam `android-agent/` (lihat README di sana). Aliran yang rules sokong, tanpa Cloud Functions:

1. Admin: All Devices > Daftar peranti. Panel mencipta `enrollments/{kod}` (kod rawak 32 aksara, sah 47 jam, sekali guna) dan memaparkan QR/kod JSON `{v, projectId, code, name, type}`.
2. Agent: log masuk **Anonymous**, kemudian dalam satu batch: cipta `devices/{uid}` (nama/jenis mesti sama dengan enrollment), tanda `enrollments/{kod}` USED, cipta `publicStatus/{uid}` dan log DEVICE_REGISTERED. Rules menolak kod yang sudah USED, tamat atau tidak wujud.
3. Heartbeat: agent mengemas kini `devices/{uid}` dan `publicStatus/{uid}` (status, bateri, lastSeen) setiap 4 minit. Panel dan index menganggap peranti OFFLINE jika `lastSeen` > 10 minit.
4. Arahan: agent mendengar `commands` miliknya: PENDING → SENT → EXECUTED/FAILED. Rules menolak PENDING → EXECUTED terus dan arahan tamat tempoh.

Lock sebenar yang kekal (kiosk), unlock jauh dan reboot memerlukan Device Owner (Android Enterprise). Lihat `android-agent/README.md`.

## Peranti bukan Android
Buka `agent.html` pada peranti (apa-apa pelayar), tampal kod enrollment (pilih jenis iPhone/Windows/Mac/Linux/Lain-lain semasa Daftar peranti di panel). Aliran data sama, tetapi agent web hanya melapor status dan bateri semasa halaman terbuka, dan melaporkan LOCK/UNLOCK/REBOOT sebagai tidak disokong (FAILED dengan sebab). Kawalan penuh iPhone/iPad memerlukan Apple MDM, di luar skop sistem ini.

## Nyahdaftar peranti
Panel meminta e-mel dan kata laluan salah satu akaun Firebase Authentication sebelum memadam peranti (pengesahan dalam panel; bukan peraturan pelayan).

## Kelulusan admin
Selepas agent mengimbas kod, `devices/{uid}` dicipta dengan `enrollmentStatus: PENDING_APPROVAL` dan `status: ENROLLMENT_PENDING`. Peranti tidak boleh heartbeat, menerima arahan atau mengemas kini status awam sehingga admin menekan Terima (`enrollmentStatus: ENROLLED`, `status: ONLINE`). Rules juga menolak arahan kepada peranti yang belum diterima, dan peranti tidak boleh meluluskan dirinya sendiri. Tolak memadam rekod peranti.
