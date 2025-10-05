-- Debug Script for Work Readiness Error
-- Run this to identify the exact cause of the "progress_percentage" error

-- Step 1: Check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'work_readiness' 
ORDER BY ordinal_position;

-- Step 2: Check all triggers on work_readiness table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'work_readiness';

-- Step 3: Check all functions that might be called by triggers
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%work_readiness%' 
   OR routine_definition ILIKE '%progress_percentage%';

-- Step 4: Check RLS policies
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

-- Step 5: Check constraints
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'work_readiness'::regclass;

-- Step 6: Try a simple insert to see what happens
-- First, let's see what data we're trying to insert
SELECT 'Testing insert with sample data...' as test_status;

-- Get sample user IDs
SELECT 
    'Available users:' as info,
    id,
    role,
    first_name,
    last_name
FROM users 
WHERE role IN ('worker', 'team_leader')
LIMIT 5;

-- Step 7: Test insert (this will show the exact error)
DO $$
DECLARE
    worker_uuid UUID;
    team_leader_uuid UUID;
    test_result TEXT;
BEGIN
    -- Get any worker ID
    SELECT id INTO worker_uuid FROM users WHERE role = 'worker' LIMIT 1;
    
    -- Get any team leader ID  
    SELECT id INTO team_leader_uuid FROM users WHERE role = 'team_leader' LIMIT 1;
    
    IF worker_uuid IS NOT NULL AND team_leader_uuid IS NOT NULL THEN
        BEGIN
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
                'DEBUG_TEAM',
                5,
                'no',
                'fit',
                'good'
            );
            
            test_result := 'SUCCESS: Insert worked without errors';
            
            -- Clean up
            DELETE FROM work_readiness WHERE team = 'DEBUG_TEAM';
            
        EXCEPTION WHEN OTHERS THEN
            test_result := 'ERROR: ' || SQLERRM;
        END;
        
        RAISE NOTICE '%', test_result;
    ELSE
        RAISE NOTICE 'ERROR: Could not find worker or team leader for testing';
    END IF;
END $$;

-- Step 8: Check if there are any views that might be interfering
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name ILIKE '%work_readiness%';

-- Step 9: Check for any materialized views
SELECT 
    schemaname,
    matviewname,
    definition
FROM pg_matviews 
WHERE matviewname ILIKE '%work_readiness%';

-- Final status
SELECT 'Debug script completed. Check the results above to identify the issue.' as final_status;
