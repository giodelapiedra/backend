-- Fix Work Readiness Table Sync Issue
-- This script will check and fix the team_leader_id sync in work_readiness table

-- ========================================
-- STEP 1: CHECK WORK READINESS TABLE STRUCTURE
-- ========================================

-- Check what columns exist in work_readiness table
SELECT 
    'WORK READINESS TABLE STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'work_readiness'
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: CHECK IF TEAM_LEADER_ID COLUMN EXISTS
-- ========================================

-- Check if team_leader_id column exists in work_readiness table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'work_readiness' 
            AND column_name = 'team_leader_id'
        ) 
        THEN '✅ team_leader_id column EXISTS in work_readiness table'
        ELSE '❌ team_leader_id column MISSING in work_readiness table'
    END as team_leader_id_status;

-- ========================================
-- STEP 3: ADD MISSING COLUMN IF NEEDED
-- ========================================

-- Add team_leader_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_readiness' 
        AND column_name = 'team_leader_id'
    ) THEN
        ALTER TABLE public.work_readiness 
        ADD COLUMN team_leader_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ team_leader_id column added to work_readiness table';
    ELSE
        RAISE NOTICE '✅ team_leader_id column already exists in work_readiness table';
    END IF;
END $$;

-- ========================================
-- STEP 4: SYNC EXISTING WORK READINESS RECORDS
-- ========================================

-- Update existing work_readiness records with team_leader_id
UPDATE public.work_readiness 
SET team_leader_id = (
    SELECT u.team_leader_id 
    FROM public.users u 
    WHERE u.id = work_readiness.worker_id
)
WHERE team_leader_id IS NULL;

-- ========================================
-- STEP 5: VERIFY SYNC
-- ========================================

-- Check work_readiness records and their team_leader_id sync
SELECT 
    'WORK READINESS SYNC VERIFICATION' as section,
    wr.id as assessment_id,
    wr.worker_id,
    wr.team_leader_id,
    wr.team,
    wr.readiness_level,
    wr.submitted_at,
    w.first_name as worker_name,
    w.last_name as worker_last_name,
    w.team_leader_id as worker_team_leader_id,
    tl.first_name as team_leader_name,
    tl.last_name as team_leader_last_name,
    CASE 
        WHEN wr.team_leader_id = w.team_leader_id THEN '✅ SYNCED'
        ELSE '❌ NOT SYNCED'
    END as sync_status
FROM public.work_readiness wr
LEFT JOIN public.users w ON wr.worker_id = w.id
LEFT JOIN public.users tl ON wr.team_leader_id = tl.id
ORDER BY wr.submitted_at DESC
LIMIT 10;

-- ========================================
-- STEP 6: CHECK SYNC STATISTICS
-- ========================================

-- Check sync statistics
SELECT 
    'SYNC STATISTICS' as section,
    COUNT(*) as total_work_readiness_records,
    COUNT(team_leader_id) as records_with_team_leader_id,
    COUNT(*) - COUNT(team_leader_id) as records_without_team_leader_id,
    ROUND(COUNT(team_leader_id) * 100.0 / COUNT(*), 2) as sync_percentage
FROM public.work_readiness;

-- ========================================
-- STEP 7: CREATE TRIGGER FOR AUTO-SYNC
-- ========================================

-- Create function to auto-sync team_leader_id
CREATE OR REPLACE FUNCTION sync_work_readiness_team_leader()
RETURNS TRIGGER AS $$
BEGIN
    -- If team_leader_id is not provided, get it from the worker
    IF NEW.team_leader_id IS NULL THEN
        SELECT team_leader_id INTO NEW.team_leader_id
        FROM public.users
        WHERE id = NEW.worker_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync team_leader_id on insert
DROP TRIGGER IF EXISTS trigger_sync_work_readiness_team_leader ON public.work_readiness;
CREATE TRIGGER trigger_sync_work_readiness_team_leader
    BEFORE INSERT ON public.work_readiness
    FOR EACH ROW
    EXECUTE FUNCTION sync_work_readiness_team_leader();

-- ========================================
-- STEP 8: TEST AUTO-SYNC
-- ========================================

-- Test auto-sync by inserting a work readiness record without team_leader_id
DO $$
DECLARE
    worker_id UUID;
    team_leader_id UUID;
    work_readiness_id UUID;
BEGIN
    -- Get a worker with team leader
    SELECT w.id, w.team_leader_id
    INTO worker_id, team_leader_id
    FROM public.users w
    WHERE w.role = 'worker'
    AND w.is_active = true
    AND w.team_leader_id IS NOT NULL
    LIMIT 1;
    
    IF worker_id IS NOT NULL AND team_leader_id IS NOT NULL THEN
        -- Insert work readiness record WITHOUT team_leader_id (should auto-sync)
        INSERT INTO public.work_readiness (
            worker_id,
            team,
            fatigue_level,
            pain_discomfort,
            pain_areas,
            readiness_level,
            mood,
            notes,
            submitted_at,
            status
        ) VALUES (
            worker_id,
            (SELECT team FROM public.users WHERE id = worker_id),
            4,
            'no',
            ARRAY[]::TEXT[],
            'fit',
            'good',
            'Test auto-sync work readiness submission',
            NOW(),
            'submitted'
        ) RETURNING id INTO work_readiness_id;
        
        RAISE NOTICE '✅ Auto-sync test: Work readiness record created with ID: %', work_readiness_id;
        RAISE NOTICE '✅ Team leader ID should be auto-synced: %', team_leader_id;
        
    ELSE
        RAISE NOTICE '❌ Could not find worker with team leader for auto-sync test';
    END IF;
END $$;

-- ========================================
-- STEP 9: VERIFY AUTO-SYNC WORKED
-- ========================================

-- Check if auto-sync worked
SELECT 
    'AUTO-SYNC VERIFICATION' as section,
    wr.id as assessment_id,
    wr.worker_id,
    wr.team_leader_id,
    wr.team,
    wr.readiness_level,
    wr.submitted_at,
    w.first_name as worker_name,
    w.team_leader_id as worker_team_leader_id,
    CASE 
        WHEN wr.team_leader_id = w.team_leader_id THEN '✅ AUTO-SYNCED'
        ELSE '❌ AUTO-SYNC FAILED'
    END as auto_sync_status
FROM public.work_readiness wr
LEFT JOIN public.users w ON wr.worker_id = w.id
WHERE wr.notes LIKE '%auto-sync%'
ORDER BY wr.submitted_at DESC
LIMIT 5;

-- ========================================
-- STEP 10: FINAL SYSTEM CHECK
-- ========================================

-- Final system check
SELECT 
    'FINAL SYSTEM CHECK' as section,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users WHERE role = 'worker' AND team_leader_id IS NOT NULL AND is_active = true) > 0 
        THEN '✅ Workers have team leaders'
        ELSE '❌ Workers missing team leaders'
    END as worker_team_leader_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.work_readiness WHERE team_leader_id IS NOT NULL) > 0 
        THEN '✅ Work readiness records have team leaders'
        ELSE '❌ Work readiness records missing team leaders'
    END as work_readiness_sync_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_sync_work_readiness_team_leader')
        THEN '✅ Auto-sync trigger exists'
        ELSE '❌ Auto-sync trigger missing'
    END as auto_sync_trigger_status;

