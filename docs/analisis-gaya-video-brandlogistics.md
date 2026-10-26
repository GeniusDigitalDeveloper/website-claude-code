# Analisis Gaya Video AI — @brandlogistics (TikTok)

Tarikh analisis: Isnin, 26 Oktober 2026 (waktu Malaysia)
Salinan yang sama disimpan dalam setiap repo GitHub ustaz. Tools yang disebut
(HyperFrames, `ctc_align.py`) ada dalam repo MUSIC-VIDEO.

Sumber: 9 video yang ustaz beri, dimuat turun dan dilihat frame demi frame (1 frame/saat),
serta data dari halaman setiap video (caption, tarikh, tontonan, like, save, share).

Tujuan dokumen ini bukan untuk tiru sebijik. Ia ialah **bank teknik**: apa yang dia buat,
kenapa ia berkesan, dan **bila** teknik itu sesuai (atau tak sesuai) untuk video ustaz.

---

## 1. Ringkasan: apa dia buat setiap video

Akaun ini ialah **showcase "video editing dengan AI"**. Hampir setiap video ada formula yang sama:

1. Ambil **klip podcast/temubual orang terkenal** (contoh dalam caption: Alex Hormozi, Iman Gadzhi,
   klip dari podcast Joe Rogan).
2. Letak **"RAW FOOTAGE"** (klip asal, kecil) di sebelah **"EDITED WITH ..."** (versi yang
   diedit, besar) dengan logo Claude.
3. Dalam versi edit, **setiap ayat penting jadi visual**: nombor beranimasi, objek 3D, kata kunci
   besar, ikon, mockup UI. Visual bertukar setiap 1–3 saat.
4. Caption mendakwa "seluruh video ini dibuat dengan Claude Code + Remotion, tanpa timeline editing".
5. CTA: "Comment KATA_KUNCI dan saya hantar prompt/workflow" (lead magnet ke DM).

Jadi yang dia jual sebenarnya ialah **kemahiran edit**, bukan isi podcast itu.
Bio "DM us to start earning online" bermaksud dia guna video ini untuk tarik orang ke DM.

---

## 2. Data 9 video

| # | Tarikh (MYT) | Tempoh | Tontonan | Like | Save | Share | Format | Topik klip |
|---|---|---|---|---|---|---|---|---|
| 1 | 30 Sep, Rab 20:22 | 36s | 337 | 10 | 10 | 1 | Host bertopeng kuning | "Jangan suruh AI buat cinematic, tunjuk rujukan" |
| 2 | 4 Okt, Ahd 03:03 | 25s | 310 | 2 | 1 | 1 | Host bertopeng putih + topi BL | "Claude buat motion design tanpa After Effects" |
| 3 | 9 Okt, Jum 21:34 | 32s | 967 | 24 | 14 | 6 | Before/After, kad menegak condong | Iman Gadzhi: peluang AI |
| 4 | 12 Okt, Isn 21:46 | 37s | 1,599 | 36 | 27 | 12 | Raw atas / Edited bawah | AI tulis surat aduan, 25 → 5 minit |
| 5 | 14 Okt, Rab 20:36 | 28s | 578 | 28 | 21 | 5 | Raw atas / Edited bawah | Alex Hormozi: 3 cara cari idea bisnes |
| 6 | 17 Okt, Sab 07:08 | 24s | 846 | 26 | 9 | 5 | Raw kiri / Edited kanan (menegak) | Motivasi "No tomorrow" (podcast Joe Rogan) |
| 7 | 21 Okt, Rab 17:31 | 27s | 757 | 29 | 13 | 4 | Raw atas / Edited bawah | 10,000 bisnes dijual setiap hari, Acquire atau Automate |
| 8 | **21 Okt, Rab 22:18** | 25s | **53,600** | **3,374** | **2,061** | **443** | Raw atas / Edited bawah | Fokus: Signal vs Noise, 3 perkara sehari |
| 9 | 26 Okt, Isn 14:41 | 29s | 338* | 24 | 12 | 1 | Raw atas / Edited bawah | "Know your numbers", margin, break-even |

\* Video 9 baru dipost beberapa jam sebelum analisis.

Pemerhatian:

