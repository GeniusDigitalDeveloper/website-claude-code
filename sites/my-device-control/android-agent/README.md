# Android Agent

Aplikasi Kotlin untuk telefon dan tablet Android (Android 7.0 ke atas, apa-apa jenama). iPhone/iPad tidak disokong (Apple hanya membenarkan pengurusan melalui Apple MDM).

## Bina
```bash
cd android-agent
export ANDROID_HOME=/laluan/ke/Android/Sdk
gradle assembleDebug          # app/build/outputs/apk/debug/app-debug.apk
gradle testDebugUnitTest      # ujian unit pembina paket DNS dan logik polisi
```

## Sambung
1. Panel admin > All Devices > Daftar peranti: pilih jenis, taip nama apa-apa, jana kod QR.
2. Buka aplikasi: kamera terus terbuka. Imbas kod QR.
3. Peranti muncul di panel dalam kad "Menunggu pengesahan". Admin tekan **Sahkan**.
4. Selepas disahkan, telefon papar satu skrin ringkas dengan dua butang kebenaran (sekali sahaja, lihat bawah).

## Apa yang admin boleh urus (dan syarat sebenar pada telefon)
| Fungsi | Cara | Kebenaran pada telefon |
|---|---|---|
| Aplikasi dibuka / ditutup | Perkhidmatan Aksesibiliti merekod nama pakej + masa buka; skrin utama / skrin padam = ditutup. Panel admin (Live Monitoring) kira bila dibuka, bila ditutup, berapa kali sehari (reset 12 malam). Kandungan skrin, carian dan taipan tidak dibaca | Aksesibiliti, sekali |
| Sekat aplikasi (BLOCK / REQUIRE APPROVAL) | Aksesibiliti: aplikasi disekat dibawa ke skrin utama dengan mesej; jika sedang dibuka masa disekat, terus dikeluarkan dan proses latarnya dimatikan | Aksesibiliti, sekali |
| Kunci skrin (LOCK) | Aksesibiliti (`GLOBAL_ACTION_LOCK_SCREEN`, Android 9+) | Aksesibiliti, sekali |
| Tapisan web | VPN setempat yang hanya memintas pertanyaan DNS; domain disekat dijawab NXDOMAIN | VPN, sekali |
| Aplikasi dipasang | Senarai aplikasi pelancar | Tiada |
| UNLOCK jauh, REBOOT, kiosk | Hanya jika aplikasi ialah Device Owner | Provisioning khas |

Kunci skrin yang dibatalkan dari jauh (UNLOCK) tidak mungkin pada telefon biasa: pengguna membuka dengan PIN.

## Had yang jujur
- Dikompil dan diuji unit (pembina paket DNS, polisi), tetapi **belum dijalankan pada setiap model peranti**. Fungsi VPN dan Aksesibiliti perlu disahkan pada telefon sebenar.
- Penapisan web pada peringkat DNS: tidak melihat sejarah carian atau kandungan; Chrome dengan "Secure DNS" dihidupkan boleh memintasnya; pelayan DNS ialah 1.1.1.1/8.8.8.8 semasa VPN aktif.
- Pantau skrin (kongsi skrin) sudah dibuang. Live Monitoring kini hanya aktiviti aplikasi: nama aplikasi dan masa dibuka/ditutup. Carian Chrome dan apa yang ditaip sengaja tidak direkodkan.
- Penjimatan bateri pengeluar (HONOR/TECNO/Xiaomi) boleh menghentikan agent: tetapkan aplikasi "tiada had bateri".
- Jika admin membuang peranti dari panel, agent melepaskan dirinya dan aplikasi boleh dinyahpasang tanpa kata laluan.
