-- ================================================
-- B-Health DB Migration: MySQL → Supabase
-- Paste this in: Supabase → SQL Editor → Run
-- ================================================

-- ── Users (para sa appointments foreign key) ──
CREATE TABLE IF NOT EXISTS users (
  id          BIGSERIAL PRIMARY KEY,
  email       VARCHAR(100) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Admins ──
CREATE TABLE IF NOT EXISTS admins (
  id          BIGSERIAL PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) DEFAULT '',
  role        VARCHAR(50)  DEFAULT 'Staff',
  is_active   BOOLEAN      DEFAULT TRUE,
  is_owner    BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Residents ──
CREATE TABLE IF NOT EXISTS residents (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  age         INT          NOT NULL,
  gender      VARCHAR(10)  CHECK (gender IN ('Male','Female')) NOT NULL,
  address     VARCHAR(255) DEFAULT '',
  contact     VARCHAR(50)  DEFAULT '',
  condition   VARCHAR(100) DEFAULT 'Healthy',
  status      VARCHAR(20)  CHECK (status IN ('active','monitoring','inactive')) DEFAULT 'active',
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Appointments ──
CREATE TABLE IF NOT EXISTS appointments (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT       REFERENCES users(id) ON DELETE SET NULL,
  resident_id BIGINT       REFERENCES residents(id) ON DELETE SET NULL,
  name        VARCHAR(100) NOT NULL,
  service     VARCHAR(100) NOT NULL,
  date        DATE         NOT NULL,
  time        VARCHAR(20)  NOT NULL,
  phone       VARCHAR(20)  DEFAULT NULL,
  notes       TEXT         DEFAULT NULL,
  status      VARCHAR(20)  CHECK (status IN ('pending','approved','completed','rejected','cancelled')) DEFAULT 'pending',
  handled_by  VARCHAR(100) DEFAULT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ  DEFAULT NULL
);

-- ── Health Records ──
CREATE TABLE IF NOT EXISTS health_records (
  id          BIGSERIAL PRIMARY KEY,
  resident_id BIGINT       REFERENCES residents(id) ON DELETE SET NULL,
  patient     VARCHAR(100) NOT NULL,
  type        VARCHAR(50)  NOT NULL,
  diagnosis   VARCHAR(255) NOT NULL,
  doctor      VARCHAR(100) NOT NULL,
  date        DATE         NOT NULL,
  notes       TEXT         DEFAULT NULL,
  prescription BOOLEAN     DEFAULT FALSE,
  status      VARCHAR(20)  CHECK (status IN ('ongoing','follow-up','closed')) DEFAULT 'ongoing',
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ  DEFAULT NULL
);

-- ── Vaccinations ──
CREATE TABLE IF NOT EXISTS vaccinations (
  id              BIGSERIAL PRIMARY KEY,
  resident_id     BIGINT       REFERENCES residents(id) ON DELETE SET NULL,
  patient         VARCHAR(100) NOT NULL,
  age             INT          DEFAULT 0,
  vaccine         VARCHAR(100) NOT NULL,
  dose            VARCHAR(50)  NOT NULL,
  date            DATE         NOT NULL,
  next_due        DATE         DEFAULT NULL,
  administered_by VARCHAR(100) DEFAULT '',
  site            VARCHAR(50)  DEFAULT '',
  status          VARCHAR(20)  CHECK (status IN ('scheduled','completed','missed')) DEFAULT 'scheduled',
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ  DEFAULT NULL
);

-- ── Services ──
CREATE TABLE IF NOT EXISTS services (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  category      VARCHAR(50)  NOT NULL,
  icon          VARCHAR(50)  DEFAULT 'heart',
  accent        VARCHAR(20)  DEFAULT '#3b82f6',
  description   TEXT         DEFAULT NULL,
  beneficiaries INT          DEFAULT 0,
  schedule      VARCHAR(255) DEFAULT '',
  location      VARCHAR(255) DEFAULT '',
  staff         VARCHAR(255) DEFAULT '',
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ  DEFAULT NULL
);

-- ── Announcements ──
CREATE TABLE IF NOT EXISTS announcements (
  id            BIGSERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  category      VARCHAR(50)  NOT NULL,
  body          TEXT         NOT NULL,
  author        VARCHAR(100) DEFAULT '',
  audience      VARCHAR(100) DEFAULT 'All Residents',
  publish_date  DATE         NOT NULL,
  event_date    DATE         DEFAULT NULL,
  status        VARCHAR(20)  CHECK (status IN ('draft','published','archived')) DEFAULT 'draft',
  pinned        BOOLEAN      DEFAULT FALSE,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ  DEFAULT NULL
);

-- ── Emergency Contacts ──
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50)  NOT NULL,
  phone       VARCHAR(50)  NOT NULL,
  alt_phone   VARCHAR(50)  DEFAULT '',
  email       VARCHAR(100) DEFAULT '',
  address     VARCHAR(255) DEFAULT '',
  available   VARCHAR(50)  DEFAULT '24/7',
  is_active   BOOLEAN      DEFAULT TRUE,
  is_favorite BOOLEAN      DEFAULT FALSE,
  notes       TEXT         DEFAULT NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Notifications ──
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  type        VARCHAR(50)  NOT NULL,
  priority    VARCHAR(10)  CHECK (priority IN ('low','normal','urgent')) DEFAULT 'normal',
  title       VARCHAR(255) NOT NULL,
  message     TEXT         NOT NULL,
  recipient   VARCHAR(100) DEFAULT 'All Staff',
  is_read     BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);