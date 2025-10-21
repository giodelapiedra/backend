-- Remove Notification Constraint Completely
-- Run this in Supabase SQL Editor

-- 1. Drop the constraint completely
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS check_notification_type;

-- 2. Test creating daily completion notification
INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read
) VALUES (
    (SELECT id FROM users WHERE role = 'clinician' LIMIT 1),
    (SELECT id FROM users WHERE email = 'samward@gmail.com' LIMIT 1),
    'rehab_plan_daily_completed',
    'Daily Rehabilitation Plan Completed',
    'Samward has completed Day 1 of their rehabilitation plan "Recovery Plan" for case CASE-001. Progress: 1/7 days completed.',
    'medium',
    false
);

-- 3. Test creating assignment notification
INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read
) VALUES (
    (SELECT id FROM users WHERE email = 'samward@gmail.com' LIMIT 1),
    (SELECT id FROM users WHERE role = 'clinician' LIMIT 1),
    'rehab_plan_assigned',
    'New Rehabilitation Plan Assigned',
    'Your clinician has assigned you a new rehabilitation plan: "Recovery Plan" for case CASE-001. Please review and start your exercises.',
    'high',
    false
);

-- 4. Check if notifications were created
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.created_at,
    r.email as recipient_email,
    s.email as sender_email
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
LEFT JOIN users s ON n.sender_id = s.id
WHERE n.type IN ('rehab_plan_assigned', 'rehab_plan_daily_completed')
ORDER BY n.created_at DESC;

-- 5. Show all recent notifications
SELECT 
    n.id,
    n.type,
    n.title,
    n.created_at,
    r.email as recipient_email,
    s.email as sender_email
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
LEFT JOIN users s ON n.sender_id = s.id
ORDER BY n.created_at DESC
LIMIT 10;
