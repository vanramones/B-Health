-- ============================================================================
-- B-Health — FCM Remote Push setup
-- Run this in the Supabase SQL Editor (after supabase_setup.sql).
-- ============================================================================

-- Stores one row per device/browser per user so the Edge Function knows where
-- to deliver a push. A user can have many tokens (phone + tablet + browser).
CREATE TABLE IF NOT EXISTS device_tokens (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT DEFAULT 'android',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

-- Match the rest of the project: RLS disabled so the anon key can upsert tokens.
-- (Security tradeoff already accepted for this school/barangay project.)
ALTER TABLE device_tokens DISABLE ROW LEVEL SECURITY;

-- Upsert helper: insert a token or, if the same token already exists, re-point
-- it to the current user and refresh updated_at. Called from the app on login.
CREATE OR REPLACE FUNCTION register_device_token(
  p_user_id  BIGINT,
  p_token    TEXT,
  p_platform TEXT DEFAULT 'android'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO device_tokens (user_id, token, platform, updated_at)
  VALUES (p_user_id, p_token, p_platform, now())
  ON CONFLICT (token)
  DO UPDATE SET user_id = EXCLUDED.user_id,
                platform = EXCLUDED.platform,
                updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
