-- Check and Assign Workers to admin_team_leader@test.com
-- This script will check the team leader's managed teams and assign workers accordingly

-- ========================================
-- STEP 1: CHECK TEAM LEADER'S MANAGED TEAMS
-- ========================================

-- Check admin_team_leader@test.com and their managed teams
SELECT 
    'TEAM LEADER INFO' as section,
    id,
    first_name,
    last_name,
    email,
    team,
    managed_teams,
    is_active
FROM public.users 
WHERE email = 'admin_team_leader@test.com';

-- ========================================
-- STEP 2: CHECK WORKERS IN MANAGED TEAMS
-- ========================================

-- Check workers in the teams managed by admin_team_leader@test.com
SELECT 
    'WORKERS IN MANAGED TEAMS' as section,
    w.id,
    w.first_name,
    w.last_name,
    w.email,
    w.team,
    w.team_leader_id,
    w.is_active
FROM public.users w
WHERE w.role = 'worker'
AND w.is_active = true
AND w.team IN (
    SELECT unnest(managed_teams) 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
)
ORDER BY w.team, w.first_name;

-- ========================================
-- STEP 3: ASSIGN WORKERS TO TEAM LEADER
-- ========================================

-- Assign all workers in managed teams to admin_team_leader@test.com
UPDATE public.users 
SET team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
WHERE role = 'worker' 
AND is_active = true
AND team IN (
    SELECT unnest(managed_teams) 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
);

-- ========================================
-- STEP 4: VERIFY ASSIGNMENTS
-- ========================================

-- Check if workers were assigned successfully
SELECT 
    'ASSIGNMENT VERIFICATION' as section,
    COUNT(*) as total_workers_in_managed_teams,
    COUNT(team_leader_id) as workers_assigned_to_team_leader,
    COUNT(*) - COUNT(team_leader_id) as workers_not_assigned
FROM public.users w
WHERE w.role = 'worker'
AND w.is_active = true
AND w.team IN (
    SELECT unnest(managed_teams) 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
);

-- Show detailed assignments
SELECT 
    'DETAILED ASSIGNMENTS' as section,
    w.first_name || ' ' || w.last_name as worker_name,
    w.email as worker_email,
    w.team as worker_team,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email,
    tl.managed_teams
FROM public.users w
LEFT JOIN public.users tl ON w.team_leader_id = tl.id
WHERE w.role = 'worker'
AND w.is_active = true
AND w.team IN (
    SELECT unnest(managed_teams) 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
)
ORDER BY w.team, w.first_name;

-- ========================================
-- STEP 5: TEST NOTIFICATION SYSTEM
-- ========================================

-- Test notification creation for admin_team_leader@test.com
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get admin_team_leader@test.com ID
    SELECT id INTO team_leader_id
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader';
    
    -- Get a worker from their managed teams
    SELECT w.id INTO worker_id
    FROM public.users w
    WHERE w.role = 'worker'
    AND w.is_active = true
    AND w.team_leader_id = team_leader_id
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
            'TEST: Work Readiness Notification for admin_team_leader@test.com',
            'This is a test notification to verify the notification system is working for admin_team_leader@test.com.',
            'medium',
            false,
            '/team-leader',
            jsonb_build_object(
                'worker_id', worker_id,
                'team_leader_email', 'admin_team_leader@test.com',
                'test', true,
                'timestamp', now()
            )
        ) RETURNING id INTO test_notification_id;
        
        RAISE NOTICE '✅ Test notification created with ID: %', test_notification_id;
        RAISE NOTICE '✅ Sent from worker % to admin_team_leader@test.com (%)', worker_id, team_leader_id;
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
WHERE tl.email = 'admin_team_leader@test.com'
AND n.title LIKE 'TEST:%'
ORDER BY n.created_at DESC
LIMIT 5;

-- ========================================
-- STEP 6: SHOW TEAM LEADER SUMMARY
-- ========================================

-- Show summary for admin_team_leader@test.com
SELECT 
    'TEAM LEADER SUMMARY' as section,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams,
    COUNT(w.id) as workers_managed,
    ARRAY_AGG(w.first_name || ' ' || w.last_name) as worker_names,
    ARRAY_AGG(w.team) as worker_teams
FROM public.users tl
LEFT JOIN public.users w ON w.team_leader_id = tl.id AND w.role = 'worker' AND w.is_active = true
WHERE tl.email = 'admin_team_leader@test.com'
GROUP BY tl.id, tl.first_name, tl.last_name, tl.email, tl.team, tl.managed_teams;

-- ========================================
-- STEP 7: CHECK ALL TEAM LEADERS AND THEIR ASSIGNMENTS
-- ========================================

-- Show all team leaders and their worker assignments
SELECT 
    'ALL TEAM LEADERS SUMMARY' as section,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams,
    COUNT(w.id) as workers_managed,
    ARRAY_AGG(DISTINCT w.team) as managed_worker_teams
FROM public.users tl
LEFT JOIN public.users w ON w.team_leader_id = tl.id AND w.role = 'worker' AND w.is_active = true
WHERE tl.role = 'team_leader' 
AND tl.is_active = true
GROUP BY tl.id, tl.first_name, tl.last_name, tl.email, tl.team, tl.managed_teams
ORDER BY workers_managed DESC;
