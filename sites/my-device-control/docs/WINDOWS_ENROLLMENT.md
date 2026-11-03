# Daftar peranti Windows

Dua cara, bergantung pada apa yang ustaz perlukan:

## Cara 1 — Agent latar belakang (boleh kunci jauh, disyorkan)
Lihat `windows-agent/README.md`. Ringkasnya:
1. Panel admin → Peranti → Daftar peranti baharu → jenis **Windows** → salin kod.
2. Di PC: `.\install.ps1 -Code "KOD"` dalam PowerShell.
3. Tunggu admin tekan **Sahkan**.

Boleh: status ONLINE walaupun pelayar ditutup, arahan **LOCK**.
Tak boleh: UNLOCK, REBOOT jauh, sekat aplikasi, tapisan web.

## Cara 2 — Agent web (tanpa pasang apa-apa)
1. Panel admin → Peranti → Daftar peranti baharu → jenis **Windows**.
2. Buka `agent.html` di pelayar PC itu, tampal kod.
3. Biarkan tab itu terbuka.

Boleh: status sahaja. Tak boleh: kunci jauh (akan dilaporkan "tidak disokong"), dan status jadi
OFFLINE sebaik tab ditutup.
