-- Check Notifications Table Structure
-- This script will check what columns exist in the notifications table

-- ========================================
-- STEP 1: CHECK NOTIFICATIONS TABLE STRUCTURE
-- ========================================

-- Check what columns exist in notifications table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: CHECK IF NOTIFICATIONS TABLE EXISTS
-- ========================================

-- Check if notifications table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'notifications'
        ) 
        THEN '✅ notifications table EXISTS'
        ELSE '❌ notifications table MISSING'
    END as notifications_table_status;

-- ========================================
-- STEP 3: SHOW SAMPLE DATA FROM NOTIFICATIONS TABLE
-- ========================================

-- Show sample data from notifications table (if it exists)
SELECT 
    'SAMPLE NOTIFICATIONS DATA' as section,
    *
FROM public.notifications 
LIMIT 5;

-- ========================================
-- STEP 4: CREATE NOTIFICATIONS TABLE IF MISSING
-- ========================================

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- ========================================
-- STEP 5: ADD MISSING COLUMNS IF NEEDED
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
        ADD COLUMN related_case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ related_case_id column added to notifications table';
    ELSE
        RAISE NOTICE '✅ related_case_id column already exists in notifications table';
    END IF;
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
        ADD COLUMN related_incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ related_incident_id column added to notifications table';
    ELSE
        RAISE NOTICE '✅ related_incident_id column already exists in notifications table';
    END IF;
END $$;

-- ========================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON public.notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- ========================================
-- STEP 7: VERIFY FINAL TABLE STRUCTURE
-- ========================================

-- Check final notifications table structure
SELECT 
    'FINAL NOTIFICATIONS TABLE STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- ========================================
-- STEP 8: TEST NOTIFICATION INSERTION
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

