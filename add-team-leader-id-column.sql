-- Simple Fix: Add team_leader_id column to users table
-- Based on the actual users table schema provided

-- ========================================
-- STEP 1: ADD MISSING COLUMN
-- ========================================

-- Add team_leader_id column to users table
ALTER TABLE public.users 
ADD COLUMN team_leader_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_team_leader_id ON public.users(team_leader_id);

-- Add comment to document the column
COMMENT ON COLUMN public.users.team_leader_id IS 'ID of the team leader who manages this user. Used for workers to link to their team leader.';

-- ========================================
-- STEP 2: VERIFY COLUMN ADDITION
-- ========================================

-- Check if column was added successfully
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'team_leader_id';

-- ========================================
-- STEP 3: POPULATE TEAM LEADER ASSIGNMENTS
-- ========================================

-- Assign team leaders to workers based on team matching
UPDATE public.users 
SET team_leader_id = (
    SELECT tl.id 
    FROM public.users tl 
    WHERE tl.role = 'team_leader' 
    AND tl.is_active = true
    AND (
        users.team = tl.team 
        OR users.team = ANY(tl.managed_teams)
    )
    LIMIT 1
)
WHERE role = 'worker' 
AND team_leader_id IS NULL
AND team IS NOT NULL;

-- ========================================
-- STEP 4: VERIFY TEAM ASSIGNMENTS
-- ========================================

-- Check team assignment coverage
SELECT 
    'TEAM ASSIGNMENT COVERAGE' as section,
    COUNT(*) as total_workers,
    COUNT(team_leader_id) as workers_with_team_leaders,
    COUNT(*) - COUNT(team_leader_id) as workers_without_team_leaders,
    ROUND(COUNT(team_leader_id) * 100.0 / COUNT(*), 2) as coverage_percentage
FROM public.users 
WHERE role = 'worker' 
AND is_active = true;

-- Show team leader assignments
SELECT 
    'TEAM LEADER ASSIGNMENTS' as section,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams,
    COUNT(w.id) as workers_managed,
    ARRAY_AGG(w.first_name || ' ' || w.last_name) as worker_names
FROM public.users tl
LEFT JOIN public.users w ON w.team_leader_id = tl.id AND w.role = 'worker' AND w.is_active = true
WHERE tl.role = 'team_leader' 
AND tl.is_active = true
GROUP BY tl.id, tl.first_name, tl.last_name, tl.email, tl.team, tl.managed_teams
ORDER BY workers_managed DESC;

-- ========================================
-- STEP 5: TEST NOTIFICATION SYSTEM
-- ========================================

-- Test notification creation
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get a team leader with managed teams
    SELECT id INTO team_leader_id
    FROM public.users 
    WHERE role = 'team_leader'
    AND managed_teams IS NOT NULL
    AND array_length(managed_teams, 1) > 0
    AND is_active = true
    LIMIT 1;
    
    -- Get a worker from their team
    SELECT u.id INTO worker_id
    FROM public.users u
    WHERE u.role = 'worker'
    AND u.is_active = true
    AND u.team_leader_id = team_leader_id
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
            'TEST: Work Readiness Notification Test',
            'This is a test notification to verify the notification system is working properly.',
            'medium',
            false,
            '/team-leader',
            jsonb_build_object(
                'worker_id', worker_id,
                'test', true,
                'timestamp', now()
            )
        ) RETURNING id INTO test_notification_id;
        
        RAISE NOTICE '✅ Test notification created with ID: %', test_notification_id;
        RAISE NOTICE '✅ Sent from worker % to team leader %', worker_id, team_leader_id;
    ELSE
        RAISE NOTICE '❌ Could not find team leader (%) or worker (%) for test', team_leader_id, worker_id;
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

-- ========================================
-- STEP 6: FINAL SYSTEM CHECK
-- ========================================

-- System health check
SELECT 
    'SYSTEM HEALTH CHECK' as section,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users WHERE role = 'team_leader' AND is_active = true) > 0 
        THEN '✅ Team leaders exist'
        ELSE '❌ No active team leaders'
    END as team_leaders_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users WHERE role = 'worker' AND is_active = true) > 0 
        THEN '✅ Workers exist'
        ELSE '❌ No active workers'
    END as workers_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users WHERE role = 'worker' AND team_leader_id IS NOT NULL AND is_active = true) > 0 
        THEN '✅ Workers have team leaders'
        ELSE '❌ Workers missing team leaders'
    END as team_assignment_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.notifications WHERE type = 'work_readiness_submitted') > 0 
        THEN '✅ Work readiness notifications exist'
        ELSE '⚠️ No work readiness notifications found'
    END as notification_status;

