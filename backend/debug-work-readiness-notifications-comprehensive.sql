-- Comprehensive Work Readiness Notification Debug Script
-- Run this in your Supabase SQL Editor to diagnose and fix notification issues

-- ========================================
-- SECTION 1: DIAGNOSTIC QUERIES
-- ========================================

-- 1.1 Check all team leaders and their managed teams
SELECT 
    'TEAM LEADERS' as section,
    id,
    first_name,
    last_name,
    email,
    role,
    team,
    managed_teams,
    is_active,
    created_at
FROM users 
WHERE role = 'team_leader'
ORDER BY first_name;

-- 1.2 Check all workers and their team assignments
SELECT 
    'WORKERS' as section,
    id,
    first_name,
    last_name,
    email,
    role,
    team,
    team_leader_id,
    is_active,
    created_at
FROM users 
WHERE role = 'worker'
ORDER BY team, first_name;

-- 1.3 Check team assignment coverage
SELECT 
    'TEAM ASSIGNMENT COVERAGE' as section,
    COUNT(*) as total_workers,
    COUNT(team_leader_id) as workers_with_team_leaders,
    COUNT(*) - COUNT(team_leader_id) as workers_without_team_leaders,
    ROUND(COUNT(team_leader_id) * 100.0 / COUNT(*), 2) as coverage_percentage
FROM users 
WHERE role = 'worker' 
AND is_active = true;

-- 1.4 Check recent work readiness submissions
SELECT 
    'RECENT WORK READINESS SUBMISSIONS' as section,
    wr.id,
    wr.worker_id,
    wr.team_leader_id,
    wr.team,
    wr.readiness_level,
    wr.fatigue_level,
    wr.mood,
    wr.submitted_at,
    u.first_name as worker_name,
    u.last_name as worker_last_name,
    u.team as worker_team,
    tl.first_name as team_leader_name,
    tl.last_name as team_leader_last_name
FROM work_readiness wr
LEFT JOIN users u ON wr.worker_id = u.id
LEFT JOIN users tl ON wr.team_leader_id = tl.id
ORDER BY wr.submitted_at DESC
LIMIT 10;

-- 1.5 Check notifications sent to team leaders
SELECT 
    'NOTIFICATIONS TO TEAM LEADERS' as section,
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
    tl.last_name as team_leader_last_name,
    tl.email as team_leader_email,
    sender.first_name as sender_name,
    sender.last_name as sender_last_name,
    sender.email as sender_email
FROM notifications n
LEFT JOIN users tl ON n.recipient_id = tl.id
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE tl.role = 'team_leader'
ORDER BY n.created_at DESC
LIMIT 15;

-- ========================================
-- SECTION 2: TEAM MATCHING ANALYSIS
-- ========================================

-- 2.1 Analyze team name matching issues
SELECT 
    'TEAM MATCHING ANALYSIS' as section,
    w.team as worker_team,
    tl.team as team_leader_team,
    tl.managed_teams,
    CASE 
        WHEN w.team = tl.team THEN 'EXACT MATCH'
        WHEN w.team = ANY(tl.managed_teams) THEN 'MANAGED TEAMS MATCH'
        ELSE 'NO MATCH'
    END as match_status,
    COUNT(*) as worker_count
FROM users w
LEFT JOIN users tl ON w.team_leader_id = tl.id
WHERE w.role = 'worker' 
AND w.is_active = true
GROUP BY w.team, tl.team, tl.managed_teams, match_status
ORDER BY worker_count DESC;

-- 2.2 Find workers without team leaders
SELECT 
    'WORKERS WITHOUT TEAM LEADERS' as section,
    id,
    first_name,
    last_name,
    email,
    team,
    team_leader_id,
    created_at
FROM users 
WHERE role = 'worker' 
AND is_active = true
AND team_leader_id IS NULL
ORDER BY team, first_name;

-- ========================================
-- SECTION 3: FIXES AND UPDATES
-- ========================================

