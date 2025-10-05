-- Test notification to SAM WARD (the team leader)
-- Run this in your Supabase SQL Editor

-- Insert test notification to SAM WARD
INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read
) VALUES (
    '380bdb06-2dc2-4766-8633-76aa7c48e13f', -- SAM WARD's ID
    (SELECT id FROM users WHERE role = 'worker' AND team = 'TEAM GEO' LIMIT 1), -- Any worker from TEAM GEO
    'work_readiness_submitted',
    'TEST: Work Readiness Assessment Submitted',
    'This is a test notification to verify the system works.',
    'medium',
    false
);

-- Check if notification was created
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
WHERE recipient_id = '380bdb06-2dc2-4766-8633-76aa7c48e13f'
ORDER BY created_at DESC
LIMIT 5;
