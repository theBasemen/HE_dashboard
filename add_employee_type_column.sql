-- Add 'type' column to he_time_users table
-- This column will store whether an employee is 'freelance' or 'a-indkomst'
-- Default is 'a-indkomst' for existing employees

ALTER TABLE he_time_users
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('freelance', 'a-indkomst'));

-- Set default value for existing rows
UPDATE he_time_users SET type = 'a-indkomst' WHERE type IS NULL;

-- Add hourly_rate_manual column for freelancers (nullable)
ALTER TABLE he_time_users
ADD COLUMN IF NOT EXISTS hourly_rate_manual NUMERIC(10, 2);

-- Optional: Make type NOT NULL after setting defaults (uncomment if needed)
-- ALTER TABLE he_time_users ALTER COLUMN type SET NOT NULL;