- **Dua fasa akaun.** Fasa 1 (30 Sep – 4 Okt): host faceless bertopeng bercakap ke kamera, teks
  tebal kuning/putih, muzik hip-hop dari library. Tontonan ~300. Fasa 2 (9 Okt dan seterusnya):
  format "Raw vs Edited" dengan klip orang terkenal dan bunyi asal. Tontonan naik ke 600–1,600, dan
  satu video meletup (53.6K).
- **Semua video 24–37 saat.** Tiada video panjang.
- Video 8 ada **kadar save 3.8%** (2,061 / 53,600) dan share 443. Orang simpan video itu sebagai
  rujukan atau inspirasi. Ini tanda kandungan "nak buat macam ni juga", bukan sekadar hiburan.

### Kenapa video 8 meletup (tafsiran, bukan pasti)

Format video 7 dan 8 sama, dan kedua-duanya dipost hari yang sama. Video 7 dapat 757, video 8 dapat 53.6K. Beza yang nampak:

- **Topik universal:** fokus, produktiviti, "3 perkara sehari". Ia lebih luas daripada topik beli bisnes.
- **Visual lebih "wow" dan lebih kerap:** pembilang tahun 1452 → 2026, mentol 3D "the geniuses
  of their time", meter kelajuan 55% → 100% SIGNAL, telefon dengan gelombang SIGNAL vs NOISE,
  jam loceng dengan cincin progres 6 → 18 HOURS, papan klip yang ditanda satu demi satu "2/3 DONE".
  Setiap 2 saat ada objek baru.
- **Hook caption berbentuk soalan cabar:** "Would you believe this was made with code?"
  Soalan begini mengundang komen.
- Selebihnya faktor algoritma yang tak boleh dikawal.

---

## 3. Bank teknik (14 teknik)

Untuk setiap teknik: **apa**, **contoh dalam video dia**, **bila sesuai untuk ustaz**,
**bila jangan guna**, dan **cara bina** (dengan HyperFrames/HTML yang sudah ada dalam repo MUSIC-VIDEO).

### T1. Bingkai perbandingan "Raw vs Edited"

- **Apa:** dua kad atas latar kabur hijau-teal (bilik kabur dengan cahaya lembut). Klip asal
  kecil berlabel pil hitam "RAW FOOTAGE". Versi edit besar berlabel "EDITED WITH ..." dengan logo Claude.
- **Dua susun atur:**
  - (a) **Atas-bawah**: raw 16:9 kecil di atas, edit 16:9 besar di bawah (video 4, 5, 7, 8, 9).
  - (b) **Kiri-kanan menegak**: raw 9:16 kecil dan condong 3D di kiri, edit 9:16 tegak di kanan
    (video 3 dan 6). Label "BEFORE/AFTER" atau "RAW FOOTAGE/EDITED".
- **Sesuai untuk ustaz:** hanya untuk **siri belakang tabir**, contohnya "Video ni dibuat dengan Claude", "Sebelum &
  selepas edit", atau kalau ustaz nak tunjuk/jual khidmat edit. Juga sesuai untuk **membandingkan**
  apa-apa dua keadaan, contohnya "solat tergesa-gesa vs solat khusyuk" atau "rumah sebelum & selepas program".
- **Jangan guna:** dalam tazkirah atau ceramah biasa. Audiens ustaz datang untuk isi, bukan untuk tengok
  teknik edit. Bingkai ini juga mengecilkan video utama.
- **Cara bina:** komposisi 1080x1920, latar = frame video asal yang diblur kuat + vignette.
  Dua `<video>` dalam kad `border-radius: 24px` dengan bayang lembut. Label = pil hitam teks putih
  tebal. Kad condong: `transform: perspective(1200px) rotateY(18deg)`.

### T2. Metafora visual literal (perkataan → objek)

- **Apa:** setiap kata nama atau konsep yang disebut terus jadi objek 3D bergaya produk premium.
- **Contoh:** "geniuses" → mentol kaca; "signal" → meter kelajuan; "18 hours awake" → jam loceng;
  "3 things to get done" → papan klip checklist; "acquire" → kunci antik; "automate" → laptop;
  "time" → jam poket; "no time" → buah catur raja; "letters of complaint" → kertas bertimbun;
  "deal" → sijil bercop dalam kotak hijau.
