-- Add 'type' column to he_time_projects table
-- This column will store whether a project is 'internal' or 'customer'

ALTER TABLE he_time_projects
ADD COLUMN type TEXT CHECK (type IN ('internal', 'customer'));

-- Optional: Set default value for existing rows
-- UPDATE he_time_projects SET type = 'internal' WHERE type IS NULL;

-- Optional: Make it NOT NULL after setting defaults (uncomment if needed)
-- ALTER TABLE he_time_projects ALTER COLUMN type SET NOT NULL;

