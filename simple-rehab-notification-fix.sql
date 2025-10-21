-- Simple Fix for Rehabilitation Plan Notifications Only
-- Run this in Supabase SQL Editor

-- 1. Check current notification types
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- 2. Update any existing rehab_plan_assigned or rehab_plan_completed to general
UPDATE notifications 
SET type = 'general'
WHERE type IN ('rehab_plan_assigned', 'rehab_plan_completed');

-- 3. Drop the constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS check_notification_type;

-- 4. Add simple constraint that allows rehab plan notifications
ALTER TABLE notifications 
ADD CONSTRAINT check_notification_type 
CHECK (type IN (
    'general',
    'rehab_plan_assigned',
    'rehab_plan_completed'
));

-- 5. Test creating notification for samward@gmail.com
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
    'Your clinician has assigned you a new rehabilitation plan. Please review and start your exercises.',
    'high',
    false
);

-- 6. Check if notification was created
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.created_at,
    r.email as recipient_email
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
WHERE r.email = 'samward@gmail.com'
ORDER BY n.created_at DESC;

-- 7. Show recent notifications
SELECT 
    n.id,
    n.type,
    n.title,
    n.created_at,
    r.email as recipient_email
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
ORDER BY n.created_at DESC
LIMIT 5;
