# Smart Solat: paparan waktu solat (diekstrak daripada Flash Link)

Folder ini ialah **projek berasingan**. Ia hanya mengandungi paparan waktu solat (TV pintar di bahagian bawah laman utama Flash Link) beserta kod yang ia perlukan. Tiada kod Flash Link lain, tiada Firebase.

## Isi

| Fail | Fungsi |
|---|---|
| `index.html` | Semua kod dalam satu fail (HTML + CSS + JavaScript, tanpa dependency). Buka terus dalam pelayar atau hidangkan dengan mana-mana pelayan statik. |
| `assets/mosque.jpg` | Latar paparan (1920 x 1280). |
| `assets/pop-subuh.jpg` ... `pop-isyak.jpg` | 5 gambar pop-up waktu solat (segi empat sama). |
| `assets/azan.m4a`, `azan-subuh.m4a` | Azan (Subuh khas, empat waktu lain guna satu fail). |

## Apa yang ada dalam kod

- **Paparan waktu solat** (`prayHtml`, `drawPray`): lima waktu (Subuh, Zuhur, Asar, Maghrib, Isyak) dengan tulisan Arab, waktu semasa ditanda hijau, kiraan detik ke waktu seterusnya.
- **Data JAKIM** (`loadPray`, `ZONES`): waktu rasmi e-solat.gov.my untuk semua zon Malaysia, disimpan sehari dalam `localStorage`.
- **Zon**: dikesan automatik (geolokasi, kemudian IP, kemudian SGR01), atau pilih sendiri (`zoneModal`).
- **Jam Malaysia** (`syncClock`): disegerakkan dengan masa pelayan JAKIM supaya tepat.
- **Pop-up dan azan** (`prayWatch`, `showPrayPop`, `prayAudio`, `azanModal`): keluar sebaik waktu masuk (dalam 30 minit pertama), azan berbunyi, suis azan hidup/mati.
- **Kelip 1 minit sebelum waktu** (`.pray-tv.alert`): bingkai TV berkelip gradient biru-hijau, lebih laju pada 10 saat terakhir.
- **Slideshow latar** (`psStart`, `SLIDES`): letak sehingga 10 URL gambar dalam `SLIDES.imgs`. Pilihan animasi: `kenburns`, `zoomout`, `pan`, `campur`, `fade`. Laraskan `secs`, `zoom`, `px`, `py`.

## Cara guna

```bash
cd sites/smart-solat
python3 -m http.server 8080   # kemudian buka http://localhost:8080
```

Pelayar mesti boleh capai `www.e-solat.gov.my`, `api.waktusolat.app` dan `ipwho.is`. Azan hanya berbunyi selepas pengguna pernah klik/ketik halaman sekali (peraturan autoplay pelayar).

## Kredit

- Waktu solat: JAKIM (e-solat.gov.my).
- Foto latar: Muhammad Faqih, CC BY-SA 4.0, Wikimedia Commons.
- Foto pop-up: Moataz Egbaria (CC BY-SA 3.0), TheHadiRahim (CC0), Ikhwan Salleh (CC BY-SA 4.0), Ezry Abdul Rahman (CC BY 2.0), Uwe Aranas (CC BY-SA 3.0).
- Azan: Ustaz Asri (Rabbani), Furqan Fawaz.
