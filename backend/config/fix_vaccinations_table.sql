-- ================================================================
-- FIX: Vaccinations Table - Add Missing Columns
-- Run this in Supabase Dashboard -> SQL Editor
-- ================================================================

-- Ensure all required columns exist in vaccinations table
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS resident_id BIGINT;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS patient VARCHAR(255);
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS vaccine VARCHAR(100);
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS dose VARCHAR(50);
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS next_due DATE;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS reminder_time TIME DEFAULT '09:00:00';
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS administered_by VARCHAR(255);
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS site VARCHAR(100);
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled';
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vaccinations_user_id ON vaccinations(user_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_status ON vaccinations(status);
CREATE INDEX IF NOT EXISTS idx_vaccinations_next_due ON vaccinations(next_due);
CREATE INDEX IF NOT EXISTS idx_vaccinations_deleted_at ON vaccinations(deleted_at);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Vaccinations table updated successfully!';
END $$;
