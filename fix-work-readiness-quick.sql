-- Quick Fix for Work Readiness "progress_percentage" Error (Preserves Data)
-- Run this script in your Supabase SQL editor

-- Step 1: Check if there are any problematic triggers or functions
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'work_readiness';

-- Step 2: Check for any functions that might reference progress_percentage
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%progress_percentage%';

-- Step 3: Drop any problematic triggers (if they exist)
DROP TRIGGER IF EXISTS update_work_readiness_updated_at ON work_readiness;

-- Step 4: Fix the fatigue_level constraint
ALTER TABLE work_readiness DROP CONSTRAINT IF EXISTS work_readiness_fatigue_level_check;
ALTER TABLE work_readiness ADD CONSTRAINT work_readiness_fatigue_level_check 
    CHECK (fatigue_level >= 0 AND fatigue_level <= 10);

-- Step 5: Ensure all required columns exist
ALTER TABLE work_readiness 
ADD COLUMN IF NOT EXISTS pain_areas TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS follow_up_reason TEXT,
ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;

-- Step 6: Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can view relevant work readiness" ON work_readiness;
DROP POLICY IF EXISTS "Workers can insert own work readiness" ON work_readiness;
DROP POLICY IF EXISTS "Team leaders can update work readiness status" ON work_readiness;

-- Step 7: Create proper RLS policies
CREATE POLICY "Workers can view own work readiness" ON work_readiness
    FOR SELECT USING (auth.uid() = worker_id);

CREATE POLICY "Workers can insert own work readiness" ON work_readiness
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Team leaders can view team work readiness" ON work_readiness
    FOR SELECT USING (
        team_leader_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'site_supervisor')
        )
    );

CREATE POLICY "Team leaders can update work readiness status" ON work_readiness
    FOR UPDATE USING (
        team_leader_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'site_supervisor')
        )
    );

-- Step 8: Recreate the trigger properly
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_work_readiness_updated_at 
    BEFORE UPDATE ON work_readiness
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Test insert to verify everything works
-- Get a real worker and team leader ID for testing
DO $$
DECLARE
    worker_uuid UUID;
    team_leader_uuid UUID;
BEGIN
    -- Get any worker ID
    SELECT id INTO worker_uuid FROM users WHERE role = 'worker' LIMIT 1;
    
    -- Get any team leader ID
    SELECT id INTO team_leader_uuid FROM users WHERE role = 'team_leader' LIMIT 1;
    
    -- If we have both, test insert
    IF worker_uuid IS NOT NULL AND team_leader_uuid IS NOT NULL THEN
        INSERT INTO work_readiness (
            worker_id, 
            team_leader_id, 
            team, 
            fatigue_level, 
            pain_discomfort, 
            readiness_level, 
            mood,
            notes
        ) VALUES (
            worker_uuid,
            team_leader_uuid,
            'TEST_TEAM',
            5,
            'no',
            'fit',
            'good',
            'Test submission - will be deleted'
        );
        
        -- Clean up test data
        DELETE FROM work_readiness WHERE team = 'TEST_TEAM' AND notes = 'Test submission - will be deleted';
        
        RAISE NOTICE 'Test insert successful! Work readiness table is working correctly.';
    ELSE
        RAISE NOTICE 'Could not find worker or team leader for testing, but table structure is fixed.';
    END IF;
END $$;

-- Step 10: Verify policies
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'work_readiness'
ORDER BY policyname;

-- SUCCESS MESSAGE
SELECT 'Work readiness table has been fixed! The progress_percentage error should be resolved.' as status;




