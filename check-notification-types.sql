-- Check the constraint definition
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
AND conname = 'check_notification_type';

-- Check existing notification types
SELECT DISTINCT type
FROM notifications
ORDER BY type;
