-- Fix RLS policies for incidents table
-- This will allow users to create, read, update incidents based on their role

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant incidents" ON incidents;
DROP POLICY IF EXISTS "Users can insert incidents" ON incidents;
DROP POLICY IF EXISTS "Users can update incidents" ON incidents;

-- Policy for SELECT (viewing incidents) - MINIMAL VERSION
CREATE POLICY "Users can view relevant incidents" ON incidents
  FOR SELECT USING (
    -- Users can see incidents they reported
    reported_by = auth.uid() OR 
    -- Admins and site supervisors can see all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers and clinicians can see all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('case_manager', 'clinician'))
  );

-- Policy for INSERT (creating incidents) - MINIMAL VERSION
CREATE POLICY "Users can insert incidents" ON incidents
  FOR INSERT WITH CHECK (
    -- Users can create incidents if they are the reporter
    reported_by = auth.uid() OR
    -- Admins and site supervisors can create incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers and clinicians can create incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('case_manager', 'clinician'))
  );

-- Policy for UPDATE (updating incidents) - MINIMAL VERSION
CREATE POLICY "Users can update incidents" ON incidents
  FOR UPDATE USING (
    -- Users can update incidents they reported
    reported_by = auth.uid() OR 
    -- Admins and site supervisors can update all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers and clinicians can update all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('case_manager', 'clinician'))
  );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'incidents';
