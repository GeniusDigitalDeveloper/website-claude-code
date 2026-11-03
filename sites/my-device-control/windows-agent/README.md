# Agent Windows (Fasa 5)

Agent latar belakang untuk laptop/PC Windows — berjalan tanpa perlu buka pelayar, boleh **LOCK**
jauh dan hantar heartbeat walaupun pengguna log keluar/masuk semula. Ini tambahan kepada
`agent.html` (yang masih boleh dipakai untuk status sahaja tanpa pasang apa-apa).

Satu fail PowerShell sahaja (`agent.ps1`), guna Firebase REST API terus — **tiada** Node, .NET
atau pemasangan lain diperlukan. Jalan pada Windows 10/11 dengan PowerShell 5.1 (sedia ada) atau
PowerShell 7.

## Keupayaan
- Daftar dengan kod enrollment dari panel admin (sama aliran macam Android/web: tunggu "Sahkan").
- Heartbeat setiap 60 saat → status ONLINE di panel dan di `index.html`.
- Terima arahan **LOCK** (`rundll32.exe user32.dll,LockWorkStation`) dan **SYNC_POLICY**.
- `UNLOCK` dan `REBOOT` dilaporkan **tidak disokong** — Windows tiada "Device Owner" macam
  Android, jadi arahan ini sengaja tidak dijalankan supaya tiada kejutan pada pengguna.
- Bila admin **buang peranti** dari panel: agent kesan (patch heartbeat gagal 404/403),
  nyahdaftar scheduled task dan padam fail sendiri secara automatik.
- **Tiada** remote shell, tiada jalankan arahan arbitrari, tiada pantau skrin/kongsi skrin
  (ciri itu Android sahaja, dan perlu kelulusan pengguna setiap sesi di situ juga).

## Pasang
1. Admin cipta pendaftaran di panel (`admin.html` → Peranti → Daftar peranti baharu → jenis
   **Windows**), salin kod 32 aksara.
2. Di PC Windows, muat turun folder `windows-agent/` (atau salin `agent.ps1` dan `install.ps1`
   ke satu folder).
3. Buka PowerShell **biasa** (bukan perlu Administrator) di folder itu, jalankan:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
   .\install.ps1 -Code "TAMPAL_KOD_DARI_PANEL"
   ```
4. Agent didaftarkan serta-merta dan berjalan di latar (Scheduled Task, mula setiap kali log
   masuk). Tunggu admin tekan **Sahkan** di panel.

## Nyahpasang
- Automatik: admin buang peranti di panel — agent lepaskan diri sendiri dalam heartbeat
  seterusnya (≤60 saat, selagi PC online).
- Manual (PC offline / nak buang terus): jalankan `.\uninstall.ps1` di PC itu.

## Log
`%LOCALAPPDATA%\MyDeviceControl\agent.log` — rekod ringkas (daftar, heartbeat gagal, arahan).

## Jujur: had dan belum diuji
- **Belum diuji pada Windows sebenar** — ditulis dan disemak sintaks (brace/paren seimbang,
  medan rules Firestore disemak satu-satu) tetapi tiada mesin Windows untuk jalankan betul-betul
  dalam sesi ini. Kalau ada ralat, semak `agent.log` dan hantar kandungannya.
- `LOCK` guna `LockWorkStation` — ini kunci sesi Windows biasa (sama macam Win+L), bukan kunci
  peringkat BIOS/disk.
- Tiada sekatan aplikasi atau tapisan web pada Windows buat masa ini (ciri itu Android sahaja).
