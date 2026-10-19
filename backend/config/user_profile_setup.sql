-- ================================================================
-- B-Health — User self-profile fields
-- Run this in: Supabase -> SQL Editor -> Run
-- Adds the extra columns the "My Profile" page lets a resident edit.
-- (address is stored in the existing `purok` column.)
-- ================================================================

-- email already exists from the very first schema (NOT NULL UNIQUE).
-- Make it optional + non-unique so residents can leave it blank / share none.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
DROP INDEX IF EXISTS users_email_key;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN email SET DEFAULT '';

-- Personal / medical info
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthdate      DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender         VARCHAR(20)  DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_type     VARCHAR(5)   DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS civil_status   VARCHAR(20)  DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation     VARCHAR(80)  DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS philhealth_no  VARCHAR(30)  DEFAULT '';

-- Emergency contact (resident's own)
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_name         VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_relationship VARCHAR(40)  DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_phone        VARCHAR(30)  DEFAULT '';
