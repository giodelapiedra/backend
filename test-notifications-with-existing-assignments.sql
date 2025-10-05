-- Test Work Readiness Notifications with Existing Team Leader Assignments
-- This script will test if notifications work with the existing team_leader_id assignments

-- ========================================
-- STEP 1: VERIFY CURRENT TEAM LEADER ASSIGNMENTS
-- ========================================

-- Check current team leader assignments
SELECT 
    'CURRENT TEAM LEADER ASSIGNMENTS' as section,
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
-- STEP 2: CHECK ASSIGNMENT STATISTICS
-- ========================================

-- Check assignment statistics
SELECT 
    'ASSIGNMENT STATISTICS' as section,
    COUNT(*) as total_workers,
    COUNT(team_leader_id) as workers_with_team_leaders,
    COUNT(*) - COUNT(team_leader_id) as workers_without_team_leaders,
    ROUND(COUNT(team_leader_id) * 100.0 / COUNT(*), 2) as assignment_percentage
FROM public.users 
WHERE role = 'worker' 
AND is_active = true;

-- ========================================
-- STEP 3: TEST WORK READINESS SUBMISSION WITH NOTIFICATION
-- ========================================

-- Test work readiness submission with notification
DO $$
DECLARE
    worker_id UUID;
    tl_id UUID;
    work_readiness_id UUID;
    notification_id UUID;
    worker_name TEXT;
    team_leader_name TEXT;
    worker_team TEXT;
BEGIN
    -- Get a worker who has a team leader assigned
    SELECT w.id, w.first_name || ' ' || w.last_name, w.team, w.team_leader_id
    INTO worker_id, worker_name, worker_team, tl_id
    FROM public.users w
    WHERE w.role = 'worker'
    AND w.is_active = true
    AND w.team_leader_id IS NOT NULL
    LIMIT 1;
    
    -- Get team leader name
    SELECT tl.first_name || ' ' || tl.last_name
    INTO team_leader_name
    FROM public.users tl
    WHERE tl.id = tl_id;
    
    -- Check if we found a worker with team leader
    IF worker_id IS NOT NULL AND tl_id IS NOT NULL THEN
        RAISE NOTICE 'Found worker: % (ID: %)', worker_name, worker_id;
        RAISE NOTICE 'Team leader: % (ID: %)', team_leader_name, tl_id;
        RAISE NOTICE 'Worker team: %', worker_team;
        
        -- Create work readiness assessment
        INSERT INTO public.work_readiness (
            worker_id,
            team_leader_id,
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
            tl_id,
            worker_team,
            3,
            'no',
            ARRAY[]::TEXT[],
            'fit',
            'good',
            'Test work readiness submission with existing team leader assignment',
            NOW(),
            'submitted'
        ) RETURNING id INTO work_readiness_id;
        
        RAISE NOTICE 'Work readiness assessment created with ID: %', work_readiness_id;
        
        -- Create notification for team leader
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
            tl_id,
            worker_id,
            'work_readiness_submitted',
            '✅ Work Readiness Assessment Submitted',
            worker_name || ' has submitted their work readiness assessment. Status: Fit for Work. Team: ' || worker_team || '.',
            'medium',
            false,
            '/team-leader',
            jsonb_build_object(
                'worker_id', worker_id,
                'worker_name', worker_name,
                'worker_team', worker_team,
                'team_leader_id', tl_id,
                'team_leader_name', team_leader_name,
                'readiness_level', 'fit',
                'fatigue_level', 3,
                'mood', 'good',
                'assessment_id', work_readiness_id,
                'timestamp', now()
            )
        ) RETURNING id INTO notification_id;
        
        RAISE NOTICE 'Notification created with ID: %', notification_id;
        RAISE NOTICE '✅ SUCCESS: Work readiness notification sent to team leader!';
        
    ELSE
        RAISE NOTICE '❌ ERROR: Could not find worker with team leader assignment';
    END IF;
END $$;

-- ========================================
-- STEP 4: VERIFY NOTIFICATION WAS CREATED
-- ========================================

-- Check if notification was created successfully
SELECT 
    'NOTIFICATION VERIFICATION' as section,
    n.id as notification_id,
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
WHERE n.type = 'work_readiness_submitted'
ORDER BY n.created_at DESC
LIMIT 5;

-- ========================================
-- STEP 5: VERIFY WORK READINESS ASSESSMENT
-- ========================================

-- Check if work readiness assessment was created
SELECT 
    'WORK READINESS VERIFICATION' as section,
    wr.id as assessment_id,
    wr.worker_id,
    wr.team_leader_id,
    wr.team,
    wr.readiness_level,
    wr.fatigue_level,
    wr.mood,
    wr.submitted_at,
    w.first_name as worker_name,
    w.last_name as worker_last_name,
    tl.first_name as team_leader_name,
    tl.last_name as team_leader_last_name