- **Sesuai untuk ustaz:** **paling berguna** untuk klip tazkirah atau ceramah. Contoh:
  - "Sedekah" → syiling jatuh ke tabung; "masa" → jam pasir; "hati" → hati kaca yang retak/bercahaya;
    "solat 5 waktu" → 5 titik di garis masa matahari; "Al-Quran" → mushaf terbuka bercahaya;
    "dunia sementara" → glob kaca yang pudar; "kubur" → batu nisan ringkas (dengan sopan).
- **Jangan guna:** untuk menggambarkan Allah, para nabi, malaikat atau sahabat. Guna kaligrafi atau
  teks sahaja. Elakkan juga objek lucu bila topik serius (kematian, musibah).
- **Cara bina:** jana objek sekali sebagai PNG lutsinar (gambar AI atau ikon 3D), simpan dalam
  `assets/props/`. Animasikan secara 2.5D dengan GSAP: masuk dengan `scale 0.8→1` + `y 40→0` +
  `rotateY` kecil, terapung perlahan (`y ±6px` berulang), dan bayang elips di bawah.

### T3. Nombor beranimasi (counter, meter, cincin progres)

- **Apa:** setiap nombor yang disebut dikira naik/turun di skrin, selalunya dengan alat visual.
- **Contoh:** tahun 1452 → 2026; meter 55% → 100%; cincin jam 6 → 18 HOURS; 10 → 10,000;
  jam 25 → 5 MINUTES dengan teks "80% LESS TIME"; kalendar dengan X merah ditanda satu demi satu.
- **Sesuai untuk ustaz:** fakta dan statistik dalam ceramah ("70 kali istighfar", "1/3 malam
  terakhir", "pahala 27 kali ganda"), video infografik, promosi (jumlah hadiah, baki hari, bilangan
  peserta cabutan bertuah), dan laporan program (jumlah anak yatim dibantu).
- **Jangan guna:** pada nombor yang tak penting. Kalau semua nombor dianimasikan, tiada yang menonjol.
- **Cara bina:** `<span>` + GSAP `textContent` snap 1, tempoh 0.8–1.2s, `ease: power2.out`.
  Meter/cincin guna SVG `stroke-dasharray`. Masa mula diambil dari timing perkataan (lihat bahagian 5).

### T4. Satu kata kunci besar (kinetic typography)

- **Apa:** satu perkataan memenuhi skrin, dengan gaya fon yang ikut makna.
- **Contoh:** "PAIN" tebal sans retak; "passion" serif italik lembut; "PROFESSION" dengan "past" serif
  merah; "LEADERSHIP" dalam rajah Venn 3 bulatan; huruf "AI" 3D tersemperit merah-putih.
- **Sesuai untuk ustaz:** kata kunci ceramah ("IKHLAS", "SABAR", "TAWAKAL"), korus nasyid,
  tajuk bab, dan penutup video.
- **Jangan guna:** pada ayat Al-Quran atau hadis penuh. Itu perlu dipapar tenang dan lengkap dengan terjemahan,
  bukan dipecah-pecah jadi gimik.
- **Cara bina:** padankan pasangan fon: sans tebal (Montserrat Black) untuk penegasan, dan
  serif italik (Cinzel/Playfair) untuk emosi/rohani. Animasi: huruf masuk satu-satu (`stagger 0.03`)
  atau `clip-path` sapu dari bawah.

### T5. Teks di belakang subjek (depth text)

- **Apa:** teks besar diletak **di belakang** badan orang, jadi orang itu nampak "keluar" dari teks.
- **Contoh:** "PRO(V)EN" dengan orang di tengah huruf V; "NO BARRIERS" dan "WINDOW" di belakang kepala;
  "SWITCH" dan "INVISIBLE" di belakang host bersut merah.
- **Sesuai untuk ustaz:** hook 2 saat pertama, kad tajuk siri, dan thumbnail. Ia teknik "premium"
  yang paling mudah dikenali.
- **Jangan guna:** lebih dari 1–2 kali satu video. Ia cepat jadi klise.
- **Cara bina:** buat topeng (mask) orang dengan segmentasi (rembg / MediaPipe Selfie Segmentation),
  dan eksport video alpha atau urutan PNG. Susun lapisan: video asal → teks → video orang (alpha).

### T6. Sari kata kecil, kata kunci berwarna

- **Apa:** sari kata **kecil** (bukan besar ala CapCut) di bawah tengah. Perkataan yang sedang
  disebut atau kata kunci diwarnakan dengan warna aksen (merah, oren, biru atau emas ikut palet video).
