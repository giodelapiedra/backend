-- Fix RLS policies for cases table
-- This will allow users to create cases when creating incidents

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant cases" ON cases;
DROP POLICY IF EXISTS "Users can insert cases" ON cases;
DROP POLICY IF EXISTS "Users can update cases" ON cases;

-- Policy for SELECT (viewing cases)
CREATE POLICY "Users can view relevant cases" ON cases
  FOR SELECT USING (
    worker_id = auth.uid() OR 
    case_manager_id = auth.uid() OR 
    clinician_id = auth.uid() OR
    employer_id = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

-- Policy for INSERT (creating cases) - CRITICAL FOR INCIDENT CREATION
CREATE POLICY "Users can insert cases" ON cases
  FOR INSERT WITH CHECK (
    -- Site supervisors can create cases when reporting incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers can create cases
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'case_manager') OR
    -- Clinicians can create cases
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'clinician')
  );

-- Policy for UPDATE (updating cases)
CREATE POLICY "Users can update cases" ON cases
  FOR UPDATE USING (
    case_manager_id = auth.uid() OR
    clinician_id = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

-- Add comment to document the policies
COMMENT ON POLICY "Users can insert cases" ON cases IS 'Allows site supervisors, case managers, and clinicians to create cases';

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'cases';
