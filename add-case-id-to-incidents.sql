-- Add case_id column to incidents table
-- This will allow each incident to reference its associated case

-- Add the case_id column
ALTER TABLE incidents ADD COLUMN case_id UUID REFERENCES cases(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_case_id ON incidents(case_id);

-- Update RLS policies to include case_id
DROP POLICY IF EXISTS "Users can view relevant incidents" ON incidents;
CREATE POLICY "Users can view relevant incidents" ON incidents
  FOR SELECT USING (
    reported_by = auth.uid() OR
    worker_id = auth.uid() OR
    case_id IN (
      SELECT id FROM cases 
      WHERE case_manager_id = auth.uid() 
      OR worker_id = auth.uid()
    ) OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

DROP POLICY IF EXISTS "Users can insert incidents" ON incidents;
CREATE POLICY "Users can insert incidents" ON incidents
  FOR INSERT WITH CHECK (
    reported_by = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

DROP POLICY IF EXISTS "Users can update incidents" ON incidents;
CREATE POLICY "Users can update incidents" ON incidents
  FOR UPDATE USING (
    reported_by = auth.uid() OR
    case_id IN (
      SELECT id FROM cases 
      WHERE case_manager_id = auth.uid()
    ) OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

-- Add comment to document the column
COMMENT ON COLUMN incidents.case_id IS 'References the case created for this incident';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'incidents' 
AND column_name = 'case_id';
