-- Fix the conflicting notification type constraint
-- This will allow work_readiness_submitted notifications

-- Remove the blocking constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Verify the constraint is removed
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%notification%';

-- Test inserting a work readiness notification again
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
BEGIN
    -- Get first team leader
    SELECT id INTO team_leader_id 
    FROM users 
    WHERE role = 'team_leader' 
    AND is_active = true 
    LIMIT 1;
    
    -- Get first worker
    SELECT id INTO worker_id 
    FROM users 
    WHERE role = 'worker' 
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
        
        RAISE NOTICE '✅ Test notification sent successfully from worker % to team leader %', worker_id, team_leader_id;
    ELSE
        RAISE NOTICE '❌ Could not find team leader or worker to test with';
    END IF;
END $$;

-- Check if the test notification was created
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
