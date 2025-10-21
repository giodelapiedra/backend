-- Fix notifications table with existing data cleanup
-- Run this in Supabase SQL Editor

-- 1. First, check what notification types exist in the table
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- 2. Check for any invalid notification types
SELECT 
    id,
    type,
    title,
    created_at
FROM notifications
WHERE type NOT IN (
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
);

-- 3. Update invalid notification types to 'general'
UPDATE notifications 
SET type = 'general'
WHERE type NOT IN (
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
);

-- 4. Now drop the old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS check_notification_type;

-- 5. Add the new constraint
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

-- 6. Test inserting a notification
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
    'Test Notification for Samward - WORKING',
    'This notification should work now after cleaning up the data.',
    'high',
    false
);

-- 7. Verify the notification was created
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

-- 8. Show all notification types to confirm they're all valid
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;
