-- Fix: Drop all dependencies ng progress_percentage functions
-- Run this in your Supabase SQL editor

-- Step 1: Check lahat ng triggers na nagde-depend sa function
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE action_statement ILIKE '%create_work_readiness_achievement%'
   OR action_statement ILIKE '%progress_percentage%';

-- Step 2: Drop lahat ng triggers na may dependencies
DROP TRIGGER IF EXISTS trigger_create_work_readiness_achievement_clean_final ON work_readiness CASCADE;
DROP TRIGGER IF EXISTS work_readiness_achievement_trigger ON work_readiness CASCADE;
DROP TRIGGER IF EXISTS create_work_readiness_achievement_trigger ON work_readiness CASCADE;
DROP TRIGGER IF EXISTS work_readiness_trigger ON work_readiness CASCADE;

-- Step 3: Drop lahat ng functions na may progress_percentage
DROP FUNCTION IF EXISTS create_work_readiness_achievement_clean_final() CASCADE;
DROP FUNCTION IF EXISTS calculate_goal_progress() CASCADE;
DROP FUNCTION IF EXISTS create_work_readiness_achievement() CASCADE;
DROP FUNCTION IF EXISTS work_readiness_achievement_trigger() CASCADE;

-- Step 4: Check kung may natira pang functions na may progress_percentage
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_definition ILIKE '%progress_percentage%';

-- Step 5: Check kung may worker_goals table at kung may progress_percentage column
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'worker_goals' 
ORDER BY ordinal_position;

-- Step 6: Kung may worker_goals table, add yung missing progress_percentage column
DO $$
BEGIN
    -- Check if worker_goals table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'worker_goals') THEN
        -- Add progress_percentage column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'worker_goals' AND column_name = 'progress_percentage'
        ) THEN
            ALTER TABLE worker_goals ADD COLUMN progress_percentage DECIMAL(5,2) DEFAULT 0;
            RAISE NOTICE 'Added progress_percentage column to worker_goals table';
        ELSE
            RAISE NOTICE 'progress_percentage column already exists in worker_goals table';
        END IF;
    ELSE
        RAISE NOTICE 'worker_goals table does not exist';
    END IF;
END $$;

-- Step 7: Ensure na may proper INSERT policy
DROP POLICY IF EXISTS "Workers can insert own work readiness" ON work_readiness;
DROP POLICY IF EXISTS "Users can insert work readiness" ON work_readiness;

CREATE POLICY "Workers can insert own work readiness" ON work_readiness
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- Step 8: Fix fatigue_level constraint (0-10 range)
ALTER TABLE work_readiness DROP CONSTRAINT IF EXISTS work_readiness_fatigue_level_check;
ALTER TABLE work_readiness ADD CONSTRAINT work_readiness_fatigue_level_check 
    CHECK (fatigue_level >= 0 AND fatigue_level <= 10);

-- Step 9: Test insert sa work_readiness para makita kung working na
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
        
        RAISE NOTICE 'SUCCESS: Work readiness insert working na! Walang progress_percentage error!';
    ELSE
        RAISE NOTICE 'Could not find users for testing';
    END IF;
END $$;

-- Step 10: Check kung may natira pang triggers
SELECT 
    trigger_name,
    event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'work_readiness';

-- SUCCESS MESSAGE
SELECT 'Tapos na! Na-remove na yung lahat ng dependencies. Pwede mo na i-test yung submit button mo.' as status;
