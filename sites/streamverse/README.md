# STREAMVERSE

**LEVEL UP YOUR STREAM. BUILD YOUR LEGACY.**

Platform all-in-one untuk gamer, livestreamer dan content creator. Frontend ialah **satu fail `index.html`** (HTML + CSS + JavaScript Vanilla dalam `<script type="module">`). Backend: Firebase Auth, Firestore, Storage, Hosting, Cloud Functions, App Check, dan Secret Manager. Tiada VPS.

> **Status sekarang:** `FIREBASE_CONFIG` dalam `index.html` masih **kosong**, jadi app belum disambung ke Firebase. Tanpa config, app buka **Studio Tempatan**. Kamera, mikrofon, screen capture, capture card, mixer, audio processing dan rakaman tempatan berfungsi dengan peranti sebenar. Ciri cloud pula tunjuk status **Firebase Not Configured**.
>
> **Selepas `FIREBASE_CONFIG` diisi:** butang "Buka Studio Tempatan" dan kad "STUDIO TEMPATAN" hilang dengan sendirinya. Semua fungsi peranti (kamera, mic, mixer, rakaman, scene) **kekal**, cuma kini perlu log masuk dulu dan scene/tetapan disimpan ke Firestore akaun pengguna. Isi config yang **sama** dalam `index.html` dan `admin.html`.

---

## 0. Status setiap fungsi

| Ciri | UI siap | Berfungsi tanpa backend | Perlukan permission browser | Perlukan hardware | Perlukan Firebase / API platform |
|---|---|---|---|---|---|
| Register / Login / Verify / Reset | ✓ | – | – | – | Firebase Auth |
| Streamer Hub (status sebenar) | ✓ | ✓ | – | – | Platform status: Firebase |
| 10 Gaming Themes + dark/light | ✓ | ✓ (localStorage) | – | – | Simpan akaun: Firestore |
| Scene & Source Manager | ✓ | ✓ (localStorage) | – | – | Simpan cloud: Firestore |
| Webcam / kamera USB | ✓ | ✓ | Kamera | Kamera | – |
| Screen / Gameplay capture (PC) | ✓ | ✓ | Screen share | – | – |
| HDMI / capture card | ✓ | ✓ | Kamera | Capture card | – |
| Mikrofon (USB, headset, built-in, interface) | ✓ | ✓ | Mikrofon | Mic / interface | – |
| XLR condenser | ✓ (panduan + input) | ✓ | Mikrofon | Audio interface + 48V | – |
| Audio Mixer + meter sebenar | ✓ | ✓ | – | – | – |
| NS / EC / AGC | ✓ | ✓ jika browser sokong | Mikrofon | – | – |
| Voice Enhancement (Web Audio) | ✓ | ✓ | – | – | – |
| Rakaman video / audio (MediaRecorder) | ✓ | ✓ | – | – | Simpan cloud: Storage |
| Phone camera / mic wireless (WebRTC) | ✓ | – | Telefon: kamera/mic | Telefon | Firestore (signaling), TURN untuk mobile data |
| Phone gameplay wireless | ✓ | – | – | – | Kebanyakan telefon **UNSUPPORTED** (tiada screen capture di browser mobile) |
| Streaming LIVE | ✓ | ✓ jika ada WHIP gateway | – | – | Media gateway WHIP→RTMP (bukan Firebase) |
| TikTok / YouTube / Facebook connect | ✓ | – | – | – | Cloud Functions + app developer platform |
| AI Stream Creator | ✓ | – | – | – | Cloud Functions + API key (Anthropic / OpenAI) |
| Community | ✓ | – | – | – | Firestore + Functions (kiraan & notifikasi) |
| Admin Panel (aplikasi berasingan `?panel=admin`) | ✓ | – | – | – | Custom claim `admin` + Functions |
| Kill Popup (dalam siaran & rakaman) | ✓ | ✓ manual / hotkey | – | – | Auto: webhook (Functions) |
| Game Connect auto (CS2, Dota 2) | ✓ | – | – | – | Functions + config GSI dalam game |
| Game Connect (League of Legends) | ✓ | – | – | PC gaming jalankan bridge | Functions + `tools/game-bridge.mjs` |
| Valorant, MLBB, PUBG M, Free Fire, CODM, Fortnite, Apex | ✓ | ✓ manual | – | Telefon kedua (Kill Remote) / Stream Deck | **Tiada API kill rasmi**: manual sahaja |
| QR Donation pada skrin live | ✓ | ✓ | – | – | – |
| Halaman live awam + butang DONATE (popup) | ✓ | – | – | – | Firestore (`publicPages`) |
| Live Chat YouTube / Facebook (pop-out, skrin kedua, always-on-top) | ✓ | – | Window management (pilihan) | Skrin kedua (pilihan) | Functions + platform disambung |
| Live Chat TikTok | – | – | – | – | **Unsupported**: tiada API rasmi |

