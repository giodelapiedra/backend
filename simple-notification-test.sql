-- Simple test to verify notification flow works
-- Run this in your Supabase SQL Editor

-- 1. Check if admin_team_leader@test.com exists and is active
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

-- 2. Check workers in TEAM GEO
SELECT 
    id,
    first_name,
    last_name,
    email,
    role,
    team,
    is_active
FROM users 
WHERE role = 'worker'
AND team = 'TEAM GEO'
AND is_active = true;

-- 3. Test notification insertion manually
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
BEGIN
    -- Get team leader ID
    SELECT id INTO team_leader_id 
    FROM users 
    WHERE email = 'admin_team_leader@test.com'
    AND is_active = true;
    
    -- Get worker ID from TEAM GEO
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
        RAISE NOTICE '❌ Could not find team leader (%) or worker (%)', team_leader_id, worker_id;
    END IF;
END $$;

-- 4. Check if test notification was created
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
ORDER BY created_at DESC
LIMIT 5;
