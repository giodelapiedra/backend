-- Quick Fix for Notification Type Constraint Issue
-- Run this in Supabase SQL Editor immediately

-- 1. Check current constraint
SELECT 
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND conname LIKE '%type%';

-- 2. Drop the constraint if it exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 3. Add a more permissive constraint
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IS NOT NULL AND length(type) > 0);

-- 4. Test inserting a notification with rehab_plan_assigned type
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
    'Test Notification for Samward',
    'This is a test notification to verify the constraint fix works.',
    'high',
    false
);

-- 5. Check if the test notification was created
SELECT 
    id,
    recipient_id,
    type,
    title,
    message,
    created_at,
    r.email as recipient_email
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
WHERE r.email = 'samward@gmail.com'
ORDER BY created_at DESC;

-- 6. Show all recent notifications
SELECT 
    id,
    type,
    title,
    message,
    created_at,
    r.email as recipient_email
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
ORDER BY created_at DESC
LIMIT 10;
