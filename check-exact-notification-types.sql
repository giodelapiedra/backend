-- Check the EXACT constraint definition
SELECT pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
AND conname = 'check_notification_type';

-- Check ALL existing notifications to see what types are actually used
SELECT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- Check the table definition
SELECT column_name, data_type, character_maximum_length, 
       col_description((SELECT 'notifications'::regclass::oid), ordinal_position) as column_comment
FROM information_schema.columns
WHERE table_name = 'notifications'
AND column_name = 'type';