- **Contoh:** "you're going to find out that the..." dengan satu perkataan berwarna; "CHATBOT" dan
  "REVISE" merah.
- **Sesuai untuk ustaz:** **semua video bercakap**. Repo MUSIC-VIDEO dah ada sistem karaoke emas,
  jadi tinggal kecilkan saiz dan hadkan pewarnaan kepada kata kunci sahaja.
- **Cara bina:** guna `ctc_align.py` dalam MUSIC-VIDEO (masa setiap perkataan). Satu baris 3–6 perkataan.

### T7. Senarai / langkah beranimasi

- **Apa:** struktur isi dijadikan grafik: "THE 3 Ps" tiga jubin huruf, papan klip dengan tanda
  (1/3 → 2/3 DONE), bulatan bernombor 1-2-3 yang bergabung jadi Venn, "2 BIGGEST OPPORTUNITIES" dengan
  dua kad, dan "SKILL ⇄ $ = EXCHANGE".
- **Sesuai untuk ustaz:** "3 amalan sebelum tidur", "5 rukun...", "2 jenis sabar" dan sebagainya.
  **Sangat sesuai sebagai kad penutup** (ringkasan) dalam 3 saat terakhir. Kad ini membuatkan orang save video.
- **Cara bina:** komponen senarai boleh guna semula: tajuk + N item, setiap item masuk ikut
  masa disebut, dan semua item muncul semula sebagai ringkasan di hujung.

### T8. Poster / prop metafora

- **Apa:** petikan dipapar sebagai objek fizikal: bingkai emas "THERE IS NO TOMORROW" bawah lampu
  sorot atas dinding kayu (rujukan filem Rocky III), kertas surat aduan, mesin kira.
- **Sesuai untuk ustaz:** petikan kata-kata ulama atau pepatah dalam **bingkai di dinding masjid
  lama**, ayat atas **kertas manuskrip/kitab kuning**, atau papan tanda. Sesuai untuk video sirah dan kisah.
- **Cara bina:** satu PNG latar (dinding + bingkai), dengan teks HTML di atasnya supaya mudah tukar.
  Tambah sapuan cahaya (`radial-gradient` bergerak) supaya nampak hidup.

### T9. Mockup UI (chat, terminal, telefon)

- **Apa:** kotak chat AI menaip sendiri, terminal Claude Code dengan prompt, skrin telefon dengan app.
- **Sesuai untuk ustaz:** tutorial ("cara daftar cabutan bertuah", "cara guna web program"),
  siri belakang tabir, dan video tentang teknologi/AI untuk pendakwah.
- **Jangan guna:** dalam video rohani. Ia memecahkan suasana.
- **Cara bina:** HTML sebenar (bukan gambar) dengan kesan menaip (`steps()` atau GSAP TextPlugin).

### T10. Panel terpisah: grafik atas + penceramah bawah

- **Apa:** dalam format menegak, separuh atas panel putih dengan grafik (logo, carta, ikon), dan separuh
  bawah video penceramah dalam kad bulat (video 3, Iman Gadzhi).
- **Sesuai untuk ustaz:** bila grafik perlu lama di skrin (carta, peta, senarai panjang) tapi
  wajah ustaz masih perlu nampak. Ia jalan tengah antara "full grafik" dan "full muka".

### T11. Palet warna ikut video

Dia tak guna satu palet untuk semua video. Setiap video ada satu "dunia" warna:

| Palet | Video | Rasa | Padanan untuk ustaz |
|---|---|---|---|
| Biru tua → ungu, cahaya lembut | 8, 9 | Teknologi, premium, malam | Video ilmu, statistik, qiamullail |
| Pastel kaca (biru-merah jambu) | 7 | Ringan, moden, optimis | Promosi program, info santai |
| Arang + aksen merah | 4, 5 | Serius, editorial | Peringatan, isu semasa |
| Krim + serif + jam/kayu | 6 | Klasik, renungan | Sirah, kisah, nasihat |
| Putih Swiss minimal + hitam | 3 | Bersih, korporat | Laporan, kenyataan rasmi |
| Hitam + kuning tebal | 1 | Agresif, hype | Kurang sesuai untuk ustaz |