---

## 1. Struktur fail

```
sites/streamverse/
  index.html              # SELURUH frontend studio pengguna (HTML+CSS+JS)
  admin.html              # Admin Panel (fail sama dengan index.html, kecuali APP_MODE = "admin")
  firebase.json           # Hosting, rules, functions, rewrites /oauth/callback
  firestore.rules         # Security Rules Firestore
  firestore.indexes.json  # Index collection group (feed, carian game, pairing)
  storage.rules           # Security Rules Storage (saiz + jenis fail)
  functions/
    index.js              # Cloud Functions (AI, OAuth, admin, triggers, TURN, cleanup)
    package.json
    .env.example          # APP_URL, ENFORCE_APP_CHECK
    scripts/set-admin.js  # Lantik admin pertama
  tools/
    game-bridge.mjs       # Relay GSI + bridge League of Legends (jalan di PC gaming)
```

## 2. Firebase Configuration

1. Cipta projek di <https://console.firebase.google.com>.
2. **Upgrade ke pelan Blaze.** Cloud Functions, Secret Manager dan scheduler perlukan billing. Kos bergantung kepada penggunaan; tetapkan *budget alert* di Google Cloud Billing. Panggilan AI (Anthropic/OpenAI) dan API platform dicaj berasingan oleh provider masing-masing.
3. Project settings → *Your apps* → tambah **Web app** → salin config.
4. Dalam `index.html`, isi:
   ```js
   const FIREBASE_CONFIG = { apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." };
   const FUNCTIONS_REGION = "asia-southeast1"; // mesti sama dengan functions/index.js
   ```
   Firebase web config **bukan rahsia**. Keselamatan dijaga oleh Security Rules dan App Check. API key pihak ketiga **tidak pernah** diletak dalam frontend.

## 3. Firebase Authentication Setup

- Authentication → Sign-in method → aktifkan **Email/Password** sahaja (tiada Google/Facebook/social login).
- Authentication → Settings → *Authorized domains*: tambah domain hosting anda.
- Templates → *Action URL*: biarkan default, atau tetapkan `https://DOMAIN/` (app mengendalikan `?mode=verifyEmail|resetPassword&oobCode=`).
- Aliran kerja: Register (email + password + confirm), lalu email verification. Dashboard hanya dibuka bila `emailVerified == true`. Forgot Password menghantar link, dan halaman reset dalam app memanggil `confirmPasswordReset`. Password tidak pernah disimpan dalam Firestore. Session kekal melalui `browserLocalPersistence`.

## 4. Firestore Database Structure

