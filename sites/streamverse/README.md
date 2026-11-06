# STREAMVERSE (mod percuma)

**LEVEL UP YOUR STREAM. BUILD YOUR LEGACY.**

Platform all-in-one untuk gamer, livestreamer dan content creator. Frontend ialah satu fail `index.html` (HTML + CSS + JavaScript Vanilla). Panel admin ialah `admin.html` (fail yang sama, `APP_MODE = "admin"`).

**Tiada bayaran, tiada VPS, tiada pelan Blaze.** Hanya Firebase pelan percuma (Spark): Authentication, Firestore dan Hosting. Tiada Cloud Functions, tiada Storage.

---

## 1. Status sambungan

| Perkara | Status |
|---|---|
| Projek Firebase | **GENIUS DIGITAL** (`genius-digital-40bc9`), app web **STREAMVERSE GAMING** |
| `FIREBASE_CONFIG` | Sudah diisi dalam `index.html` dan `admin.html` |
| Authentication | Email/Password (dikongsi dengan app lain dalam projek) |
| Firestore `(default)` | Rules Streamverse **sudah digabung** dalam rules projek. Indexes sudah dideploy |
| Hosting | Perlu **Site ID** khas Streamverse. Site default `genius-digital-40bc9` menyiarkan Fetchr Box, **jangan deploy ke situ** |
| Cloud Functions / Storage | Tidak digunakan (`FUNCTIONS_ENABLED = false`, `STORAGE_ENABLED = false`) |

> **Rules Firestore dikongsi 4 app** (Genius Digital, PDF Tools, Fetchr Box, Streamverse). `firebase.json` sengaja tidak merujuk `firestore.rules`. Fail itu rujukan sahaja; mendeploynya terus akan menimpa app lain. Ubah rules melalui Firebase Console.

## 2. Apa yang berfungsi percuma, dan bagaimana

| Ciri | Cara percuma |
|---|---|
| Kamera, mic, capture card, screen capture, mixer, rakaman | Terus dalam browser (permission pengguna) |
| Log masuk, scene, tema, community, donation, halaman live | Firebase Auth + Firestore (had percuma: 50K bacaan / 20K tulisan sehari) |
| **YouTube connect** | Google Identity Services terus dari browser (tiada server). Token dalam memori sahaja |
| **Facebook connect** | Facebook JS SDK + Graph API terus dari browser. Token dalam memori sahaja |
| TikTok | **Tiada log masuk terus** (TikTok tiada API LIVE untuk web app). Guna stream key dari TikTok LIVE Studio |
| Create Live Session (RTMP URL + stream key) | YouTube Data API / Graph API terus dari browser |
| Live chat YouTube / Facebook | Dibaca terus dari browser. Pop-out skrin kedua menerima komen melalui BroadcastChannel |
| Siaran ke platform | **OBS Studio** (percuma): buka *Program Output*, tangkap dengan Window Capture, tampal RTMP URL + key |
| Kill popup | Butang, hotkey K / H, Kill Remote (telefon), atau **Game Bridge** (skrip Node percuma di PC) |
| AI Creator (teks dan imej) | Pollinations terus dari browser, tanpa API key |
| Pairing telefon (kamera / mic) | WebRTC + signaling melalui Firestore + STUN percuma. TURN pilihan di Settings |
| Admin | `admin.html`, custom claim `admin` |

## 3. Setup sekali sahaja

### 3.1 Hosting (Site ID)
1. Firebase Console → Hosting → *Add another site* (jika belum ada site khas). Sambungkan domain anda ke site itu.
2. Dalam `firebase.json`, tukar `"site": "GANTI-DENGAN-SITE-ID-STREAMVERSE"` kepada Site ID sebenar.
3. `firebase deploy --only hosting` (dalam folder ini). Admin di `https://DOMAIN/admin`.
4. Authentication → Settings → **Authorized domains**: pastikan domain itu ada.