-- 3.1 Fix team leader assignments for workers
UPDATE users 
SET team_leader_id = (
    SELECT tl.id 
    FROM users tl 
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

-- 3.2 Verify the fix
SELECT 
    'AFTER FIX - TEAM ASSIGNMENT COVERAGE' as section,
    COUNT(*) as total_workers,
    COUNT(team_leader_id) as workers_with_team_leaders,
    COUNT(*) - COUNT(team_leader_id) as workers_without_team_leaders,
    ROUND(COUNT(team_leader_id) * 100.0 / COUNT(*), 2) as coverage_percentage
FROM users 
WHERE role = 'worker' 
AND is_active = true;

-- ========================================
-- SECTION 4: NOTIFICATION TESTING
-- ========================================

-- 4.1 Test notification creation
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get a team leader with managed teams
    SELECT id INTO team_leader_id
    FROM users 
    WHERE role = 'team_leader'
    AND managed_teams IS NOT NULL
    AND array_length(managed_teams, 1) > 0
    AND is_active = true
    LIMIT 1;
    
    -- Get a worker from their team
    SELECT u.id INTO worker_id
    FROM users u
    WHERE u.role = 'worker'
    AND u.is_active = true
    AND u.team_leader_id = team_leader_id
    LIMIT 1;
    
    -- Insert test notification
    IF team_leader_id IS NOT NULL AND worker_id IS NOT NULL THEN
        INSERT INTO notifications (
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
            'DEBUG: Work Readiness Notification Test',
            'This is a test notification to verify the notification system is working properly.',
            'medium',
            false,
            '/team-leader',
            jsonb_build_object(
                'worker_id', worker_id,
                'test', true,
                'timestamp', now(),
                'debug', true
            )
        ) RETURNING id INTO test_notification_id;
        
        RAISE NOTICE '✅ Test notification created with ID: %', test_notification_id;
        RAISE NOTICE '✅ Sent from worker % to team leader %', worker_id, team_leader_id;
    ELSE
        RAISE NOTICE '❌ Could not find team leader (%) or worker (%) for test', team_leader_id, worker_id;
    END IF;
END $$;

-- 4.2 Check if test notification was created
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
FROM notifications n
LEFT JOIN users tl ON n.recipient_id = tl.id
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE n.title LIKE 'DEBUG:%'
ORDER BY n.created_at DESC
LIMIT 5;

-- ========================================
-- SECTION 5: NOTIFICATION FUNCTION CREATION
-- ========================================

-- 5.1 Create comprehensive notification function
CREATE OR REPLACE FUNCTION send_work_readiness_notification_comprehensive(
    p_worker_id UUID,
    p_readiness_level TEXT,
    p_fatigue_level INTEGER,
    p_mood TEXT,
    p_pain_discomfort TEXT DEFAULT NULL,
    p_pain_areas TEXT[] DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    notification_id UUID,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    team_leader_id UUID;
    worker_name TEXT;
    worker_team TEXT;
    notification_title TEXT;
    notification_message TEXT;
    notification_priority TEXT;
    new_notification_id UUID;
    team_leader_name TEXT;
BEGIN
    -- Get worker information
    SELECT u.team_leader_id, u.first_name || ' ' || u.last_name, u.team
    INTO team_leader_id, worker_name, worker_team
    FROM users u
    WHERE u.id = p_worker_id;
    
    -- Check if worker has team leader
    IF team_leader_id IS NULL THEN
        RETURN QUERY SELECT 
            NULL::UUID as notification_id,
            false as success,
            'No team leader assigned to worker ' || worker_name as message;
        RETURN;
    END IF;
    
    -- Get team leader name
    SELECT tl.first_name || ' ' || tl.last_name
    INTO team_leader_name
    FROM users tl
    WHERE tl.id = team_leader_id;
    
    -- Determine notification content based on readiness level
    IF p_readiness_level = 'not_fit' THEN
        notification_title := '🚨 Work Readiness Assessment - NOT FIT';
        notification_message := worker_name || ' has submitted their work readiness assessment. Status: NOT FIT FOR WORK.';
        notification_priority := 'high';
    ELSIF p_readiness_level = 'minor' THEN
        notification_title := '⚠️ Work Readiness Assessment - Minor Concerns';
        notification_message := worker_name || ' has submitted their work readiness assessment. Status: Minor Concerns.';
        notification_priority := 'medium';
    ELSE
        notification_title := '✅ Work Readiness Assessment Submitted';
        notification_message := worker_name || ' has submitted their work readiness assessment. Status: Fit for Work.';
        notification_priority := 'medium';
    END IF;
    
    -- Add additional details to message
    notification_message := notification_message || ' Team: ' || worker_team || '.';
    
    -- Insert notification
    INSERT INTO notifications (
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
        p_worker_id,
        'work_readiness_submitted',
        notification_title,
        notification_message,
        notification_priority,
        false,
        '/team-leader',
        jsonb_build_object(
            'worker_id', p_worker_id,
            'worker_name', worker_name,
            'worker_team', worker_team,
            'team_leader_id', team_leader_id,
            'team_leader_name', team_leader_name,
            'readiness_level', p_readiness_level,
            'fatigue_level', p_fatigue_level,
            'mood', p_mood,
            'pain_discomfort', p_pain_discomfort,
            'pain_areas', p_pain_areas,
            'notes', p_notes,
            'timestamp', now()
        )
    ) RETURNING id INTO new_notification_id;
    
    -- Return success result
    RETURN QUERY SELECT 
        new_notification_id as notification_id,
        true as success,
        'Notification sent to team leader ' || team_leader_name || ' for worker ' || worker_name as message;
    
END;
$$ LANGUAGE plpgsql;

-- 5.2 Test the comprehensive notification function
SELECT * FROM send_work_readiness_notification_comprehensive(
    (SELECT id FROM users WHERE role = 'worker' AND team_leader_id IS NOT NULL LIMIT 1),
    'fit',
    3,
    'good',
    'no',
    ARRAY[]::TEXT[],
    'Test submission'
);

-- ========================================
-- SECTION 6: FINAL VERIFICATION
-- ========================================

-- 6.1 Final team assignment summary
SELECT 
    'FINAL TEAM ASSIGNMENT SUMMARY' as section,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams,
    COUNT(w.id) as workers_managed,
    ARRAY_AGG(w.first_name || ' ' || w.last_name) as worker_names
FROM users tl
LEFT JOIN users w ON w.team_leader_id = tl.id AND w.role = 'worker' AND w.is_active = true
WHERE tl.role = 'team_leader' 
AND tl.is_active = true
GROUP BY tl.id, tl.first_name, tl.last_name, tl.email, tl.team, tl.managed_teams
ORDER BY workers_managed DESC;

-- 6.2 Recent notifications summary
SELECT 
    'RECENT NOTIFICATIONS SUMMARY' as section,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN type = 'work_readiness_submitted' THEN 1 END) as work_readiness_notifications,
    COUNT(CASE WHEN is_read = false THEN 1 END) as unread_notifications,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as notifications_last_24h
FROM notifications
WHERE recipient_id IN (SELECT id FROM users WHERE role = 'team_leader');

-- 6.3 System health check
SELECT 
    'SYSTEM HEALTH CHECK' as section,
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE role = 'team_leader' AND is_active = true) > 0 
        THEN '✅ Team leaders exist'
        ELSE '❌ No active team leaders'
    END as team_leaders_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE role = 'worker' AND is_active = true) > 0 
        THEN '✅ Workers exist'
        ELSE '❌ No active workers'
    END as workers_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE role = 'worker' AND team_leader_id IS NOT NULL AND is_active = true) > 0 
        THEN '✅ Workers have team leaders'
        ELSE '❌ Workers missing team leaders'
    END as team_assignment_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM notifications WHERE type = 'work_readiness_submitted') > 0 
        THEN '✅ Work readiness notifications exist'
        ELSE '⚠️ No work readiness notifications found'
    END as notification_status;
