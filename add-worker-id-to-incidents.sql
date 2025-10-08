-- Add worker_id column to incidents table
-- This will allow us to track which worker had the incident

-- Check if worker_id column already exists
DO $$ 
BEGIN
    -- Add worker_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incidents' 
        AND column_name = 'worker_id'
    ) THEN
        ALTER TABLE incidents ADD COLUMN worker_id UUID REFERENCES users(id);
        RAISE NOTICE '✅ Added worker_id column to incidents table';
    ELSE
        RAISE NOTICE 'ℹ️ worker_id column already exists in incidents table';
    END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id ON incidents(worker_id);

-- Update RLS policies to include worker_id
DROP POLICY IF EXISTS "Users can view relevant incidents" ON incidents;
DROP POLICY IF EXISTS "Users can insert incidents" ON incidents;
DROP POLICY IF EXISTS "Users can update incidents" ON incidents;

-- Policy for SELECT (viewing incidents) - with worker_id
CREATE POLICY "Users can view relevant incidents" ON incidents
  FOR SELECT USING (
    -- Users can see incidents they reported
    reported_by = auth.uid() OR 
    -- Users can see incidents where they are the worker
    worker_id = auth.uid() OR
    -- Admins and site supervisors can see all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers and clinicians can see all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('case_manager', 'clinician'))
  );

-- Policy for INSERT (creating incidents) - with worker_id
CREATE POLICY "Users can insert incidents" ON incidents
  FOR INSERT WITH CHECK (
    -- Users can create incidents if they are the reporter
    reported_by = auth.uid() OR
    -- Admins and site supervisors can create incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers and clinicians can create incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('case_manager', 'clinician'))
  );

-- Policy for UPDATE (updating incidents) - with worker_id
CREATE POLICY "Users can update incidents" ON incidents
  FOR UPDATE USING (
    -- Users can update incidents they reported
    reported_by = auth.uid() OR 
    -- Users can update incidents where they are the worker
    worker_id = auth.uid() OR
    -- Admins and site supervisors can update all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers and clinicians can update all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('case_manager', 'clinician'))
  );

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'incidents' 
AND column_name = 'worker_id';

-- Show current incidents table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'incidents' 
ORDER BY ordinal_position;