### 3.2 Client ID untuk YouTube / Facebook (percuma)
Google dan Meta mewajibkan web app didaftarkan. Client ID / App ID **bukan rahsia**. Admin tetapkan sekali di **Admin → Platform Settings**, kemudian semua streamer terus klik *Connect*.
- **YouTube:** console.cloud.google.com → aktifkan *YouTube Data API v3* → OAuth consent screen (External; tambah Test users) → Credentials → OAuth client ID (Web) → Authorized JavaScript origins = domain anda → salin Client ID. Skop YouTube ialah skop sensitif: sebelum disahkan Google, skrin "app belum disahkan" muncul dan hanya Test users (maks 100) boleh log masuk.
- **Facebook:** developers.facebook.com → Create App (Business) → Facebook Login → aktifkan *Login with the JavaScript SDK* dan letak domain anda di *Allowed Domains* → salin App ID. Mod Development: hanya admin / tester app. Untuk umum: App Review (pages_manage_posts, publish_video).
- Tanpa admin, streamer juga boleh tampal ID sendiri di StreamVerse Connect → *Setup Client ID* (disimpan dalam browser sahaja).

### 3.3 Admin
Akaun admin = akaun dengan custom claim `admin` (claim ini dikongsi dengan app lain dalam projek). Jika perlu lantik akaun baharu (percuma):
```bash
cd tools && npm i firebase-admin
gcloud auth application-default login
GOOGLE_CLOUD_PROJECT=genius-digital-40bc9 node set-admin.js email@anda.com
```
Log keluar dan masuk semula. Akaun admin tidak disekat pengesahan email di `admin.html`. Menyahaktif akaun dibuat di Firebase Console → Authentication.

### 3.4 Game Bridge (kill popup automatik)
1. Pasang Node.js 18+ (percuma).
2. Dalam STREAMVERSE → *Game Connect & Kill* → muat turun skrip (atau guna `tools/game-bridge.mjs`).
3. `node game-bridge.mjs` (tambah `--lol` untuk League of Legends). Tekan *Connect Bridge*.
4. CS2 / Dota 2: ikut butang *Setup* (config GSI, `uri` = `http://127.0.0.1:3000/`).
5. Stream Deck / skrip: `POST http://127.0.0.1:3000/kill` dengan `{"type":"kill","game":"mlbb"}`.

Game tanpa API rasmi (Valorant, MLBB, PUBG Mobile, Free Fire, CODM, Fortnite, Apex) hanya manual: butang, hotkey, Kill Remote atau Stream Deck. Chrome / Edge / Firefox membenarkan laman HTTPS bercakap dengan `127.0.0.1`; Safari menyekatnya.

## 4. Had sebenar mod percuma

- **Token YouTube / Facebook** tamat selepas ±1–2 jam; tekan *Connect semula*. Tidak disimpan di mana-mana.
- **Kuota YouTube API:** 10,000 unit/hari. Cipta live = ±150 unit. Chat dikemas kini setiap ±10 saat (±1,800 unit/jam), jadi cukup untuk beberapa jam siaran sehari.
- **AI percuma (Pollinations):** perkhidmatan pihak ketiga, boleh perlahan atau sibuk, dan ada had kadar (mesej "Had penggunaan percuma dicapai"). Ia menolak `localhost`; berfungsi dari domain sebenar. Prompt dihantar ke pollinations.ai.
- **Community:** like dan komen dikira terus dari Firestore. Kiraan followers, notifikasi automatik dan status akaun dalam senarai pengguna memerlukan backend, jadi tidak ada.
- **Rakaman:** Download sahaja (tiada Storage). Avatar disimpan sebagai thumbnail kecil dalam profil.
- **WHIP gateway** (sambungan terus tanpa OBS) kebanyakannya berbayar atau perlukan server sendiri; ia pilihan lanjutan sahaja.
- **TURN:** tanpa TURN, pairing telefon melalui data mudah alih mungkin gagal pada sesetengah operator. TURN percuma boleh ditampal di Settings.

## 5. Fail

```
index.html               # studio pengguna
admin.html               # panel admin (APP_MODE = "admin")
firebase.json            # hosting + indexes sahaja (tambah "site")
firestore.indexes.json   # index feed, carian game, announcements, halaman live
firestore.rules          # rujukan sahaja (JANGAN deploy terus)
tools/game-bridge.mjs    # Game Bridge (Node, percuma)
tools/set-admin.js       # lantik admin (percuma)
```