```
users/{uid}                              # email, createdAt, lastLoginAt (peribadi)
  settings/preferences                   # theme, mode, activeSceneId
  scenes/{sceneId}                       # name, template, order, sources[] (metadata source + layout + deviceId), ownerUid
  streamSettings/{tiktok|youtube|facebook}  # title, description, category, privacy, schedule, destination
  recordings/{recId}                     # metadata; fail sebenar di Storage
  activity/{id}                          # log aktiviti streamer
  pairings/{CODE}                        # signaling WebRTC: offer/answer, status, expiresAt
    offerCandidates/{id}, answerCandidates/{id}
  platformConnections/{platform}         # status disahkan (DITULIS OLEH FUNCTIONS SAHAJA)
  aiAssets/{id}                          # hasil AI (ditulis Functions)
  notifications/{id}                     # ditulis Functions; pengguna hanya boleh tanda read
  following/{targetUid}, followers/{uid}
  communityPosts/{postId}
    likes/{uid}, comments/{id}
  themes/{id}, sources/{id}, audioSettings/{id}, devices/{id}   # disediakan untuk sambungan masa depan
profiles/{uid}                           # profil awam gamer (username, bio, interests, favouriteGames, photoURL, kiraan)
usernames/{usernameLower}                # keunikan username
groups/{gid}  + members/{uid}
reports/{id}, announcements/{id}, config/{themes|platforms|ai}, systemLogs/{id}
aiUsage/{uid_date}                        # had harian AI (Functions sahaja)
_private/...                              # token OAuth disulitkan AES-256-GCM, state OAuth (tiada akses klien)
```

Audio/video mentah **tidak pernah** disimpan dalam Firestore. Rakaman hanya ke Storage bila pengguna tanda persetujuan.

## 5–6. Security Rules

- `firestore.rules`: semua akses perlukan login dan email disahkan. Owner UID disemak pada setiap laluan `users/{uid}`. Admin melalui `request.auth.token.admin`. Kiraan like/follow/member tidak boleh diubah klien. `platformConnections`, `aiAssets` dan `notifications` (create) hanya oleh Functions. Tiada `allow read, write: if true`.
- `storage.rules`: avatar ≤ 2 MB (png/jpeg/webp), overlay ≤ 5 MB, rakaman video ≤ 1 GB (webm/mp4) / audio ≤ 200 MB, folder `ai/` hanya ditulis Functions, selain itu ditolak.
- Rate limiting: AI dihadkan per pengguna/hari dalam Functions (`config/ai.dailyLimit`).

Deploy: `firebase deploy --only firestore:rules,firestore:indexes,storage`

## 7. Cloud Functions

```bash
npm i -g firebase-tools
firebase login
cd sites/streamverse
firebase use --add            # pilih projek
cp functions/.env.example functions/.env   # isi APP_URL=https://PROJECT.web.app
cd functions && npm install && cd ..
firebase deploy --only functions
```

**Secret Manager** (dibaca pada runtime; kalau tiada, ciri berkaitan tunjuk "Not Configured"):

```bash
# Wajib untuk platform connect (32 bait rawak):
openssl rand -base64 32 | firebase functions:secrets:set TOKEN_ENC_KEY --data-file=-
# AI
firebase functions:secrets:set ANTHROPIC_API_KEY     # teks (Claude)
firebase functions:secrets:set OPENAI_API_KEY        # imej (gpt-image-1) / teks alternatif
# Platform
firebase functions:secrets:set YOUTUBE_CLIENT_ID
firebase functions:secrets:set YOUTUBE_CLIENT_SECRET
firebase functions:secrets:set META_APP_ID
firebase functions:secrets:set META_APP_SECRET
firebase functions:secrets:set TIKTOK_CLIENT_KEY
firebase functions:secrets:set TIKTOK_CLIENT_SECRET
# TURN (untuk mobile data / NAT ketat)
firebase functions:secrets:set TURN_URLS          # cth: turn:turn.example.com:3478,turns:turn.example.com:5349
firebase functions:secrets:set TURN_USERNAME
firebase functions:secrets:set TURN_CREDENTIAL
```

Beri service account Functions akses membaca secret:
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Senarai fungsi: `gameHookCreate`, `gameHookRevoke`, `gameEvent` (HTTP, via Hosting `/hook/game/**`), `platformChatPoll`, `cleanupGameEvents`, `getIceServers`, `aiProviderStatus`, `aiGenerateText`, `aiGenerateImage`, `platformAuthUrl`, `oauthCallback` (HTTP, via Hosting `/oauth/callback`), `platformVerify`, `platformDisconnect`, `platformCreateLive`, `adminListUsers`, `adminSetRole`, `adminSetDisabled`, `adminSystemStatus`, trigger community (`onLike*`, `onComment*`, `onFollow*`, `onMember*`), `cleanupPairings` (setiap 30 minit).

