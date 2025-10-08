-- First check the current constraint
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
AND conname = 'check_notification_type';

-- Begin transaction
BEGIN;

-- First update any existing notifications that might violate the new constraint
UPDATE notifications 
SET type = 'case_assigned'
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
    'fatigue_resource',
    'case_assigned'
);

-- Drop the existing constraint
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS check_notification_type;

-- Add updated constraint with work_readiness_assigned type
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
    'case_assigned',
    'work_readiness_assigned'
));

-- Commit transaction
COMMIT;
