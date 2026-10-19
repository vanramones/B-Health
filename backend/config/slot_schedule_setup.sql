-- Per-time slot capacity for each service.
-- Example: {"1:00 PM": 4, "2:00 PM": 6}. 0 = closed; a missing time falls back to slots_per_hour.
ALTER TABLE services ADD COLUMN IF NOT EXISTS slot_schedule JSONB DEFAULT '{}'::jsonb;
NOTIFY pgrst, 'reload schema';
