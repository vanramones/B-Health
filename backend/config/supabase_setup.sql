-- ================================================================
-- B-Health: Direct-to-Supabase setup
-- Paste this WHOLE file in: Supabase Dashboard -> SQL Editor -> Run
-- Safe to run multiple times (idempotent).
-- ================================================================

-- 1) Required extension for password hashing (bcrypt via crypt()/gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 2) Make sure all columns the app needs exist
--    (older schema.sql was incomplete; these are no-ops if present)
-- ================================================================

-- users: app needs username/password/full_name/phone/purok/is_active
ALTER TABLE users ADD COLUMN IF NOT EXISTS username   VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password   VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name  VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone      VARCHAR(20)  DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS purok      VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active  BOOLEAN      DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ  DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);

-- services: app needs slots_per_hour
ALTER TABLE services ADD COLUMN IF NOT EXISTS slots_per_hour INT DEFAULT 5;
-- per-time capacity, e.g. {"1:00 PM": 4, "2:00 PM": 6}; 0 = closed, missing time = slots_per_hour
ALTER TABLE services ADD COLUMN IF NOT EXISTS slot_schedule JSONB DEFAULT '{}'::jsonb;

-- soft-delete column on every table the CRUD layer touches
ALTER TABLE residents          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE appointments       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE health_records     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE vaccinations       ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE services           ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE announcements      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE emergency_contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE notifications      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- appointments link to user (for "my appointments")
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- vaccinations: reminder time for notifications
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS reminder_time TIME DEFAULT '09:00:00';

-- announcements: optional attached picture
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ================================================================
-- 2b) Storage bucket for announcement images (public read)
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "announcements public read"   ON storage.objects;
DROP POLICY IF EXISTS "announcements anon upload"    ON storage.objects;
DROP POLICY IF EXISTS "announcements anon update"    ON storage.objects;
DROP POLICY IF EXISTS "announcements anon delete"    ON storage.objects;

CREATE POLICY "announcements public read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'announcements');
CREATE POLICY "announcements anon upload" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'announcements');
CREATE POLICY "announcements anon update" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'announcements');
CREATE POLICY "announcements anon delete" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'announcements');

-- ================================================================
-- 3) Auth RPCs (run on Supabase's servers => secure password check,
--    works even if your laptop/backend is OFF)
-- ================================================================

