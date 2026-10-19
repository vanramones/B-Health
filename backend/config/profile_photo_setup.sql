-- =====================================================
-- STEP 1: Run this SQL in Supabase SQL Editor
-- =====================================================

-- Add profile_photo column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT DEFAULT '';

-- =====================================================
-- STEP 2: Create Storage Bucket (in Supabase Dashboard)
-- =====================================================
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click "New bucket"
-- 3. Bucket name: profile-photos
-- 4. Toggle ON "Public bucket" 
-- 5. Click "Save"
--
-- That's it! Public buckets allow anyone to read files
-- and the anon key can upload files.
-- =====================================================
