-- Comprehensive fix for work_readiness table issues
-- Run this in your Supabase SQL editor

-- 1. First, check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'work_readiness' 
ORDER BY ordinal_position;

-- 2. Drop existing constraints that are too restrictive
ALTER TABLE work_readiness DROP CONSTRAINT IF EXISTS work_readiness_fatigue_level_check;

-- 3. Update the fatigue_level constraint to allow 0-10 range
ALTER TABLE work_readiness ADD CONSTRAINT work_readiness_fatigue_level_check 
    CHECK (fatigue_level BETWEEN 0 AND 10);

-- 4. Add missing INSERT policy for work_readiness table
CREATE POLICY "Workers can insert own work readiness" ON work_readiness
  FOR INSERT WITH CHECK (worker_id = auth.uid());

-- 5. Add UPDATE policy for work_readiness table (for team leaders to update status)
CREATE POLICY "Team leaders can update work readiness status" ON work_readiness
  FOR UPDATE USING (
    team_leader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

-- 6. Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'work_readiness'
ORDER BY policyname;

-- 7. Test insert with sample data to verify it works
-- (This will be rolled back, just for testing)
BEGIN;
INSERT INTO work_readiness (
    worker_id, 
    team_leader_id, 
    team, 
    fatigue_level, 
    pain_discomfort, 
    readiness_level, 
    mood
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- dummy UUID
    '00000000-0000-0000-0000-000000000000', -- dummy UUID  
    'TEST_TEAM',
    5, -- fatigue level 0-10
    'no',
    'fit',
    'good'
);
ROLLBACK; -- Rollback the test insert
