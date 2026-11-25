# Pelesenan muzik — apa yang sah sekarang & apa yang diperlukan

## Sekarang (berfungsi, sah)
| Fungsi | Pembekal | Status |
|---|---|---|
| Carian katalog global (lagu, artis, album, genre), carta, keluaran baharu, halaman artis/album | **Deezer API awam** (tiada kunci) melalui proksi `/api/catalog` | ✅ Data sebenar |
| Main balik lagu katalog | Pratonton **30 saat** yang Deezer sediakan (MP3 128 kbps) | ✅ Dilabel "Pratonton 30s" pada setiap lagu |
| Lagu penuh, lossless | Fail **milik pengguna** (peranti/import) | ✅ Kualiti asal termasuk FLAC |

LUNARA MUSIC **tidak** mengikis, tidak memintas DRM, tidak berpura-pura lagu boleh dimainkan. Lagu yang Deezer tandakan `readable:false` atau tiada pratonton dipaparkan "Tidak tersedia" dan dilangkau.

## Untuk lagu penuh macam Spotify (perlu tindakan ustaz)
Metadata ≠ hak penstriman. Pilihan sebenar:
1. **Apple MusicKit JS / MusicKit (iOS)** — lagu penuh untuk pengguna yang ada langganan Apple Music. Perlu Apple Developer Program (USD 99/tahun) + MusicKit key. Integrasi paling realistik.
2. **Spotify Web Playback SDK** — lagu penuh untuk pengguna Spotify Premium sahaja, dan terma Spotify melarang UI yang "meniru" Spotify sebagai produk pesaing. Perlu semakan undang-undang.
3. **Jamendo API** — ~600k lagu Creative Commons, lagu penuh sah. Perlu `client_id` percuma dari devportal.jamendo.com. Sedia untuk ditambah sebagai penyedia kedua.
4. **Perjanjian label/agregator** (cth. 7digital/MediaNet, Believe, lesen MACP/RPM di Malaysia) — untuk katalog penuh sendiri. Kos & rundingan komersial.

Cadangan: tambah Jamendo (mudah, percuma) + MusicKit (untuk pengguna Apple Music) sebagai fasa seterusnya.
