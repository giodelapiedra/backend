-- Check current constraint definition
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
AND contype = 'c'  -- 'c' means check constraint
ORDER BY conname;

-- Check existing notification types
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- Begin transaction
BEGIN;

-- First update any invalid notification types to 'general'
UPDATE notifications 
SET type = 'general'
WHERE type NOT IN (
    'incident_reported',
    'case_created',
    'appointment_scheduled',
    'check_in_reminder',
    'task_assigned',
    'case_status_change',
    'general',
    'high_pain',
    'rtw_review',
    'fatigue_resource'
);

-- Now we can safely drop and recreate the constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS check_notification_type;

-- Add the constraint with all existing types
ALTER TABLE notifications
ADD CONSTRAINT check_notification_type
CHECK (type IN (
    'incident_reported',
    'case_created',
    'appointment_scheduled',
    'check_in_reminder',
    'task_assigned',
    'case_status_change',
    'general',
    'high_pain',
    'rtw_review',
    'fatigue_resource',
    'work_readiness_submitted',
    'case_assignment'
));

-- Commit transaction
COMMIT;
