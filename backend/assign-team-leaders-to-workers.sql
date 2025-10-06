-- Assign Team Leaders to Workers
-- This script will assign team leaders to workers based on their team assignments

-- ========================================
-- STEP 1: CHECK CURRENT STATE
-- ========================================

-- Check current team leaders and their managed teams
SELECT 
    'CURRENT TEAM LEADERS' as section,
    id,
    first_name,
    last_name,
    email,
    team,
    managed_teams,
    is_active
FROM public.users 
WHERE role = 'team_leader'
ORDER BY first_name;

-- Check current workers and their teams
SELECT 
    'CURRENT WORKERS' as section,
    id,
    first_name,
    last_name,
    email,
    team,
    team_leader_id,
    is_active
FROM public.users 
WHERE role = 'worker'
ORDER BY team, first_name;

-- ========================================
-- STEP 2: ASSIGN TEAM LEADERS TO WORKERS
-- ========================================

-- Method 1: Assign by exact team match
UPDATE public.users 
SET team_leader_id = (
    SELECT tl.id 
    FROM public.users tl 
    WHERE tl.role = 'team_leader' 
    AND tl.is_active = true
    AND users.team = tl.team
    LIMIT 1
)
WHERE role = 'worker' 
AND team_leader_id IS NULL
AND team IS NOT NULL;

-- Method 2: Assign by managed_teams array
UPDATE public.users 
SET team_leader_id = (
    SELECT tl.id 
    FROM public.users tl 
    WHERE tl.role = 'team_leader' 
    AND tl.is_active = true
    AND users.team = ANY(tl.managed_teams)
    LIMIT 1
)
WHERE role = 'worker' 
AND team_leader_id IS NULL
AND team IS NOT NULL;

-- Method 3: Assign by case-insensitive team match
UPDATE public.users 
SET team_leader_id = (
    SELECT tl.id 
    FROM public.users tl 
    WHERE tl.role = 'team_leader' 
    AND tl.is_active = true
    AND LOWER(users.team) = LOWER(tl.team)
    LIMIT 1
)
WHERE role = 'worker' 
AND team_leader_id IS NULL
AND team IS NOT NULL;

-- Method 4: Assign by case-insensitive managed_teams
UPDATE public.users 
SET team_leader_id = (
    SELECT tl.id 
    FROM public.users tl 
    WHERE tl.role = 'team_leader' 
    AND tl.is_active = true
    AND EXISTS (
        SELECT 1 
        FROM unnest(tl.managed_teams) AS managed_team 
        WHERE LOWER(managed_team) = LOWER(users.team)
    )
    LIMIT 1
)
WHERE role = 'worker' 
AND team_leader_id IS NULL
AND team IS NOT NULL;

-- ========================================
-- STEP 3: VERIFY ASSIGNMENTS
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

-- Show detailed team assignments
SELECT 
    'DETAILED TEAM ASSIGNMENTS' as section,
    w.first_name || ' ' || w.last_name as worker_name,
    w.email as worker_email,
    w.team as worker_team,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams
FROM public.users w
LEFT JOIN public.users tl ON w.team_leader_id = tl.id
WHERE w.role = 'worker' 
AND w.is_active = true
ORDER BY w.team, w.first_name;

-- ========================================
-- STEP 4: MANUAL ASSIGNMENT FOR SPECIFIC CASES
-- ========================================

-- If you need to manually assign specific workers to specific team leaders
-- Uncomment and modify the following queries:

-- Example: Assign worker with email 'worker@example.com' to team leader with email 'teamleader@example.com'
-- UPDATE public.users 
-- SET team_leader_id = (
--     SELECT id FROM public.users 
--     WHERE email = 'teamleader@example.com' 
--     AND role = 'team_leader'
-- )
-- WHERE email = 'worker@example.com' 
-- AND role = 'worker';

-- Example: Assign all workers in 'TEAM GEO' to specific team leader
-- UPDATE public.users 
-- SET team_leader_id = (
--     SELECT id FROM public.users 
--     WHERE email = 'admin_team_leader@test.com' 
--     AND role = 'team_leader'
-- )
-- WHERE team = 'TEAM GEO' 
-- AND role = 'worker';

-- ========================================
-- STEP 5: SHOW TEAM LEADER SUMMARY
-- ========================================

-- Show team leader summary with worker counts
SELECT 
    'TEAM LEADER SUMMARY' as section,
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
-- STEP 6: TEST NOTIFICATION SYSTEM
-- ========================================

-- Test notification creation
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get a team leader with workers
    SELECT tl.id INTO team_leader_id
    FROM public.users tl
    WHERE tl.role = 'team_leader'
    AND tl.is_active = true
    AND EXISTS (
        SELECT 1 FROM public.users w 
        WHERE w.team_leader_id = tl.id 
        AND w.role = 'worker' 
        AND w.is_active = true
    )
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