**Admin pertama:**
```bash
gcloud auth application-default login
cd functions && GOOGLE_CLOUD_PROJECT=PROJECT_ID node scripts/set-admin.js anda@email.com
```
Log keluar dan masuk semula untuk dapat token baru. Admin **tidak** ditentukan berdasarkan email di frontend.

## 8. Firebase Hosting Deployment

```bash
cd sites/streamverse
firebase deploy --only hosting
```
`firebase.json` menetapkan header `Permissions-Policy` (camera/microphone/display-capture), rewrite SPA, dan `/oauth/callback` ke function. HTTPS diberikan automatik (wajib untuk kamera, mic, screen capture dan WebRTC).

**CORS Storage** (perlu untuk overlay gambar/imej AI dilukis pada canvas tanpa "tainted canvas"):
```bash
echo '[{"origin":["https://PROJECT.web.app","https://PROJECT.firebaseapp.com"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json
gsutil cors set cors.json gs://PROJECT.appspot.com
```

**App Check:** Firebase Console → App Check → daftar web app dengan reCAPTCHA v3 → isi `APP_CHECK_SITE_KEY` dalam `index.html` → set `ENFORCE_APP_CHECK=true` dalam `functions/.env` dan aktifkan *enforcement* untuk Firestore/Storage selepas metrik menunjukkan trafik sah.

## 9. Platform API Integration

Redirect URI untuk semua platform: `https://DOMAIN/oauth/callback` (sama dengan `APP_URL`).

- **YouTube Gaming:** Google Cloud Console → aktifkan *YouTube Data API v3* → OAuth consent screen → OAuth Client (Web) → masukkan redirect URI. Scope `youtube`. Saluran perlu live streaming diaktifkan (verifikasi + 24 jam). `platformCreateLive` mencipta `liveBroadcast` + `liveStream` + bind, kemudian memulangkan RTMP ingest URL dan stream key (dipaparkan sekali, tidak disimpan).
- **Facebook Gaming:** developers.facebook.com → app jenis Business → Facebook Login → redirect URI. Kebenaran `pages_show_list, pages_read_engagement, pages_manage_posts, publish_video` memerlukan **App Review**. Live melalui API untuk **Facebook Page**. Function memulangkan `secure_stream_url` (dipisah jadi URL + key).
- **TikTok LIVE:** developers.tiktok.com → Login Kit (`user.info.basic`). Ini hanya mengesahkan akaun. **TikTok tidak menyediakan LIVE API umum**, jadi status dipaparkan sebagai *Access Restricted*. Stream key hanya untuk akaun layak melalui TikTok LIVE Studio / LIVE Center, dan dimasukkan pada media gateway.
- Token disimpan **disulitkan (AES-256-GCM)** dalam `_private/platformTokens` (tiada akses klien), kunci di Secret Manager. Status "Connected" hanya ditulis selepas panggilan API pengesahan berjaya.

### Streaming output (penting)
Browser **tidak boleh** menghantar RTMP. STREAMVERSE menghantar canvas + audio mixer melalui **WHIP (WebRTC-HTTP Ingestion)** ke media gateway yang menyokong WHIP dan restream RTMP, contohnya Cloudflare Stream Live (WHIP + Live Outputs ke YouTube/Facebook/TikTok), Dolby.io, OvenMediaEngine atau MediaMTX (self-host perlukan server, bukan VPS di sini). Masukkan WHIP URL + token dalam *Capture Studio → Stream Output*. Token hanya dalam memori. Status LIVE hanya bila `RTCPeerConnection.connectionState === "connected"`. Firebase Functions bukan encoder/media server.

## 10. Camera Connection
`enumerateDevices()` untuk senarai, `getUserMedia({ video: { deviceId: { exact }, width, height, frameRate } })` untuk sambung. Resolution/frame rate guna `ideal`, dan nilai sebenar (`track.getSettings()`) dipaparkan. Mirror, posisi (preset layout) dan saiz dikawal per source. Smartphone sebagai kamera: Pair Phone Camera (companion WebRTC) atau Continuity Camera (iPhone + macOS) yang muncul sebagai kamera biasa.

