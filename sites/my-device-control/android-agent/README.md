# Android Agent (Fasa 2)

Aplikasi Kotlin untuk **telefon dan tablet Android** (Android 7.0 ke atas, contoh HONOR). iPhone/iPad tidak disokong: Apple hanya membenarkan pengurusan melalui Apple MDM. Mendaftar dengan kod enrollment dari panel admin, menghantar heartbeat dan melaksanakan arahan.

## Bina
```bash
cd android-agent
export ANDROID_HOME=/laluan/ke/Android/Sdk      # atau buka folder ini dalam Android Studio
gradle assembleDebug                            # APK: app/build/outputs/apk/debug/app-debug.apk
```
Android Studio: File > Open > folder `android-agent`, tunggu Gradle sync, kemudian Run atau Build APK.

## Pasang & sambung (imbas, kemudian admin Terima)
1. Pasang APK pada telefon atau tablet (benarkan pemasangan dari sumber ini).
2. Panel admin > All Devices > **Daftar peranti**: pilih jenis, taip nama apa-apa (tak perlu sama dengan peranti sebenar), jana kod QR.
3. Buka aplikasi: **skrin pertama ialah kamera**. Imbas kod QR itu. Tiada skrin tetapan lain.
4. Peranti muncul di panel dalam kad **"Menunggu kelulusan"** (dengan bunyi dan toast). Admin tekan **Terima**, dan peranti terus boleh dikawal. **Tolak** membuang peranti, dan aplikasi melepaskan dirinya.
5. Notifikasi "Peranti ini diurus oleh pentadbir" sentiasa kelihatan.

Kunci skrin memerlukan kebenaran pentadbir peranti **sekali** pada peranti (Android tidak membenarkan ia dilangkau tanpa Device Owner). Aplikasi tidak memintanya di awal: apabila admin menghantar LOCK pertama kali, satu notifikasi muncul; ketuk untuk memberi kebenaran.

## Apa yang dilakukan (dan tidak)
| Arahan | Pentadbir peranti biasa | Device Owner |
|---|---|---|
| LOCK | `lockNow()` (skrin dikunci; pengguna buka dengan PIN) | Skrin kiosk (LockTask) sehingga UNLOCK |
| UNLOCK | **GAGAL** dengan sebab jelas (Android tidak benarkan buka kunci PIN dari jauh) | Menamatkan skrin kiosk |
| REBOOT | GAGAL (perlu Device Owner) | `reboot()` |
| SYNC_POLICY | EXECUTED (hanya menyegerak status) | sama |

Status `EXECUTED` hanya ditulis selepas pelaksanaan sebenar; jika gagal, `FAILED` dengan mesej.

## Device Owner (kiosk, unlock jauh, reboot)
APK biasa tidak menjadi Device Owner. Untuk ujian pada peranti yang baru di-reset (tiada akaun Google):
```bash
adb shell dpm set-device-owner my.devicecontrol.agent/.AdminReceiver
```
Untuk pengeluaran: provisioning QR semasa persediaan awal peranti, zero-touch atau Android Enterprise (perlukan APK dihoskan dan checksum). Ini bukan sesuatu yang aplikasi boleh lakukan sendiri.

## Had & perkara belum diuji
- Dikompil dan APK dijana, tetapi **belum dijalankan pada peranti sebenar**.
- `APP_ID` dalam `AgentConfig.kt` ialah ID aplikasi web. Jika log masuk Anonymous atau Firestore ditolak, daftarkan aplikasi Android (`my.devicecontrol.agent`) di Firebase Console dan tampal App ID Android.
- Log masuk **Anonymous** mesti diaktifkan di Firebase Console > Authentication > Sign-in method.
- Heartbeat berjalan dalam perkhidmatan latar depan (4 minit). Penjimatan bateri pengeluar (HONOR) mungkin menghentikannya: tetapkan aplikasi "tiada had bateri". Android 15 menghadkan permulaan semula perkhidmatan `dataSync` selepas boot; Device Owner boleh guna jenis `systemExempted`.
- Belum ada: FCM (arahan diterima melalui sambungan Firestore langsung), dasar aplikasi (Fasa 2 lanjutan), sekat aplikasi, tapisan web (Fasa 3), skrin langsung (Fasa 4).

## Nyahpasang dan melepaskan peranti
- **Selagi diurus:** aplikasi tidak boleh dinyahpasang begitu sahaja. Pentadbir peranti aktif menghalang nyahpasang sehingga dinyahaktifkan. Dengan **Device Owner**, nyahpasang disekat sepenuhnya.
- **Admin buang peranti dari panel:** peranti dikesan terlepas (secara langsung, atau apabila ia kembali dalam talian). Agent berhenti, melepaskan kebenaran pentadbir/Device Owner dan kiosk, lalu aplikasi **boleh dinyahpasang tanpa e-mel atau kata laluan**.
- **Pada peranti itu sendiri:** tekan "Lepaskan peranti" dan masukkan e-mel serta kata laluan salah satu akaun Firebase Authentication. Peranti dibuang dari panel dan aplikasi terus ditawarkan untuk dinyahpasang.
- **Had Android:** tanpa Device Owner, pengguna masih boleh menyahaktifkan pentadbir peranti di Tetapan lalu menyahpasang tanpa kata laluan; Android tidak membenarkan aplikasi menghalangnya. Panel akan menandakan peranti itu **ERROR** (pentadbir peranti dinyahaktifkan) pada heartbeat seterusnya. Jika peranti luar talian semasa dibuang dari panel, ia kekal dilindungi sehingga ia kembali dalam talian.
