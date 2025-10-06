-- Check and Assign Specific Team Leaders to Workers
-- This script will check current assignments and assign specific team leaders

-- ========================================
-- STEP 1: CHECK CURRENT TEAM LEADER ASSIGNMENTS
-- ========================================

-- Check all workers and their current team leader assignments
SELECT 
    'CURRENT WORKER ASSIGNMENTS' as section,
    w.id as worker_id,
    w.first_name || ' ' || w.last_name as worker_name,
    w.email as worker_email,
    w.team as worker_team,
    w.team_leader_id,
    tl.first_name || ' ' || tl.last_name as assigned_team_leader_name,
    tl.email as assigned_team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams
FROM public.users w
LEFT JOIN public.users tl ON w.team_leader_id = tl.id
WHERE w.role = 'worker'
AND w.is_active = true
ORDER BY w.team, w.first_name;

-- ========================================
-- STEP 2: CHECK TEAM LEADERS AND THEIR MANAGED TEAMS
-- ========================================

-- Check all team leaders and their managed teams
SELECT 
    'TEAM LEADERS AND MANAGED TEAMS' as section,
    tl.id as team_leader_id,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams,
    COUNT(w.id) as workers_currently_assigned
FROM public.users tl
LEFT JOIN public.users w ON w.team_leader_id = tl.id AND w.role = 'worker' AND w.is_active = true
WHERE tl.role = 'team_leader'
AND tl.is_active = true
GROUP BY tl.id, tl.first_name, tl.last_name, tl.email, tl.team, tl.managed_teams
ORDER BY workers_currently_assigned DESC;

-- ========================================
-- STEP 3: FIND WORKERS WITHOUT SPECIFIC TEAM LEADERS
-- ========================================

-- Find workers who don't have specific team leaders assigned
SELECT 
    'WORKERS WITHOUT SPECIFIC TEAM LEADERS' as section,
    w.id as worker_id,
    w.first_name || ' ' || w.last_name as worker_name,
    w.email as worker_email,
    w.team as worker_team,
    w.team_leader_id,
    CASE 
        WHEN w.team_leader_id IS NULL THEN '❌ NO TEAM LEADER'
        WHEN tl.id IS NULL THEN '❌ INVALID TEAM LEADER ID'
        WHEN tl.role != 'team_leader' THEN '❌ NOT A TEAM LEADER'
        WHEN tl.is_active = false THEN '❌ INACTIVE TEAM LEADER'
        ELSE '✅ VALID TEAM LEADER'
    END as assignment_status
FROM public.users w
LEFT JOIN public.users tl ON w.team_leader_id = tl.id
WHERE w.role = 'worker'
AND w.is_active = true
AND (
    w.team_leader_id IS NULL 
    OR tl.id IS NULL 
    OR tl.role != 'team_leader' 
    OR tl.is_active = false
)
ORDER BY w.team, w.first_name;

-- ========================================
-- STEP 4: ASSIGN SPECIFIC TEAM LEADERS BASED ON TEAM MATCHING
-- ========================================

-- Assign team leaders based on exact team match
UPDATE public.users 
SET team_leader_id = (
    SELECT tl.id 
    FROM public.users tl 
    WHERE tl.role = 'team_leader' 
    AND tl.is_active = true
    AND tl.team = users.team
    LIMIT 1
)
WHERE role = 'worker' 
AND is_active = true
AND team_leader_id IS NULL
AND team IS NOT NULL;

-- Assign team leaders based on managed_teams array
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
AND is_active = true
AND team_leader_id IS NULL
AND team IS NOT NULL;

-- Assign team leaders based on case-insensitive team match
UPDATE public.users 
SET team_leader_id = (
    SELECT tl.id 
    FROM public.users tl 
    WHERE tl.role = 'team_leader' 
    AND tl.is_active = true
    AND LOWER(tl.team) = LOWER(users.team)
    LIMIT 1
)
WHERE role = 'worker' 
AND is_active = true
AND team_leader_id IS NULL
AND team IS NOT NULL;

-- ========================================
-- STEP 5: MANUAL ASSIGNMENT FOR SPECIFIC CASES
-- ========================================

-- Example: Assign all workers in 'TEAM GEO' to admin_team_leader@test.com
UPDATE public.users 
SET team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
WHERE team = 'TEAM GEO'
AND role = 'worker'
AND is_active = true;