## 11. Gameplay Capture
- PC yang sama: `getDisplayMedia({ video, audio })`. Game audio hanya jika pengguna tanda *Share audio* (audio sistem: Chrome/Edge Windows/ChromeOS; macOS hanya tab).
- Konsol / telefon / PC lain: melalui capture card (lihat 13).
- Compositor: canvas (resolusi output 480p/720p/1080p, 24/30/60fps) melukis source ikut susunan layer. Timer dalam Web Worker supaya rakaman tidak perlahan bila tab di latar.

## 12. Wireless Device Connection
Method A (Wi-Fi sama) dan Method B (internet/mobile data) guna aliran yang sama:
1. Studio cipta `users/{uid}/pairings/{CODE}` (tamat 10 minit) dan papar QR + kod.
2. Telefon buka `https://DOMAIN/?pair=CODE&kind=video|audio|screen`, log masuk **akaun sama**, tekan Start.
3. Telefon `getUserMedia`, cipta offer, tulis ke Firestore. ICE candidates ke `offerCandidates`.
4. Studio jawab (answer + `answerCandidates`). Media mengalir peer-to-peer (DTLS-SRTP).
5. Wi-Fi sama biasanya terus. Mobile data / CGNAT perlukan **TURN** (`TURN_*` secrets, contohnya Cloudflare Calls TURN, Twilio NTS, atau coturn).
Browser tidak mengimbas LAN; pairing hanya melalui kod. HTTPS wajib.

## 13. HDMI Capture Setup
```
Gaming Device HDMI OUT → Capture Card HDMI IN → Capture Card USB → Laptop/PC
Capture Card HDMI OUT (pass-through) → Monitor / TV
```
- iPhone: Lightning Digital AV Adapter / USB-C to HDMI (iPhone 15+).
- Android: USB-C to HDMI hanya jika telefon sokong DisplayPort Alt Mode. **Banyak telefon tidak menyokongnya.**
- PC/Laptop: HDMI atau DisplayPort (adapter DP→HDMI) ke capture card.
Capture card (UVC) muncul sebagai video input. Gunakan *Detect Capture Devices* lalu *Add as Capture Card*, dan pilih audio HDMI (audio input berasingan) dalam Source Settings. Kandungan HDCP akan jadi skrin hitam.

## 14. Microphone Connection
`getUserMedia({ audio: { deviceId: { exact }, echoCancellation, noiseSuppression, autoGainControl } })`. Mic tidak diaktifkan automatik; hanya selepas pengguna tekan Connect. "Connected" hanya bila ada track audio sebenar. Meter guna `AnalyserNode` (RMS dBFS). Audio Test merakam 5 saat dan memainkannya semula. Jenis peranti diteka dari label (USB, interface, Bluetooth, headset) sebagai petunjuk sahaja.

## 15. Condenser Microphone Setup
- USB condenser: terus ke PC, tiada 48V.
- XLR condenser: XLR cable → audio interface / sound card luaran (hidupkan **48V pada interface hanya jika mic memerlukannya**) → USB → PC. Pilih jenis input *Audio Interface / XLR* untuk matikan NS/EC/AGC.
- Browser tidak boleh dan tidak akan mengawal phantom power.

## 16. Audio Mixer
Setiap channel: `MediaStreamSource → Input Gain → [Voice Enhancement: high-pass 85 Hz → presence +4 dB @3.2 kHz → compressor] → Delay (sync offset 0–2000 ms) → Fader (volume/mute) → Analyser → Route (scene aktif & visible) → Master → MediaStreamDestination`. Monitoring: Analyser → Monitor gain → speaker. Master output volume dalam Audio Studio. Audio source di luar scene aktif tidak masuk ke output.

## 17. Audio Recording
MediaRecorder pada output mixer atau satu channel. Format ikut `MediaRecorder.isTypeSupported` (WebM/Opus di Chrome/Firefox, MP4/AAC di Safari). MP3/WAV tidak dirakam secara native. Pause/Resume jika disokong. Download dibuat terus dari browser. Simpan ke Firebase Storage hanya selepas checkbox persetujuan.

