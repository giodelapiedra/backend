-- Add duration column to rehabilitation_plans table
-- This column tracks how many days the rehabilitation plan should last

-- Add duration column (default 7 days)
ALTER TABLE rehabilitation_plans
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 7;

-- Add comment to the column
COMMENT ON COLUMN rehabilitation_plans.duration IS 'Number of days the rehabilitation plan should last (e.g., 7 days, 14 days, 30 days)';

-- Update existing plans to have a default duration of 7 days if not set
UPDATE rehabilitation_plans
SET duration = 7
WHERE duration IS NULL;

-- Add a check constraint to ensure duration is positive
ALTER TABLE rehabilitation_plans
ADD CONSTRAINT check_duration_positive CHECK (duration > 0 AND duration <= 365);

SELECT 'Duration column added successfully to rehabilitation_plans table!' AS status;

