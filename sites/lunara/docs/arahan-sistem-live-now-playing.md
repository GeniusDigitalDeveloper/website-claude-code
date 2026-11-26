ARAHAN UNTUK SISTEM LIVE (App Kawalan / OBS) - "LAGU SEDANG DIMAINKAN" DARI LUNARA MUSIC
======================================================================================

Salin SEMUA teks dalam kotak di bawah, tampal kepada Claude yang membina sistem live.

---------------------------------- MULA SALIN ----------------------------------
LUNARA MUSIC kini menerbitkan "lagu sedang dimainkan" secara PERCUMA (tanpa Cloud Function,
projek Firebase pelan Spark). Tiada alamat /api/now-playing. Sistem live perlu baca terus
satu dokumen Firestore melalui REST API Firestore. Tolong sesuaikan "Aplikasi lagu (API)" begini:

1. ALAMAT
   ALAMAT API (tetap):
     https://firestore.googleapis.com/v1/projects/genius-digital-40bc9/databases/(default)/documents/lunara_nowplaying
   URL sebenar = ALAMAT API + "/" + API_KEY
     contoh: .../documents/lunara_nowplaying/lnr_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   (API key format: "lnr_" + 40 huruf/nombor; pengguna salin dari LUNARA > Tetapan > API key.
    Tetapan > API key juga ada butang salin "alamat lagu sedang dimainkan" yang sudah lengkap.)
   Kaedah: GET. Tiada header diperlukan. Jangan log API key / URL penuh.

2. JAWAPAN
   200  JSON dokumen Firestore:
        {
          "name": ".../lunara_nowplaying/lnr_...",
          "fields": {
            "title":     { "stringValue": "Nama Lagu" },
            "artist":    { "stringValue": "Nama Artis / channel" },
            "isPlaying": { "booleanValue": true },
            "updatedAt": { "timestampValue": "2026-11-27T01:23:45.123Z" }
          },
          "updateTime": "..."
        }
        Ambil: title = fields.title.stringValue, artist = fields.artist.stringValue,
               isPlaying = fields.isPlaying.booleanValue, updatedAt = fields.updatedAt.timestampValue
   404  belum ada lagu untuk key ini (pengguna belum main lagu sejak jana key) ATAU key salah.
        Papar: "Tiada lagu / semak API key".
   403  format key salah (bukan "lnr_" + 40 aksara). Papar: "API key salah".
   Ralat rangkaian / 5xx: kekalkan paparan terakhir, cuba lagi.

3. PERATURAN
   - Jika isPlaying = true tetapi updatedAt lebih 10 minit lalu, anggap isPlaying = false
     (contoh telefon mati / app ditutup tanpa sempat kemas kini).
   - Tanya setiap 5 saat (jangan lebih kerap dari 2 saat). Firestore percuma: 50,000 bacaan sehari
     untuk seluruh projek; 5 saat = ~17,000 bacaan sehari jika live 24 jam.
   - Bila isPlaying = false: sorok / malapkan nama lagu di OBS.
   - Butang "Cuba": GET sekali; 200 -> "Berjaya. Lagu sekarang: <title> - <artist>";
     404 -> "Key sah tetapi tiada lagu lagi (main satu lagu di LUNARA dahulu) atau key salah";
     403 -> "API key salah".

4. CONTOH KOD (JavaScript)
   async function nowPlaying(apiKey) {
     const base = "https://firestore.googleapis.com/v1/projects/genius-digital-40bc9/databases/(default)/documents/lunara_nowplaying";
     const r = await fetch(`${base}/${encodeURIComponent(apiKey.trim())}`, { cache: "no-store" });
     if (r.status === 404) return { status: "empty" };
     if (r.status === 403) return { status: "badkey" };
     if (!r.ok) throw new Error(`HTTP ${r.status}`);
     const f = (await r.json()).fields ?? {};
     const updatedAt = f.updatedAt?.timestampValue ?? null;
     const stale = updatedAt && Date.now() - Date.parse(updatedAt) > 10 * 60_000;
     return {
       status: "ok",
       title: f.title?.stringValue ?? "",
       artist: f.artist?.stringValue ?? "",
       isPlaying: Boolean(f.isPlaying?.booleanValue) && !stale,
       updatedAt,
     };
   }

5. UJI
   curl "https://firestore.googleapis.com/v1/projects/genius-digital-40bc9/databases/(default)/documents/lunara_nowplaying/lnr_KEY_SAYA"
   mesti pulangkan nama lagu yang sedang main (selepas main satu lagu di LUNARA sambil log masuk).
---------------------------------- TAMAT SALIN ---------------------------------

SELEPAS SISTEM LIVE DIKEMAS KINI (di PC live):
  App Kawalan > Tetapan > "Aplikasi lagu (API)"
  ALAMAT API : https://firestore.googleapis.com/v1/projects/genius-digital-40bc9/databases/(default)/documents/lunara_nowplaying
  API KEY    : (tampal API key lnr_... dari LUNARA > Tetapan > API key)
  Tekan "Cuba" -> mesti keluar "Berjaya. Lagu sekarang: ..." -> tekan "Simpan".

Syarat di LUNARA: log masuk, dan sudah jana API key di Tetapan > API key.
Lagu yang dimainkan di mana-mana peranti (telefon, PC, TV) yang log masuk akaun sama akan dikemas kini.
