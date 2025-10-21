-- Safe migration for notifications table - handles existing data
-- Run this in Supabase SQL Editor

-- First, let's check what notification types currently exist
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- Check current constraint
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
AND contype = 'c'  -- 'c' means check constraint
ORDER BY conname;

-- Begin transaction for safety
BEGIN;

-- Step 1: Add metadata column if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Step 2: Update any invalid notification types to 'general' to avoid constraint violations
-- This handles any existing notifications that don't match our allowed types
UPDATE notifications 
SET type = 'general'
WHERE type NOT IN (
    'case_assignment',
    'case_update', 
    'appointment_reminder',
    'rehabilitation_plan_created',
    'rehabilitation_plan_completed',
    'general',
    'work_readiness_submitted',
    'work_readiness_assigned',
    'incident_reported',
    'case_created',
    'appointment_scheduled',
    'check_in_reminder',
    'task_assigned',
    'case_status_change',
    'high_pain',
    'rtw_review',
    'fatigue_resource',
    'rehab_plan_assigned',
    'rehab_plan_review',
    'progress_encouragement',
    'exercise_completed',
    'exercise_skipped',
    'daily_check_in',
    'activity_log_created',
    'case_closed',
    'return_to_work',
    'zoom_meeting_scheduled',
    'zoom_meeting_reminder',
    'work_readiness_followup'
);

-- Step 3: Now we can safely drop and recreate the constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 4: Add the comprehensive constraint with all existing types
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'case_assignment',
    'case_update', 
    'appointment_reminder',
    'rehabilitation_plan_created',
    'rehabilitation_plan_completed',
    'general',
    'work_readiness_submitted',
    'work_readiness_assigned',
    'incident_reported',
    'case_created',
    'appointment_scheduled',
    'check_in_reminder',
    'task_assigned',
    'case_status_change',
    'high_pain',
    'rtw_review',
    'fatigue_resource',
    'rehab_plan_assigned',
    'rehab_plan_review',
    'progress_encouragement',
    'exercise_completed',
    'exercise_skipped',
    'daily_check_in',
    'activity_log_created',
    'case_closed',
    'return_to_work',
    'zoom_meeting_scheduled',
    'zoom_meeting_reminder',
    'work_readiness_followup'
));

-- Step 5: Create index on metadata for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN (metadata);

-- Step 6: Update RLS policies to allow clinicians to create notifications for workers
DROP POLICY IF EXISTS "Clinicians can create notifications for workers" ON notifications;

CREATE POLICY "Clinicians can create notifications for workers" 
ON notifications
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM rehabilitation_plans rp
        WHERE rp.clinician_id = auth.uid()
        AND rp.worker_id = recipient_id
    )
);

-- Step 7: Add comments to document the new types
COMMENT ON COLUMN notifications.type IS 'Type of notification: case_assignment, case_update, appointment_reminder, rehabilitation_plan_created, rehabilitation_plan_completed, work_readiness_submitted, work_readiness_assigned, incident_reported, case_created, appointment_scheduled, check_in_reminder, task_assigned, case_status_change, high_pain, rtw_review, fatigue_resource, rehab_plan_assigned, rehab_plan_review, progress_encouragement, exercise_completed, exercise_skipped, daily_check_in, activity_log_created, case_closed, return_to_work, zoom_meeting_scheduled, zoom_meeting_reminder, work_readiness_followup, or general';
COMMENT ON COLUMN notifications.metadata IS 'Additional data related to the notification (e.g., plan_id, exercise_count)';

-- Step 8: Grant necessary permissions
GRANT SELECT, INSERT ON notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Commit the transaction
COMMIT;

-- Verify the changes
SELECT 'Migration completed successfully!' as status;
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;
