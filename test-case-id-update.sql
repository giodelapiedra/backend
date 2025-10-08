-- Test case_id column update
-- This script tests if we can update the case_id column in incidents table

-- First, check if case_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'incidents' 
AND column_name = 'case_id';

-- If the column doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incidents' 
        AND column_name = 'case_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE incidents ADD COLUMN case_id UUID REFERENCES cases(id);
        CREATE INDEX IF NOT EXISTS idx_incidents_case_id ON incidents(case_id);
        RAISE NOTICE 'case_id column added to incidents table';
    ELSE
        RAISE NOTICE 'case_id column already exists in incidents table';
    END IF;
END $$;

-- Test updating case_id for a recent incident
-- Replace 'your-incident-id' with an actual incident ID from your table
UPDATE incidents 
SET case_id = (
    SELECT id FROM cases 
    WHERE incident_id = incidents.id 
    LIMIT 1
)
WHERE case_id IS NULL 
AND id IN (
    SELECT id FROM incidents 
    ORDER BY created_at DESC 
    LIMIT 5
);

-- Check the results
SELECT 
  id,
  incident_number,
  case_id,
  description,
  created_at
FROM incidents 
WHERE case_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;
