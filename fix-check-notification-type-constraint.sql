-- Fix the check_notification_type constraint
-- Run this in Supabase SQL Editor

-- 1. Check the current constraint definition
SELECT 
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND conname = 'check_notification_type';

-- 2. Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS check_notification_type;

-- 3. Add a new constraint that allows rehabilitation plan notification types
ALTER TABLE notifications 
ADD CONSTRAINT check_notification_type 
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

-- 4. Test inserting the notification again
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
    'Test Notification for Samward - FIXED',
    'This notification should work now after fixing the constraint.',
    'high',
    false
);

-- 5. Verify the notification was created
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

-- 6. Show all recent notifications to confirm it's working
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
