-- Fix Notifications Table to Support Rehabilitation Plan Notifications
-- Run this in Supabase SQL Editor

-- 1. First, check current notification types constraint
SELECT 
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND conname LIKE '%type%';

-- 2. Drop the existing type constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 3. Add new constraint with rehabilitation plan notification types
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'case_assignment', 
    'case_update', 
    'appointment_reminder', 
    'rehabilitation_plan_created',
    'rehab_plan_assigned',
    'rehab_plan_completed',
    'general',
    'incident_reported',
    'case_created',
    'check_in_reminder',
    'task_assigned',
    'case_status_change',
    'high_pain',
    'rtw_review',
    'fatigue_resource',
    'rehab_plan_review',
    'progress_encouragement',
    'exercise_completed',
    'exercise_skipped',
    'daily_check_in',
    'activity_log_created',
    'case_closed',
    'return_to_work',
    'zoom_meeting_scheduled',
    'appointment_reminder',
    'zoom_meeting_reminder',
    'work_readiness_followup',
    'work_readiness_submitted'
));

-- 4. Test creating a rehabilitation plan notification
INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read
) VALUES (
    (SELECT id FROM users WHERE role = 'worker' LIMIT 1),
    (SELECT id FROM users WHERE role = 'clinician' LIMIT 1),
    'rehab_plan_assigned',
    'Test Rehabilitation Plan Assignment',
    'This is a test notification for rehabilitation plan assignment.',
    'high',
    false
);

-- 5. Test creating a rehabilitation plan completion notification
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
    (SELECT id FROM users WHERE role = 'worker' LIMIT 1),
    'rehab_plan_completed',
    'Test Rehabilitation Plan Completion',
    'This is a test notification for rehabilitation plan completion.',
    'medium',
    false
);

-- 6. Check if the test notifications were created
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
WHERE type IN ('rehab_plan_assigned', 'rehab_plan_completed')
ORDER BY created_at DESC;

-- 7. Verify the constraint was updated
SELECT 
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND conname = 'notifications_type_check';