## 18. WebRTC Companion Architecture
Lihat bahagian 12. Signaling = Firestore (dilindungi rules pemilik). STUN Google default + TURN pilihan dari `getIceServers`. Pairing lama dipadam oleh `cleanupPairings`.

## 19. Device Permission Handling
Permission diminta hanya atas tindakan pengguna. Status `navigator.permissions` (camera/microphone) dipaparkan: Granted / Denied / Permission Required. `devicechange` mengemas kini senarai secara automatik. Ralat `NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError` dan `SecurityError` diterjemah kepada mesej Bahasa Melayu dengan langkah penyelesaian.

## 20. Error Handling
Setiap tindakan async melalui `withBusy()` (loading state pada butang, toast success/error). Ralat Firebase/Functions dipetakan ke mesej jelas. Ciri yang tidak disokong tunjuk **SUPPORTED / UNSUPPORTED / PERMISSION REQUIRED / DEVICE NOT CONNECTED / FIREBASE NOT CONFIGURED**. Track `ended` (cabut peranti / berhenti kongsi) mengemas kini status serta-merta. `beforeunload` memberi amaran jika rakaman/stream sedang berjalan.

## 21. Testing
1. **Tempatan tanpa Firebase:** `cd sites/streamverse && python3 -m http.server 8080`, buka `http://localhost:8080` (localhost dikira secure context). Tekan *Buka Studio Tempatan*, sambung webcam, mic dan screen capture, kemudian rakam dan semak di Recordings.
2. **Emulator:** `firebase emulators:start` (auth, firestore, storage, functions). Untuk guna emulator, tambah `connectAuthEmulator/connectFirestoreEmulator/...` sementara dalam `initFirebase()`.
3. **Rules:** uji dengan Rules Playground atau `@firebase/rules-unit-testing`. Pastikan pengguna A tidak boleh baca `users/B/...`.
4. **Pairing:** deploy ke Hosting (HTTPS), buka studio di PC, imbas QR dengan telefon (Wi-Fi sama), kemudian uji dengan mobile data (perlukan TURN).
5. **Peranti:** uji USB mic, audio interface (48V di hardware), capture card. Semak meter bergerak hanya bila ada bunyi.
6. **Browser:** Chrome/Edge (sokongan penuh), Firefox (tiada audio screen share), Safari (MP4, sokongan getDisplayMedia terhad).
7. Responsif: 375 / 768 / 1440 px.

## 21a. Panel Admin berasingan
Admin Panel ialah aplikasi berasingan dalam fail yang sama: `https://DOMAIN/?panel=admin`, dengan topbar, sidebar dan aksen tersendiri. Studio pengguna tidak memuatkan admin. Butang "Admin Panel" (hanya untuk admin) membuka tab baru. Akses disemak oleh custom claim `admin` di frontend, Security Rules dan setiap Cloud Function admin. Pengguna biasa nampak "Akses ditolak". Seksyen: Users, Community, Donation Pages (nyahaktif halaman yang menyalahgunakan link), Reports, Announcements, Themes, Platform Settings, AI Provider, System Logs, System Status.

## 21b. Kill Popup & Game Connect
- Popup dilukis pada canvas output, jadi ia **masuk ke siaran dan rakaman**. Tambah source **Kill Popup** (templat Gaming / Mobile Gaming sudah ada). Tetapan: label streak, tempoh, tempoh streak, bunyi (masuk mixer), papar senjata/mangsa.
- **Manual (semua game):** butang KILL, hotkey `K` / `H` (headshot) bila STREAMVERSE difokus, **Kill Remote** (`?remote=kill`) di telefon/tablet kedua, atau Stream Deck → Webhook.
- **Webhook URL:** jana di Game Connect (`gameHookCreate`). URL ini rahsia (token 48 hex). Hosting rewrite `/hook/game/**` → function `gameEvent`.
- **CS2 / Dota 2:** salin config dari butang Setup ke folder `cfg` (Dota 2 perlu `-gamestateintegration`). Function membandingkan `match_stats.kills` / `player.kills` dengan keadaan sebelumnya; kill semasa spectate diabaikan. Jika game tidak menghantar ke HTTPS di PC anda, guna relay: `node tools/game-bridge.mjs --forward URL` dan tukar `uri` kepada `http://127.0.0.1:3000/`.
- **League of Legends:** `node tools/game-bridge.mjs --lol --forward URL` di PC gaming (membaca Live Client Data API rasmi pada `127.0.0.1:2999`).
- **Webhook umum:** `POST URL` dengan `{"type":"kill","game":"mlbb","headshot":false,"weapon":"","victim":"","streak":0}`.
- Game tanpa API rasmi (Valorant, MLBB, PUBG Mobile, Free Fire, CODM, Fortnite, Apex) dilabel **Manual sahaja**. Pengesanan OCR skrin tidak disediakan.
- `gameEvents` lama dipadam oleh `cleanupGameEvents`.

