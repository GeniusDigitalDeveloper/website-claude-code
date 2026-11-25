# LUNARA MUSIC — Skema Firestore

| Laluan | Pemilik | Kandungan |
|---|---|---|
| `users/{uid}` | pengguna | `displayName`, `username`, `email`, `photoURL`, `createdAt`, `role` (`user`/`admin`, hanya admin ubah), `suspended` |
| `users/{uid}/data/library` | pengguna | `favourites[]`, `playlists[]` (id, name, description, cover, isPublic, tracks[], createdAt, updatedAt), `recent[]`, `savedAlbums[]`, `searchHistory[]`, `artistPlays{}`, `resume`, `updatedAt{}` per kumpulan |
| `users/{uid}/data/settings` | pengguna | tema, fade (enabled, fadeIn, fadeOut, fadeInSec, fadeOutSec, crossfade, crossfadeSec), kualiti, autoplay, privasi, bahasa, `updatedAt` |
| `users/{uid}/data/layout` | pengguna | preset, sections[] (id, visible, kind, title), accent, cardSize, density, radius, sidebar, player style, `updatedAt` |
| `featured_playlists/{id}` | admin | `title`, `deezerPlaylistId`, `active`, `createdAt` |
| `genres/{id}` | admin | `name`, `createdAt` |
| `error_logs/{id}` | sistem | `uid`, `trackId`, `message`, `ua`, `at` |
| `reports/{id}` | pengguna → admin | `uid`, `type`, `detail`, `targetId`, `createdAt`, `resolved` |
| `rate_limits/{key}` | Cloud Functions sahaja | kiraan had kadar e-mel reset |

## Pemetaan ke koleksi yang dicadangkan dalam brief

Brief mencadangkan `playlists`, `playlist_tracks`, `favorites`, `recently_played`, `user_settings` dsb. sebagai koleksi berasingan.
Versi 1 menggabungkannya ke dalam **3 dokumen per pengguna** (`library`, `settings`, `layout`) kerana:

- 1 bacaan + 1 snapshot listener per kumpulan → kos rendah, sync masa nyata mudah, berfungsi offline.
- Konflik diselesaikan per kumpulan (`updatedAt`) dan per playlist.
- Had 1 MB per dokumen ≈ ~2,500 lagu dalam semua playlist. Bila pengguna melebihi had ini, pecahkan ke `users/{uid}/playlists/{id}` + `playlist_tracks` (laluan migrasi dalam docs/architecture).

`albums`, `artists`, `music_catalog` **tidak disimpan** — metadata katalog diambil secara langsung dari pembekal berlesen (Deezer API) melalui proksi `/api/catalog`, supaya sentiasa terkini dan tidak menyalin data berhak cipta.
Fail audio **tidak pernah** disimpan dalam Firestore/Storage.