FROM public.work_readiness wr
LEFT JOIN public.users w ON wr.worker_id = w.id
LEFT JOIN public.users tl ON wr.team_leader_id = tl.id
ORDER BY wr.submitted_at DESC
LIMIT 5;

-- ========================================
-- STEP 6: TEST DIFFERENT READINESS LEVELS
-- ========================================

-- Test notification for "not_fit" readiness level
DO $$
DECLARE
    worker_id UUID;
    tl_id UUID;
    work_readiness_id UUID;
    notification_id UUID;
    worker_name TEXT;
    team_leader_name TEXT;
    worker_team TEXT;
BEGIN
    -- Get a different worker
    SELECT w.id, w.first_name || ' ' || w.last_name, w.team, w.team_leader_id
    INTO worker_id, worker_name, worker_team, tl_id
    FROM public.users w
    WHERE w.role = 'worker'
    AND w.is_active = true
    AND w.team_leader_id IS NOT NULL
    AND w.id NOT IN (SELECT worker_id FROM public.work_readiness WHERE submitted_at >= NOW() - INTERVAL '1 minute')
    LIMIT 1;
    
    -- Get team leader name
    SELECT tl.first_name || ' ' || tl.last_name
    INTO team_leader_name
    FROM public.users tl
    WHERE tl.id = tl_id;
    
    IF worker_id IS NOT NULL AND tl_id IS NOT NULL THEN
        -- Create work readiness assessment with "not_fit" status
        INSERT INTO public.work_readiness (
            worker_id,
            team_leader_id,
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
            tl_id,
            worker_team,
            8,
            'yes',
            ARRAY['back', 'neck']::TEXT[],
            'not_fit',
            'poor',
            'High fatigue and pain levels - not fit for work',
            NOW(),
            'submitted'
        ) RETURNING id INTO work_readiness_id;
        
        -- Create HIGH PRIORITY notification for "not_fit" status
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
            tl_id,
            worker_id,
            'work_readiness_submitted',
            '🚨 Work Readiness Assessment - NOT FIT',
            worker_name || ' has submitted their work readiness assessment. Status: NOT FIT FOR WORK. Team: ' || worker_team || '.',
            'high',
            false,
            '/team-leader',
            jsonb_build_object(
                'worker_id', worker_id,
                'worker_name', worker_name,
                'worker_team', worker_team,
                'team_leader_id', tl_id,
                'team_leader_name', team_leader_name,
                'readiness_level', 'not_fit',
                'fatigue_level', 8,
                'mood', 'poor',
                'assessment_id', work_readiness_id,
                'timestamp', now()
            )
        ) RETURNING id INTO notification_id;
        
        RAISE NOTICE '✅ HIGH PRIORITY notification created for NOT FIT status: %', notification_id;
        
    ELSE
        RAISE NOTICE '❌ Could not find another worker for NOT FIT test';
    END IF;
END $$;

-- ========================================
-- STEP 7: FINAL VERIFICATION
-- ========================================

-- Check all recent notifications
SELECT 
    'ALL RECENT NOTIFICATIONS' as section,
    n.id,
    n.title,
    n.message,
    n.priority,
    n.is_read,
    n.created_at,
    tl.first_name as team_leader_name,
    tl.email as team_leader_email,
    sender.first_name as sender_name
FROM public.notifications n
LEFT JOIN public.users tl ON n.recipient_id = tl.id
LEFT JOIN public.users sender ON n.sender_id = sender.id
WHERE n.type = 'work_readiness_submitted'
AND n.created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY n.created_at DESC;

-- System status check
SELECT 
    'SYSTEM STATUS' as section,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users WHERE role = 'team_leader' AND is_active = true) > 0 
        THEN '✅ Team leaders exist'
        ELSE '❌ No active team leaders'
    END as team_leaders_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users WHERE role = 'worker' AND team_leader_id IS NOT NULL AND is_active = true) > 0 
        THEN '✅ Workers have team leaders'
        ELSE '❌ Workers missing team leaders'
    END as team_assignment_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.notifications WHERE type = 'work_readiness_submitted' AND created_at >= NOW() - INTERVAL '5 minutes') > 0 
        THEN '✅ Recent work readiness notifications exist'
        ELSE '⚠️ No recent work readiness notifications'
    END as notification_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.work_readiness WHERE submitted_at >= NOW() - INTERVAL '5 minutes') > 0 
        THEN '✅ Recent work readiness assessments exist'
        ELSE '⚠️ No recent work readiness assessments'
    END as assessment_status;
