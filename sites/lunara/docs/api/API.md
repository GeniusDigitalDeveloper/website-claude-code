# API dalaman

## GET /api/catalog/{path}?q=&limit=&index=
Proksi baca-sahaja ke `https://api.deezer.com/{path}`. Laluan dibenarkan:
`search[/track|album|artist|playlist]`, `chart/0[/tracks|albums|artists|playlists]`, `editorial/0/selection|charts`, `genre`,
`track/{id}`, `album/{id}[/tracks]`, `artist/{id}[/top|albums|related|radio]`, `playlist/{id}[/tracks]`.
Lain-lain → 400 `endpoint_not_allowed`. Ralat hulu → 502/503. `track/*` tidak dicache (URL pratonton bertandatangan & tamat tempoh).

## Cloud Functions (asia-southeast1)
- `sendBrandedPasswordReset({ email })` — callable. Had 3/jam/e-mel, 20/jam/IP. Tidak dedahkan sama ada e-mel berdaftar. Hantar HTML berjenama via SMTP; pautan ke `/reset-password?oobCode=…` (1 jam, sekali guna).
- `setUserSuspended({ uid, suspended })` — admin sahaja; matikan log masuk + batalkan token.
- `cleanupDeletedUser` — trigger padam akaun: buang Firestore + Storage pengguna.
