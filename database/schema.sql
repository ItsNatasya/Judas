-- ============================================================
-- JUDAS - PostgreSQL Schema (schema.sql)
-- Dijalankan sekali di awal setup, ATAU biarkan SQLAlchemy yang
-- membuatnya otomatis lewat `flask shell` -> db.create_all()
-- (lihat Bab 5 buku panduan). File ini berguna untuk:
--   - review DDL secara eksplisit
--   - dijalankan manual via psql / DBeaver / pgAdmin
--
-- PENTING: 3 tabel dataset SENGAJA dipisah, TIDAK digabung:
--   1. judol_dataset  -> domain judi online
--   2. safe_dataset   -> domain aman
--   3. wordlist        -> kata kunci (bukan domain sama sekali)
-- ============================================================

CREATE DATABASE judas_db;
-- \c judas_db

-- ------------------------------------------------------------
-- 1. TABEL judol_dataset -- domain situs judi online
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS judol_dataset (
    id           SERIAL PRIMARY KEY,
    url          VARCHAR(2048) NOT NULL UNIQUE,
    category     VARCHAR(50)  NOT NULL,   -- Slot|Togel|Casino|Poker|Sbobet|Sportbook|Lainnya
    risk         VARCHAR(20)  NOT NULL,   -- Tinggi|Sedang|Rendah
    status       VARCHAR(20)  NOT NULL DEFAULT 'Aktif',  -- Aktif|Nonaktif|Dilaporkan
    scan_count   INTEGER      DEFAULT 0,
    reported_by  VARCHAR(100),
    notes        VARCHAR(500),
    added_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_judol_dataset_url ON judol_dataset (url);
CREATE INDEX IF NOT EXISTS idx_judol_dataset_category ON judol_dataset (category);
CREATE INDEX IF NOT EXISTS idx_judol_dataset_risk ON judol_dataset (risk);
CREATE INDEX IF NOT EXISTS idx_judol_dataset_status ON judol_dataset (status);

-- ------------------------------------------------------------
-- 2. TABEL safe_dataset -- domain situs aman (label negatif training)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS safe_dataset (
    id         SERIAL PRIMARY KEY,
    url        VARCHAR(2048) NOT NULL UNIQUE,
    category   VARCHAR(50)  NOT NULL DEFAULT 'Aman',
    risk       VARCHAR(20)  NOT NULL DEFAULT 'Rendah',
    status     VARCHAR(20)  NOT NULL DEFAULT 'Aktif',
    notes      VARCHAR(500),
    added_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_safe_dataset_url ON safe_dataset (url);

-- ------------------------------------------------------------
-- 3. TABEL wordlist -- kata kunci judol (dipakai Lexical Analysis)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wordlist (
    id           SERIAL PRIMARY KEY,
    keyword      VARCHAR(100) NOT NULL UNIQUE,
    category     VARCHAR(30)  NOT NULL,   -- Slot|Togel|Casino|Poker|Sbobet|Sportbook|Umum|Slang|Operasional
    description  VARCHAR(255),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    added_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    added_by     VARCHAR(100) DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_wordlist_keyword ON wordlist (keyword);
CREATE INDEX IF NOT EXISTS idx_wordlist_category ON wordlist (category);

-- ------------------------------------------------------------
-- 4. TABEL admin_user -- akun admin
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_user (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'admin',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 5. TABEL scan_log -- riwayat setiap eksekusi /scan/url
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scan_log (
    id            SERIAL PRIMARY KEY,
    url           VARCHAR(2048) NOT NULL,
    label         VARCHAR(20)  NOT NULL,     -- Judol|Aman
    confidence    DOUBLE PRECISION NOT NULL,
    rf_score      DOUBLE PRECISION NOT NULL,
    whois_age     INTEGER,
    crawl_status  VARCHAR(30),
    features_used JSONB,
    from_cache    BOOLEAN DEFAULT FALSE,
    admin_id      INTEGER REFERENCES admin_user(id),
    scanned_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scan_log_url ON scan_log (url);
CREATE INDEX IF NOT EXISTS idx_scan_log_admin ON scan_log (admin_id);

-- ------------------------------------------------------------
-- 6. TABEL reviews -- ulasan pengguna publik
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    role          VARCHAR(100),
    rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review        VARCHAR(500) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'Menunggu',  -- Menunggu|Disetujui
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at   TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- 7. TABEL audit_logs -- jejak audit aksi admin
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id             SERIAL PRIMARY KEY,
    admin_username VARCHAR(100),
    action         VARCHAR(100) NOT NULL,
    detail         VARCHAR(500),
    ip_address     VARCHAR(64),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 8. TABEL retrain_jobs -- pelacakan job retraining async
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retrain_jobs (
    id          SERIAL PRIMARY KEY,
    job_id      VARCHAR(50) NOT NULL UNIQUE,
    status      VARCHAR(20) NOT NULL DEFAULT 'queued',  -- queued|running|done|failed
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);