**Cadangan identiti ustaz:** pilih 2–3 palet tetap, contohnya **biru malam + emas** (sudah
ada dalam karaoke emas MUSIC-VIDEO), **krim + hijau zamrud** untuk sirah dan kisah, dan **putih + hijau** untuk promosi.

### T12. Rentak potongan

- Visual dalam kad edit bertukar **setiap 1.5–3 saat**.
- **Grafik pertama muncul pada saat 1–2.** Tiada video yang buka dengan lebih dari 2 saat muka kosong.
- Selang-seli **muka ↔ grafik** kira-kira 50/50. Muka penceramah kembali setiap 3–5 saat supaya
  ada hubungan manusia.
- Peralihan lembut (morph, slide, zoom), bukan potongan kasar. Ada bunyi kesan (caption menyebut
  "sound design"). Bunyi tak dianalisis secara terperinci dalam kajian ini.

### T13. CTA kata kunci di komen

- "Comment **REFERENCE** / **MOTION** / **CREATE**" → dia hantar prompt/workflow melalui DM.
- **Sesuai untuk ustaz:** "Komen **DOA** untuk dapat teks doa penuh", "Komen **DAFTAR** untuk link
  program". Ini meningkatkan komen (yang dipandang algoritma) dan membina senarai orang berminat.
- Letak dalam caption **dan** kad akhir 2 saat terakhir.

### T14. Host faceless bertopeng (fasa 1)

- Topeng kuning/putih, topi berlogo, latar studio gelap dengan lilin, dan teks tebal kuning.
- **Tidak sesuai untuk ustaz.** Kredibiliti pendakwah datang dari wajah dan suara sendiri. Fasa ini
  juga prestasi paling rendah (~300 tontonan).

---

## 4. Apa yang TIDAK patut ditiru

1. **Klip podcast orang lain tanpa izin.** Dia guna klip Hormozi, Iman Gadzhi dan lain-lain. Untuk
   ustaz, guna **rakaman sendiri** atau rakaman yang ada izin (ceramah ustaz, program sendiri).
2. **Label "EDITED WITH [nama AI]" pada semua video.** Itu niche dia (menjual kemahiran edit AI).
   Audiens ustaz ialah Muslim Malaysia berumur 18–34 yang mencari isi agama
   (`Video-Claude/docs/laporan-analisis-medsos.md`). Guna label itu hanya dalam siri belakang tabir.
3. **Bahasa kesat** (ada dalam klip motivasi) dan **dakwaan duit** ("$100K+").
4. **Gambaran makhluk mulia.** Jangan visualkan Allah, nabi, malaikat atau sahabat. Guna kaligrafi,
   cahaya abstrak atau teks.
5. **Grafik pada setiap perkataan.** Dia buat begitu untuk menunjuk skill. Untuk dakwah, biar ada ruang
   tenang, terutamanya bila membaca ayat atau berdoa.

---

## 5. Peta guna: jenis video ustaz → teknik → masa dalam video

### A. Klip tazkirah / ceramah pendek (30–60s), jenis paling kerap

| Masa | Apa | Teknik |
|---|---|---|
| 0–2s | Hook: ayat paling tajam + satu visual kuat | T5 teks belakang ustaz **atau** T3 nombor |
| 2–20s | Isi: muka ustaz ↔ objek metafora setiap 2–4s | T2, T3, T6 |
| Bila sebut ayat/hadis | Teks Arab + terjemahan, tenang, tiada gimik | T4 (versi tenang), palet krim |
| 3s terakhir | Kad ringkasan "3 perkara..." | T7 |
| Caption | "Komen KATA untuk..." | T13 |

### B. Video infografik (fakta, hadis, statistik)

- Teknik utama: T3 nombor, T7 senarai, T4 kata kunci, T10 panel terpisah.
- Palet: biru malam + emas, atau pastel untuk topik ringan.
- Rentak sama (visual baru setiap 2–3s), tapi tak perlu muka. Suara latar sudah cukup.

### C. Music video nasyid lirik (repo MUSIC-VIDEO)

- Karaoke emas yang sedia ada = T6. **Jangan** isi setiap baris dengan objek; ia mengganggu lirik.
- Guna T4 kata besar **pada korus sahaja** (contoh: "PERMATA", "SEJATI").
- Guna T5 teks belakang subjek kalau ada rakaman penyanyi.
- Guna T2 metafora pada **bridge** atau peralihan bahagian lagu (1–2 objek, bukan 20).
- Video pendek promosi lagu (15–30s untuk TikTok): ambil korus, buat versi menegak dengan T4 + T6.

