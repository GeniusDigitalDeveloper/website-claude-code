-- =====================================================================
--  KLINIK GIGI SUMAYYAH — SQL TABLE (PostgreSQL)
--  Untuk Firebase SQL Connect (Data Connect) / Cloud SQL Postgres.
--  Struktur ini sama 1:1 dengan koleksi Firestore yang website guna,
--  jadi data boleh dieksport/diimport bila-bila masa.
-- =====================================================================

CREATE TABLE IF NOT EXISTS tetapan_umum (
  id               TEXT PRIMARY KEY DEFAULT 'umum',
  nama_klinik      VARCHAR(120) NOT NULL,
  tagline          VARCHAR(200),
  logo             TEXT,                       -- data URL / URL gambar
  telefon          VARCHAR(30),
  whatsapp         VARCHAR(30),
  emel             VARCHAR(120),
  alamat           TEXT,
  peta_embed       TEXT,                       -- URL Google Maps embed
  facebook         TEXT,
  instagram        TEXT,
  tiktok           TEXT,
  no_pendaftaran   VARCHAR(60),
  dikemaskini      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS waktu_operasi (
  id        SERIAL PRIMARY KEY,
  hari      VARCHAR(40) NOT NULL,
  masa      VARCHAR(60) NOT NULL,             -- cth: "9:00 pagi - 9:00 malam" / "Tutup"
  susunan   INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hero (
  id          TEXT PRIMARY KEY DEFAULT 'hero',
  label       VARCHAR(80),
  tajuk       VARCHAR(160) NOT NULL,
  subtajuk    TEXT,
  imej        TEXT,
  dikemaskini TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banner (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tajuk      VARCHAR(160) NOT NULL,
  teks       TEXT,
  imej       TEXT,
  label_cta  VARCHAR(60),
  aktif      BOOLEAN DEFAULT TRUE,
  susunan    INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS perkhidmatan (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        VARCHAR(120) NOT NULL,
  kategori    VARCHAR(60),
  ikon        VARCHAR(40),                    -- nama ikon lucide
  ringkasan   TEXT,
  butiran     TEXT,
  harga_dari  VARCHAR(40),
  tempoh      VARCHAR(40),
  aktif       BOOLEAN DEFAULT TRUE,
  susunan     INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pakej (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama      VARCHAR(120) NOT NULL,
  harga     VARCHAR(40) NOT NULL,
  nota      VARCHAR(120),
  ciri      TEXT[],                           -- senarai ciri
  popular   BOOLEAN DEFAULT FALSE,
  susunan   INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS galeri (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imej      TEXT NOT NULL,
  kapsyen   VARCHAR(160),
  kategori  VARCHAR(60),
  susunan   INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS doktor (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        VARCHAR(120) NOT NULL,
  jawatan     VARCHAR(120),
  kelayakan   VARCHAR(200),
  imej        TEXT,
  susunan     INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS testimoni (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama      VARCHAR(120) NOT NULL,
  teks      TEXT NOT NULL,
  rating    SMALLINT CHECK (rating BETWEEN 1 AND 5) DEFAULT 5,
  susunan   INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS soalan (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soalan    TEXT NOT NULL,
  jawapan   TEXT NOT NULL,
  susunan   INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tempahan (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          VARCHAR(100) NOT NULL,
  telefon       VARCHAR(20)  NOT NULL,
  emel          VARCHAR(120),
  perkhidmatan  VARCHAR(120) NOT NULL,
  tarikh        DATE NOT NULL,
  masa          VARCHAR(10),
  catatan       TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'baru'
                CHECK (status IN ('baru','disahkan','selesai','batal')),
  dicipta       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tempahan_status ON tempahan(status);
CREATE INDEX IF NOT EXISTS idx_tempahan_tarikh ON tempahan(tarikh);
