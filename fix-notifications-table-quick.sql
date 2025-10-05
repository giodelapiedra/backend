-- Quick Fix: Add Missing Columns to Notifications Table
-- This script will add the missing action_url column

-- ========================================
-- STEP 1: CHECK CURRENT NOTIFICATIONS TABLE STRUCTURE
-- ========================================

-- Check what columns exist in notifications table
SELECT 
    'CURRENT NOTIFICATIONS TABLE STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: ADD MISSING COLUMNS
-- ========================================

-- Add action_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'action_url'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN action_url VARCHAR(255);
        
        RAISE NOTICE '✅ action_url column added to notifications table';
    ELSE
        RAISE NOTICE '✅ action_url column already exists in notifications table';
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE '✅ action_url column already exists in notifications table';
END $$;

-- Add related_case_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'related_case_id'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN related_case_id UUID;
        
        RAISE NOTICE '✅ related_case_id column added to notifications table';
    ELSE
        RAISE NOTICE '✅ related_case_id column already exists in notifications table';
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE '✅ related_case_id column already exists in notifications table';
END $$;

-- Add related_incident_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'related_incident_id'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN related_incident_id UUID;
        
        RAISE NOTICE '✅ related_incident_id column added to notifications table';
    ELSE
        RAISE NOTICE '✅ related_incident_id column already exists in notifications table';
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE '✅ related_incident_id column already exists in notifications table';
END $$;

-- Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE '✅ metadata column added to notifications table';
    ELSE
        RAISE NOTICE '✅ metadata column already exists in notifications table';
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE '✅ metadata column already exists in notifications table';
END $$;

-- ========================================
-- STEP 3: VERIFY FINAL TABLE STRUCTURE
-- ========================================

-- Check final notifications table structure
SELECT 
    'FINAL NOTIFICATIONS TABLE STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- ========================================
-- STEP 4: TEST NOTIFICATION INSERTION
-- ========================================

-- Test inserting a simple notification
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get a team leader
    SELECT id INTO team_leader_id
    FROM public.users 
    WHERE role = 'team_leader'
    AND is_active = true
    LIMIT 1;
    
    -- Get a worker
    SELECT id INTO worker_id
    FROM public.users 
    WHERE role = 'worker'
    AND is_active = true
    LIMIT 1;
    
    -- Insert test notification
    IF team_leader_id IS NOT NULL AND worker_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            recipient_id,
            sender_id,
            type,
            title,
            message,
            priority,
            is_read,
            action_url,
            metadata
        ) VALUES (
            team_leader_id,
            worker_id,
            'work_readiness_submitted',
            'TEST: Notification System Test',
            'This is a test notification to verify the notification system is working.',
            'medium',
            false,
            '/team-leader',
            jsonb_build_object(
                'test', true,
                'timestamp', now()
            )
        ) RETURNING id INTO test_notification_id;
        
        RAISE NOTICE '✅ Test notification created with ID: %', test_notification_id;
    ELSE
        RAISE NOTICE '❌ Could not find team leader or worker for test';
    END IF;
END $$;

-- ========================================
-- STEP 5: VERIFY TEST NOTIFICATION
-- ========================================

-- Check if test notification was created
SELECT 
    'TEST NOTIFICATION RESULT' as section,
    n.id,
    n.recipient_id,
    n.sender_id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.is_read,
    n.action_url,
    n.created_at,
    tl.first_name as team_leader_name,
    tl.email as team_leader_email,
    sender.first_name as sender_name,
    sender.email as sender_email
FROM public.notifications n
LEFT JOIN public.users tl ON n.recipient_id = tl.id
LEFT JOIN public.users sender ON n.sender_id = sender.id
WHERE n.title LIKE 'TEST:%'
ORDER BY n.created_at DESC
LIMIT 5;
