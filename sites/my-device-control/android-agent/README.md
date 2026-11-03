# Android Agent (Fasa 2)

Aplikasi Kotlin untuk tablet Android (HONOR). Mendaftar dengan kod enrollment dari panel admin, menghantar heartbeat dan melaksanakan arahan.

## Bina
```bash
cd android-agent
export ANDROID_HOME=/laluan/ke/Android/Sdk      # atau buka folder ini dalam Android Studio
gradle assembleDebug                            # APK: app/build/outputs/apk/debug/app-debug.apk
```
Android Studio: File > Open > folder `android-agent`, tunggu Gradle sync, kemudian Run atau Build APK.

## Pasang & daftar
1. Pasang APK pada tablet (benarkan pemasangan dari sumber ini).
2. Buka aplikasi: **1. Aktifkan pentadbir peranti** (kebenaran untuk kunci skrin).
3. Panel admin > All Devices > **Daftar peranti** > salin kod atau imbas QR dalam aplikasi > **3. Daftar peranti**.
4. Peranti muncul di panel dan di `index.html` (paparan awam). Notifikasi "Peranti ini diurus oleh pentadbir" sentiasa kelihatan.

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
