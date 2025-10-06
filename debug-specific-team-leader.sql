-- Debug specific team leader: admin_team_leader@test.com
-- Run this in your Supabase SQL Editor

-- 1. Check the specific team leader
SELECT 
    id,
    first_name,
    last_name,
    email,
    role,
    team,
    managed_teams,
    is_active
FROM users 
WHERE email = 'admin_team_leader@test.com';

-- 2. Check workers in the same team(s) as this team leader
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.team,
    u.is_active
FROM users u
WHERE u.role = 'worker'
AND (
    u.team = (SELECT team FROM users WHERE email = 'admin_team_leader@test.com')
    OR u.team::text = ANY(SELECT managed_teams FROM users WHERE email = 'admin_team_leader@test.com')
)
ORDER BY u.team;

-- 3. Check recent work readiness submissions from workers in this team leader's teams
SELECT 
    wr.id,
    wr.worker_id,
    wr.team_leader_id,
    wr.team,
    wr.readiness_level,
    wr.submitted_at,
    wr.created_at,
    u.first_name as worker_name,
    u.email as worker_email
FROM work_readiness wr
JOIN users u ON wr.worker_id = u.id
WHERE wr.team = (SELECT team FROM users WHERE email = 'admin_team_leader@test.com')
OR wr.team::text = ANY(SELECT managed_teams FROM users WHERE email = 'admin_team_leader@test.com')
ORDER BY wr.created_at DESC 
LIMIT 10;

-- 4. Check notifications sent to this team leader
SELECT 
    n.id,
    n.recipient_id,
    n.sender_id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.is_read,
    n.created_at,
    sender.first_name as sender_name,
    sender.email as sender_email
FROM notifications n
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE n.recipient_id = (SELECT id FROM users WHERE email = 'admin_team_leader@test.com')
ORDER BY n.created_at DESC 
LIMIT 10;

-- 5. Test notification insertion for this specific team leader
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
BEGIN
    -- Get the specific team leader
    SELECT id INTO team_leader_id 
    FROM users 
    WHERE email = 'admin_team_leader@test.com'
    AND is_active = true;
    
    -- Get a worker from one of their teams
    SELECT u.id INTO worker_id 
    FROM users u
    WHERE u.role = 'worker'
    AND u.is_active = true
    AND (
        u.team = (SELECT team FROM users WHERE email = 'admin_team_leader@test.com')
        OR u.team::text = ANY(SELECT managed_teams FROM users WHERE email = 'admin_team_leader@test.com')
    )
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
            is_read
        ) VALUES (
            team_leader_id,
            worker_id,
            'work_readiness_submitted',
            'TEST: Work Readiness Assessment Submitted',
            'This is a test notification to verify the system works.',
            'medium',
            false
        );
        
        RAISE NOTICE '✅ Test notification sent from worker % to team leader % (admin_team_leader@test.com)', worker_id, team_leader_id;
    ELSE
        RAISE NOTICE '❌ Could not find team leader (%) or worker (%)', team_leader_id, worker_id;
    END IF;
END $$;

-- 6. Check if test notification was created
SELECT 
    id,
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read,
    created_at
FROM notifications 
WHERE recipient_id = (SELECT id FROM users WHERE email = 'admin_team_leader@test.com')
AND title LIKE 'TEST:%'
ORDER BY created_at DESC
LIMIT 5;
