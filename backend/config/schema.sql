-- B-Health Database Schema
-- Run: mysql -u root -p < config/schema.sql

CREATE DATABASE IF NOT EXISTS b_health_db;
USE b_health_db;

-- ── Admins ──
CREATE TABLE IF NOT EXISTS admins (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) DEFAULT '',
  role        VARCHAR(50)  DEFAULT 'Staff',
  is_active   TINYINT(1)   DEFAULT 1,
  is_owner    TINYINT(1)   DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Residents ──
CREATE TABLE IF NOT EXISTS residents (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  age         INT          NOT NULL,
  gender      ENUM('Male','Female') NOT NULL,
  address     VARCHAR(255) DEFAULT '',
  contact     VARCHAR(50)  DEFAULT '',
  `condition` VARCHAR(100) DEFAULT 'Healthy',
  status      ENUM('active','monitoring','inactive') DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Appointments ──
CREATE TABLE IF NOT EXISTS appointments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NULL,
  resident_id INT          NULL,
  name        VARCHAR(100) NOT NULL,
  service     VARCHAR(100) NOT NULL,
  date        DATE         NOT NULL,
  time        VARCHAR(20)  NOT NULL,
  phone       VARCHAR(20)  DEFAULT NULL,
  notes       TEXT         DEFAULT NULL,
  status      ENUM('pending','approved','completed','rejected','cancelled') DEFAULT 'pending',
  handled_by  VARCHAR(100) DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
);

-- ── Health Records ──
CREATE TABLE IF NOT EXISTS health_records (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  resident_id INT          NULL,
  patient     VARCHAR(100) NOT NULL,
  type        VARCHAR(50)  NOT NULL,
  diagnosis   VARCHAR(255) NOT NULL,
  doctor      VARCHAR(100) NOT NULL,
  date        DATE         NOT NULL,
  notes       TEXT         DEFAULT NULL,
  prescription TINYINT(1)  DEFAULT 0,
  status      ENUM('ongoing','follow-up','closed') DEFAULT 'ongoing',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
);

-- ── Vaccinations ──
CREATE TABLE IF NOT EXISTS vaccinations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  resident_id     INT          NULL,
  patient         VARCHAR(100) NOT NULL,
  age             INT          DEFAULT 0,
  vaccine         VARCHAR(100) NOT NULL,
  dose            VARCHAR(50)  NOT NULL,
  date            DATE         NOT NULL,
  next_due        DATE         NULL,
  administered_by VARCHAR(100) DEFAULT '',
  site            VARCHAR(50)  DEFAULT '',
  status          ENUM('scheduled','completed','missed') DEFAULT 'scheduled',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
);

-- ── Services ──
CREATE TABLE IF NOT EXISTS services (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  category      VARCHAR(50)  NOT NULL,
  icon          VARCHAR(50)  DEFAULT 'heart',
  accent        VARCHAR(20)  DEFAULT '#3b82f6',
  description   TEXT         DEFAULT NULL,
  beneficiaries INT          DEFAULT 0,
  schedule      VARCHAR(255) DEFAULT '',
  location      VARCHAR(255) DEFAULT '',
  staff         VARCHAR(255) DEFAULT '',
  is_active     TINYINT(1)   DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL
);

-- ── Announcements ──
CREATE TABLE IF NOT EXISTS announcements (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  category      VARCHAR(50)  NOT NULL,
  body          TEXT         NOT NULL,
  author        VARCHAR(100) DEFAULT '',
  audience      VARCHAR(100) DEFAULT 'All Residents',
  publish_date  DATE         NOT NULL,
  event_date    DATE         NULL,
  status        ENUM('draft','published','archived') DEFAULT 'draft',
  pinned        TINYINT(1)   DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL DEFAULT NULL
);

-- ── Emergency Contacts ──
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50)  NOT NULL,
  phone       VARCHAR(50)  NOT NULL,
  alt_phone   VARCHAR(50)  DEFAULT '',
  email       VARCHAR(100) DEFAULT '',
  address     VARCHAR(255) DEFAULT '',
  available   VARCHAR(50)  DEFAULT '24/7',
  is_active   TINYINT(1)   DEFAULT 1,
  is_favorite TINYINT(1)   DEFAULT 0,
  notes       TEXT         DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Notifications ──
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  type        VARCHAR(50)  NOT NULL,
  priority    ENUM('low','normal','urgent') DEFAULT 'normal',
  title       VARCHAR(255) NOT NULL,
  message     TEXT         NOT NULL,
  recipient   VARCHAR(100) DEFAULT 'All Staff',
  is_read     TINYINT(1)   DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
