-- Add missing columns to existing tables
-- Run: mysql -u root -p b_health_db < scripts/add_deleted_at.sql

-- Add columns to appointments table if they don't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id INT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS handled_by VARCHAR(100) DEFAULT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add deleted_at to other tables
ALTER TABLE health_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
