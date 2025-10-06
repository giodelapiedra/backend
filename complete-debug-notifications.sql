-- Complete debugging for work readiness notifications
-- Run this in your Supabase SQL Editor

-- 1. Check team structure for TEAM GEO
SELECT 
    id,
    first_name,
    last_name,
    role,
    team,
    managed_teams,
    is_active
FROM users 
WHERE team = 'TEAM GEO' OR 'TEAM GEO' = ANY(managed_teams)
ORDER BY role;

-- 2. Check recent work readiness submissions
SELECT 
    id,
    worker_id,
    team_leader_id,
    team,
    readiness_level,
    submitted_at,
    created_at
FROM work_readiness 
WHERE team = 'TEAM GEO'
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check recent notifications for work readiness
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
WHERE type = 'work_readiness_submitted'
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check if team leader exists and is active
SELECT 
    id,
    first_name,
    last_name,
    role,
    team,
    managed_teams,
    is_active
FROM users 
WHERE role = 'team_leader'
AND ('TEAM GEO' = ANY(managed_teams) OR team = 'TEAM GEO')
AND is_active = true;

-- 5. Test notification insertion manually
-- Replace the UUIDs with actual IDs from the queries above
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
BEGIN
    -- Get team leader for TEAM GEO
    SELECT id INTO team_leader_id 
    FROM users 
    WHERE role = 'team_leader'
    AND ('TEAM GEO' = ANY(managed_teams) OR team = 'TEAM GEO')
    AND is_active = true 
    LIMIT 1;
    
    -- Get worker from TEAM GEO
    SELECT id INTO worker_id 
    FROM users 
    WHERE role = 'worker'
    AND team = 'TEAM GEO'
    AND is_active = true 
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
        
        RAISE NOTICE '✅ Test notification sent from worker % to team leader %', worker_id, team_leader_id;
    ELSE
        RAISE NOTICE '❌ Could not find team leader (%) or worker (%) for TEAM GEO', team_leader_id, worker_id;
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
WHERE title LIKE 'TEST:%'
ORDER BY created_at DESC
LIMIT 5;