-- Example: Assign all workers in 'team gg' to admin_team_leader@test.com
UPDATE public.users 
SET team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
WHERE team = 'team gg'
AND role = 'worker'
AND is_active = true;

-- Example: Assign all workers in 'GG' to admin_team_leader@test.com
UPDATE public.users 
SET team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
WHERE team = 'GG'
AND role = 'worker'
AND is_active = true;

-- ========================================
-- STEP 6: VERIFY SPECIFIC ASSIGNMENTS
-- ========================================

-- Check specific assignments after updates
SELECT 
    'VERIFIED TEAM LEADER ASSIGNMENTS' as section,
    w.id as worker_id,
    w.first_name || ' ' || w.last_name as worker_name,
    w.email as worker_email,
    w.team as worker_team,
    w.team_leader_id,
    tl.first_name || ' ' || tl.last_name as assigned_team_leader_name,
    tl.email as assigned_team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams,
    CASE 
        WHEN w.team = tl.team THEN '✅ EXACT TEAM MATCH'
        WHEN w.team = ANY(tl.managed_teams) THEN '✅ MANAGED TEAM MATCH'
        ELSE '⚠️ OTHER ASSIGNMENT'
    END as assignment_type
FROM public.users w
LEFT JOIN public.users tl ON w.team_leader_id = tl.id
WHERE w.role = 'worker'
AND w.is_active = true
ORDER BY w.team, w.first_name;

-- ========================================
-- STEP 7: SHOW TEAM LEADER SUMMARY
-- ========================================

-- Show team leader summary with specific worker assignments
SELECT 
    'TEAM LEADER SUMMARY' as section,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams,
    COUNT(w.id) as workers_assigned,
    ARRAY_AGG(w.first_name || ' ' || w.last_name) as worker_names,
    ARRAY_AGG(DISTINCT w.team) as worker_teams
FROM public.users tl
LEFT JOIN public.users w ON w.team_leader_id = tl.id AND w.role = 'worker' AND w.is_active = true
WHERE tl.role = 'team_leader' 
AND tl.is_active = true
GROUP BY tl.id, tl.first_name, tl.last_name, tl.email, tl.team, tl.managed_teams
ORDER BY workers_assigned DESC;

-- ========================================
-- STEP 8: TEST NOTIFICATION WITH SPECIFIC TEAM LEADER
-- ========================================

-- Test notification for admin_team_leader@test.com specifically
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
    test_notification_id UUID;
    worker_name TEXT;
    team_leader_name TEXT;
    worker_team TEXT;
BEGIN
    -- Get admin_team_leader@test.com ID
    SELECT id, first_name || ' ' || last_name
    INTO team_leader_id, team_leader_name
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader';
    
    -- Get a worker assigned to this team leader
    SELECT w.id, w.first_name || ' ' || w.last_name, w.team
    INTO worker_id, worker_name, worker_team
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
            'TEST: Specific Team Leader Notification',
            worker_name || ' has submitted their work readiness assessment. Team: ' || worker_team || '. Assigned to: ' || team_leader_name,
            'medium',
            false,
            '/team-leader',
            jsonb_build_object(
                'worker_id', worker_id,
                'worker_name', worker_name,
                'worker_team', worker_team,
                'team_leader_id', team_leader_id,
                'team_leader_name', team_leader_name,
                'team_leader_email', 'admin_team_leader@test.com',
                'test', true,
                'timestamp', now()
            )
        ) RETURNING id INTO test_notification_id;
        
        RAISE NOTICE '✅ Test notification created with ID: %', test_notification_id;
        RAISE NOTICE '✅ Sent from worker % to specific team leader %', worker_id, team_leader_id;
        RAISE NOTICE '✅ Team leader: %', team_leader_name;
        
    ELSE
        RAISE NOTICE '❌ Could not find worker assigned to admin_team_leader@test.com';
    END IF;
END $$;

-- ========================================
-- STEP 9: VERIFY SPECIFIC NOTIFICATION
-- ========================================

-- Check if specific notification was created
SELECT 
    'SPECIFIC NOTIFICATION VERIFICATION' as section,
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
    sender.email as sender_email,
    n.metadata
FROM public.notifications n
LEFT JOIN public.users tl ON n.recipient_id = tl.id
LEFT JOIN public.users sender ON n.sender_id = sender.id
WHERE tl.email = 'admin_team_leader@test.com'
AND n.title LIKE 'TEST:%'
ORDER BY n.created_at DESC
LIMIT 5;