## 21c. Donation (Sociabuzz dan lain-lain)
- Streamer tambah sehingga 8 link: Sociabuzz, Saweria, Trakteer, Ko-fi, PayPal, Buy Me a Coffee atau link lain (mesti `https://`, domain disemak ikut jenis).
- **Dalam app TikTok/YouTube/Facebook, video live tidak boleh ada butang yang boleh diklik.** Jadi viewer donate terus dari paparan live melalui:
  1. **QR Donation** (source overlay) dilukis pada siaran. Viewer imbas QR dari skrin dan terus ke halaman Sociabuzz. Mod: sentiasa atau berkala.
  2. **Halaman Live awam** `https://DOMAIN/?live=<username>`: siaran YouTube terbenam (Channel ID), butang **DONATE** terapung di atas video yang membuka popup senarai link + QR, serta butang "Tonton di TikTok/YouTube". Status LIVE hanya bila stream STREAMVERSE benar-benar connected.
- Letak link halaman live dalam pinned comment / description. Pembayaran diproses sepenuhnya oleh platform donation; STREAMVERSE tidak menyentuh wang atau data kad.
- Data di `publicPages/{uid}` (baca awam, tulis pemilik; admin boleh nyahaktif).

## 21d. Live Chat (pop-out & skrin kedua)
- YouTube: `liveBroadcasts?broadcastStatus=active` → `liveChatId` → `liveChat/messages` (ikut `pollingIntervalMillis`, min 5 s). Super Chat ditonjolkan. Kuota YouTube Data API ~10,000 unit/hari; minta tambahan kuota jika live lama.
- Facebook: live video aktif pada Page → `/{live_video_id}/comments?live_filter=no_filter` setiap 4 s.
- TikTok: **tiada API rasmi** untuk membaca komen LIVE. Guna tetingkap komen TikTok LIVE Studio.
- **Pop-out (skrin kedua):** membuka `?panel=chat` dalam tetingkap berasingan. Jika browser menyokong Window Management API (Chrome/Edge) dan permission diberi, tetingkap terus diletak pada skrin kedua; jika tidak, seret sendiri. Bila pop-out aktif, panel dalam app berhenti (BroadcastChannel) supaya tidak poll dua kali.
- **Always on top:** Document Picture-in-Picture (Chrome/Edge 116+ desktop). Chat terapung di atas game/OBS.
- Saiz teks boleh dibesarkan (14–44 px) dan ditapis ikut platform.

## 22. Production Deployment Checklist
- [ ] Pelan Blaze + budget alert
- [ ] `FIREBASE_CONFIG` diisi, Authorized domains ditetapkan
- [ ] `firebase deploy` (hosting, rules, indexes, storage, functions)
- [ ] Secrets ditetapkan + IAM `secretAccessor`
- [ ] `functions/.env` APP_URL betul
- [ ] Storage CORS
- [ ] App Check didaftar dan enforcement diaktifkan
- [ ] Admin pertama dilantik
- [ ] OAuth apps platform lulus review (Meta App Review, Google verification untuk scope YouTube)
- [ ] Media gateway WHIP disediakan untuk streaming
- [ ] TURN server untuk pengguna mobile data
