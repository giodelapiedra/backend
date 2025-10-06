-- Simple Fix: Remove progress_percentage Reference
-- Run this in your Supabase SQL editor

-- Step 1: Check kung may trigger o function na naghahanap ng progress_percentage
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'work_readiness';

-- Step 2: Check kung may function na may progress_percentage
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%progress_percentage%';

-- Step 3: Drop lahat ng triggers sa work_readiness table
DROP TRIGGER IF EXISTS update_work_readiness_updated_at ON work_readiness;
DROP TRIGGER IF EXISTS work_readiness_trigger ON work_readiness;
DROP TRIGGER IF EXISTS work_readiness_insert_trigger ON work_readiness;

-- Step 4: Drop lahat ng functions na may progress_percentage
DROP FUNCTION IF EXISTS calculate_progress_percentage();
DROP FUNCTION IF EXISTS work_readiness_calculate_progress();

-- Step 5: Ensure na may proper INSERT policy
DROP POLICY IF EXISTS "Workers can insert own work readiness" ON work_readiness;
DROP POLICY IF EXISTS "Users can insert work readiness" ON work_readiness;

CREATE POLICY "Workers can insert own work readiness" ON work_readiness
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- Step 6: Fix fatigue_level constraint (0-10 range)
ALTER TABLE work_readiness DROP CONSTRAINT IF EXISTS work_readiness_fatigue_level_check;
ALTER TABLE work_readiness ADD CONSTRAINT work_readiness_fatigue_level_check 
    CHECK (fatigue_level >= 0 AND fatigue_level <= 10);

-- Step 7: Test insert para makita kung working na
DO $$
DECLARE
    worker_uuid UUID;
    team_leader_uuid UUID;
BEGIN
    -- Get any worker ID
    SELECT id INTO worker_uuid FROM users WHERE role = 'worker' LIMIT 1;
    
    -- Get any team leader ID
    SELECT id INTO team_leader_uuid FROM users WHERE role = 'team_leader' LIMIT 1;
    
    IF worker_uuid IS NOT NULL AND team_leader_uuid IS NOT NULL THEN
        INSERT INTO work_readiness (
            worker_id, 
            team_leader_id, 
            team, 
            fatigue_level, 
            pain_discomfort, 
            readiness_level, 
            mood
        ) VALUES (
            worker_uuid,
            team_leader_uuid,
            'TEST_TEAM',
            5,
            'no',
            'fit',
            'good'
        );
        
        -- Clean up test data
        DELETE FROM work_readiness WHERE team = 'TEST_TEAM';
        
        RAISE NOTICE 'SUCCESS: Work readiness insert working na!';
    ELSE
        RAISE NOTICE 'Could not find users for testing';
    END IF;
END $$;

-- Step 8: Check policies
SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'work_readiness';

-- SUCCESS MESSAGE
SELECT 'Tapos na! Pwede mo na i-test yung submit button mo.' as status;
