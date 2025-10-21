-- Update Database Constraint for Daily Completion Notifications
-- Run this in Supabase SQL Editor

-- 1. Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS check_notification_type;

-- 2. Add new constraint that includes daily completion notification type
ALTER TABLE notifications 
ADD CONSTRAINT check_notification_type 
CHECK (type IN (
    'general',
    'rehab_plan_assigned',
    'rehab_plan_completed',
    'rehab_plan_daily_completed'
));

-- 3. Test creating a daily completion notification
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

-- 4. Check if the test notification was created
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
WHERE n.type = 'rehab_plan_daily_completed'
ORDER BY n.created_at DESC;

-- 5. Show all recent notifications
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
ORDER BY n.created_at DESC
LIMIT 10;