### D. Promosi program / produk (cabutan bertuah, Pekaya Pahang)

- T3: jumlah hadiah, baki hari (kira detik), bilangan peserta.
- T9: mockup telefon menunjukkan cara daftar di web.
- T7: "3 langkah sertai".
- T8: poster hadiah dalam bingkai bawah lampu sorot.
- T13: "Komen DAFTAR".

### E. Kisah / sirah

- T8 prop (kitab, pelita, peta lama), palet krim + serif, T4 kata emosi dengan serif italik.
- Rentak lebih perlahan (visual 3–5s), dengan muzik/nasyid latar yang lembut.

### F. Siri belakang tabir "Video ni dibuat dengan Claude"

- **Satu-satunya tempat T1 (Raw vs Edited) digunakan sepenuhnya.**
- Boleh jadi siri tetap (contohnya sebulan sekali) untuk tunjuk kemahiran. Siri ini juga sesuai kalau ustaz
  nak tawarkan khidmat edit kepada masjid/NGO lain.
- Hook: "Percaya tak video ni dibuat dengan kod?" (versi Melayu hook video 8).

### Peraturan ringkas yang terpakai pada semua jenis

1. Visual pertama **sebelum saat ke-2**.
2. Tukar visual setiap **1.5–3s** (tazkirah) atau **3–5s** (kisah, nasyid).
3. Muka ustaz kembali setiap **3–5s** dalam video bercakap.
4. **Satu palet** untuk satu video.
5. **Satu teknik "wow"** (T5 atau objek 3D besar) dalam 3 saat pertama. Jangan habiskan semuanya di awal.
6. Akhiri dengan **kad ringkasan** (T7), kerana kad ini mendorong orang save.
7. Jadual post ikut slot Metricool ustaz (`Video-Claude/CLAUDE.md`), bukan masa post dia
   (dia post untuk audiens Eropah/AS).

---

## 6. Cara bina dengan tools yang sudah ada

Rahsia "visual ikut setiap perkataan" ialah **masa setiap perkataan**. Repo MUSIC-VIDEO sudah ada alatnya:

1. **Transkrip + masa perkataan:** `ctc_align.py` (CTC alignment, adapter Bahasa Melayu `zlm`)
   atau Whisper → `words.json`.
2. **Pilih kata kunci:** tandakan perkataan yang dapat visual (nombor → T3, kata nama → T2,
   kata emosi → T4, senarai → T7).
3. **Pelan babak (JSON):** satu entri setiap babak:

```json
[
  {"t": 0.0, "end": 1.8, "type": "speaker"},
  {"t": 1.8, "end": 3.6, "type": "counter", "from": 0, "to": 70, "label": "KALI ISTIGHFAR"},
  {"t": 3.6, "end": 6.0, "type": "speaker", "highlight": ["istighfar"]},
  {"t": 6.0, "end": 8.5, "type": "prop", "asset": "props/jam-pasir.png", "caption": "MASA"},
  {"t": 8.5, "end": 11.0, "type": "word", "text": "SABAR", "font": "serif-italic"},
  {"t": 25.0, "end": 28.0, "type": "list", "title": "3 AMALAN", "items": ["Istighfar", "Selawat", "Doa"]}
]
```

4. **Komposisi HyperFrames:** satu fail komposisi untuk setiap jenis babak (`speaker`, `counter`, `prop`,
   `word`, `list`, `depth-text`, `ui`). `build.py` menukar pelan JSON → HTML, macam
   `MUSIC-VIDEO/permata-wanita-beriman/build.py` sekarang.
5. **Aset:** simpan objek 3D dan prop sebagai PNG lutsinar dalam `assets/props/`. Lama-kelamaan ia jadi
   perpustakaan sendiri (jam pasir, tasbih, mushaf, pelita, tabung, kunci, kalendar, dan lain-lain).
6. **Render** 1080x1920 @ 30fps untuk TikTok/Reels/Shorts.

Langkah seterusnya yang dicadangkan: bina satu **template "tazkirah-pendek"** dalam repo MUSIC-VIDEO
mengikut pelan di atas, dan uji dengan satu klip ceramah ustaz sendiri.
