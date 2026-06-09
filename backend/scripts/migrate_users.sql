-- ============================================================
--  B-Health: Users table migration
--  Run once against b_health_db
-- ============================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT           AUTO_INCREMENT PRIMARY KEY,
  `username`   VARCHAR(50)   UNIQUE NOT NULL,
  `password`   VARCHAR(255)  NOT NULL,
  `full_name`  VARCHAR(100)  NOT NULL,
  `phone`      VARCHAR(20)   DEFAULT NULL,
  `purok`      VARCHAR(50)   DEFAULT NULL,
  `is_active`  TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON `users` (`username`);

-- Add user_id column to appointments (links to users table)
ALTER TABLE `appointments`
  ADD COLUMN IF NOT EXISTS `user_id` INT DEFAULT NULL,
  ADD INDEX IF NOT EXISTS idx_appointments_user_id (`user_id`);
