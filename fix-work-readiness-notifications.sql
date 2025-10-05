-- Fix Work Readiness Notifications Issue
-- This script addresses the team leader assignment and notification problems

-- 1. First, let's check the current state of team assignments
SELECT 
    'Current Team Assignments' as section,
    u.id,
    u.first_name,
    u.last_name,
    u.role,
    u.team,
    u.team_leader_id,
    u.managed_teams,
    u.is_active
FROM users u
WHERE u.role IN ('team_leader', 'worker')
ORDER BY u.role, u.team;

-- 2. Check recent work readiness submissions and their team assignments
SELECT 
    'Recent Work Readiness Submissions' as section,
    wr.id,
    wr.worker_id,
    wr.team_leader_id,
    wr.team,
    wr.readiness_level,
    wr.submitted_at,
    u.first_name as worker_name,
    u.last_name as worker_last_name,
    u.team as worker_team
FROM work_readiness wr
LEFT JOIN users u ON wr.worker_id = u.id
ORDER BY wr.submitted_at DESC
LIMIT 10;

-- 3. Check notifications sent to team leaders
SELECT 
    'Notifications to Team Leaders' as section,
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
    sender.first_name as sender_name,
    sender.last_name as sender_last_name
FROM notifications n
LEFT JOIN users tl ON n.recipient_id = tl.id
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE tl.role = 'team_leader'
ORDER BY n.created_at DESC
LIMIT 10;

-- 4. Fix team assignments - Update workers to have proper team_leader_id
-- This will ensure workers are properly linked to their team leaders
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

-- 5. Verify the fix worked
SELECT 
    'Updated Team Assignments' as section,
    u.id,
    u.first_name,
    u.last_name,
    u.role,
    u.team,
    u.team_leader_id,
    tl.first_name as team_leader_name,
    tl.last_name as team_leader_last_name,
    tl.managed_teams
FROM users u
LEFT JOIN users tl ON u.team_leader_id = tl.id
WHERE u.role = 'worker'
ORDER BY u.team;

-- 6. Test notification creation for a specific team leader
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
    test_team_name TEXT;
BEGIN
    -- Get a team leader who has managed teams
    SELECT id, team INTO team_leader_id, test_team_name
    FROM users 
    WHERE role = 'team_leader'
    AND managed_teams IS NOT NULL
    AND array_length(managed_teams, 1) > 0
    AND is_active = true
    LIMIT 1;
    
    -- Get a worker from one of their teams
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
            'TEST: Work Readiness Assessment Submitted',
            'This is a test notification to verify the notification system is working properly.',
            'medium',
            false,
            '/team-leader',
            jsonb_build_object(
                'worker_id', worker_id,
                'test', true,
                'timestamp', now()
            )
        );
        
        RAISE NOTICE '✅ Test notification sent from worker % to team leader %', worker_id, team_leader_id;
    ELSE
        RAISE NOTICE '❌ Could not find team leader (%) or worker (%) for test', team_leader_id, worker_id;
    END IF;
END $$;

-- 7. Check if test notification was created
SELECT 
    'Test Notification Created' as section,
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
    sender.first_name as sender_name
FROM notifications n
LEFT JOIN users tl ON n.recipient_id = tl.id
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE n.title LIKE 'TEST:%'
ORDER BY n.created_at DESC
LIMIT 5;

-- 8. Create a function to properly assign team leaders to workers
CREATE OR REPLACE FUNCTION assign_team_leaders_to_workers()
RETURNS void AS $$
BEGIN
    -- Update workers to have proper team_leader_id based on team matching
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
    
    RAISE NOTICE 'Team leaders assigned to workers successfully';
END;
$$ LANGUAGE plpgsql;

-- 9. Create a function to send work readiness notifications
CREATE OR REPLACE FUNCTION send_work_readiness_notification(
    p_worker_id UUID,
    p_readiness_level TEXT,
    p_fatigue_level INTEGER,
    p_mood TEXT
)
RETURNS void AS $$
DECLARE
    team_leader_id UUID;
    worker_name TEXT;
    notification_title TEXT;
    notification_message TEXT;
    notification_priority TEXT;
BEGIN
    -- Get worker's team leader
    SELECT u.team_leader_id, u.first_name || ' ' || u.last_name
    INTO team_leader_id, worker_name
    FROM users u
    WHERE u.id = p_worker_id;
    
    -- Only send notification if team leader exists
    IF team_leader_id IS NOT NULL THEN
        -- Determine notification content based on readiness level
        IF p_readiness_level = 'not_fit' THEN
            notification_title := 'Work Readiness Assessment - NOT FIT';
            notification_message := worker_name || ' has submitted their work readiness assessment. Status: NOT FIT FOR WORK.';
            notification_priority := 'high';
        ELSE
            notification_title := 'Work Readiness Assessment Submitted';
            notification_message := worker_name || ' has submitted their work readiness assessment. Status: ' || 
                CASE 
                    WHEN p_readiness_level = 'minor' THEN 'Minor Concerns'
                    WHEN p_readiness_level = 'fit' THEN 'Fit for Work'
                    ELSE p_readiness_level
                END || '.';
            notification_priority := 'medium';
        END IF;
        
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
                'readiness_level', p_readiness_level,
                'fatigue_level', p_fatigue_level,
                'mood', p_mood,
                'timestamp', now()
            )
        );
        
        RAISE NOTICE 'Work readiness notification sent to team leader % for worker %', team_leader_id, p_worker_id;
    ELSE
        RAISE NOTICE 'No team leader found for worker %', p_worker_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 10. Test the notification function
SELECT send_work_readiness_notification(
    (SELECT id FROM users WHERE role = 'worker' AND team_leader_id IS NOT NULL LIMIT 1),
    'fit',
    3,
    'good'
);

-- 11. Final verification - Check all team assignments
SELECT 
    'Final Team Assignment Verification' as section,
    COUNT(*) as total_workers,
    COUNT(team_leader_id) as workers_with_team_leaders,
    COUNT(*) - COUNT(team_leader_id) as workers_without_team_leaders
FROM users 
WHERE role = 'worker' 
AND is_active = true;

-- 12. Show team leader coverage
SELECT 
    'Team Leader Coverage' as section,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.team,
    tl.managed_teams,
    COUNT(w.id) as workers_managed
FROM users tl
LEFT JOIN users w ON w.team_leader_id = tl.id AND w.role = 'worker' AND w.is_active = true
WHERE tl.role = 'team_leader' 
AND tl.is_active = true
GROUP BY tl.id, tl.first_name, tl.last_name, tl.team, tl.managed_teams
ORDER BY workers_managed DESC;