-- Helper: strip password before returning a row as json
-- ADMIN LOGIN ----------------------------------------------------
CREATE OR REPLACE FUNCTION admin_login(p_username TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE rec admins%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM admins WHERE username = lower(trim(p_username)) LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF rec.password IS NULL OR crypt(p_password, rec.password) <> rec.password THEN RETURN NULL; END IF;
  IF rec.is_active IS FALSE THEN RETURN json_build_object('inactive', true); END IF;
  RETURN json_build_object(
    'id', rec.id, 'username', rec.username, 'name', rec.name,
    'email', rec.email, 'role', rec.role, 'is_owner', rec.is_owner, 'is_active', rec.is_active
  );
END; $$;

-- ADMIN CREATE ---------------------------------------------------
CREATE OR REPLACE FUNCTION admin_create(
  p_username TEXT, p_password TEXT, p_name TEXT,
  p_email TEXT DEFAULT '', p_role TEXT DEFAULT 'Staff', p_active BOOLEAN DEFAULT TRUE
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM admins WHERE username = lower(trim(p_username))) THEN
    RETURN json_build_object('error', 'Username already exists.');
  END IF;
  INSERT INTO admins (username, password, name, email, role, is_active)
  VALUES (lower(trim(p_username)), crypt(p_password, gen_salt('bf')), trim(p_name),
          coalesce(trim(p_email), ''), coalesce(p_role,'Staff'), coalesce(p_active, TRUE))
  RETURNING id INTO new_id;
  RETURN json_build_object('id', new_id);
END; $$;

-- ADMIN UPDATE ---------------------------------------------------
CREATE OR REPLACE FUNCTION admin_update(
  p_id BIGINT, p_username TEXT DEFAULT NULL, p_password TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL, p_email TEXT DEFAULT NULL, p_role TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rec admins%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM admins WHERE id = p_id LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('error', 'Admin not found.'); END IF;
  IF p_username IS NOT NULL AND lower(trim(p_username)) <> rec.username
     AND EXISTS (SELECT 1 FROM admins WHERE username = lower(trim(p_username)) AND id <> p_id) THEN
    RETURN json_build_object('error', 'Username already taken.');
  END IF;
  UPDATE admins SET
    username  = coalesce(lower(trim(p_username)), username),
    name      = coalesce(trim(p_name), name),
    email     = coalesce(trim(p_email), email),
    role      = CASE WHEN rec.is_owner THEN rec.role ELSE coalesce(p_role, role) END,
    is_active = CASE WHEN rec.is_owner THEN TRUE ELSE coalesce(p_active, is_active) END,
    password  = CASE WHEN p_password IS NOT NULL AND p_password <> '' THEN crypt(p_password, gen_salt('bf')) ELSE password END,
    updated_at = NOW()
  WHERE id = p_id;
  RETURN json_build_object('ok', true);
END; $$;

-- USER REGISTER / CREATE ----------------------------------------
CREATE OR REPLACE FUNCTION user_register(
  p_username TEXT, p_password TEXT, p_full_name TEXT,
  p_phone TEXT DEFAULT '', p_purok TEXT DEFAULT ''
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE username = lower(trim(p_username))) THEN
    RETURN json_build_object('error', 'Username already taken.');
  END IF;
  INSERT INTO users (username, password, full_name, phone, purok, is_active)
  VALUES (lower(trim(p_username)), crypt(p_password, gen_salt('bf')), trim(p_full_name),
          coalesce(trim(p_phone), ''), coalesce(trim(p_purok), ''), TRUE)
  RETURNING id INTO new_id;
  RETURN json_build_object('id', new_id, 'username', lower(trim(p_username)),
                           'full_name', trim(p_full_name), 'phone', coalesce(trim(p_phone),''),
                           'purok', coalesce(trim(p_purok),''));
END; $$;

-- USER LOGIN -----------------------------------------------------
CREATE OR REPLACE FUNCTION user_login(p_username TEXT, p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rec users%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM users WHERE username = lower(trim(p_username)) LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF rec.password IS NULL OR crypt(p_password, rec.password) <> rec.password THEN RETURN NULL; END IF;
  IF rec.is_active IS FALSE THEN RETURN json_build_object('inactive', true); END IF;
  RETURN json_build_object('id', rec.id, 'username', rec.username, 'full_name', rec.full_name,
                           'phone', rec.phone, 'purok', rec.purok);
END; $$;

-- USER UPDATE (admin editing a user) ----------------------------
CREATE OR REPLACE FUNCTION user_update(
  p_id BIGINT, p_username TEXT DEFAULT NULL, p_password TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL, p_phone TEXT DEFAULT NULL, p_purok TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rec users%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM users WHERE id = p_id LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('error', 'User not found.'); END IF;
  IF p_username IS NOT NULL AND lower(trim(p_username)) <> rec.username
     AND EXISTS (SELECT 1 FROM users WHERE username = lower(trim(p_username)) AND id <> p_id) THEN
    RETURN json_build_object('error', 'Username already taken.');
  END IF;
  UPDATE users SET
    username  = coalesce(lower(trim(p_username)), username),
    full_name = coalesce(trim(p_full_name), full_name),
    phone     = coalesce(trim(p_phone), phone),
    purok     = coalesce(trim(p_purok), purok),
    password  = CASE WHEN p_password IS NOT NULL AND p_password <> '' THEN crypt(p_password, gen_salt('bf')) ELSE password END
  WHERE id = p_id;
  RETURN json_build_object('ok', true);
END; $$;

-- Allow the anon/publishable key to call these functions
GRANT EXECUTE ON FUNCTION admin_login(TEXT,TEXT)                                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_create(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN)            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update(BIGINT,TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION user_register(TEXT,TEXT,TEXT,TEXT,TEXT)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION user_login(TEXT,TEXT)                                     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION user_update(BIGINT,TEXT,TEXT,TEXT,TEXT,TEXT)              TO anon, authenticated;

-- ================================================================
-- 4) RLS: DISABLE so the publishable key can read/write directly.
--    NOTE: this makes data accessible to anyone holding the anon key.
--    Fine for a school/barangay project; NOT for production.
-- ================================================================
ALTER TABLE admins             DISABLE ROW LEVEL SECURITY;
ALTER TABLE users              DISABLE ROW LEVEL SECURITY;
ALTER TABLE residents          DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       DISABLE ROW LEVEL SECURITY;
ALTER TABLE health_records     DISABLE ROW LEVEL SECURITY;
ALTER TABLE vaccinations       DISABLE ROW LEVEL SECURITY;
ALTER TABLE services           DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements      DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      DISABLE ROW LEVEL SECURITY;

-- Done. Reload your app.
