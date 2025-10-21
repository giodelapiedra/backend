-- Update notifications table to support rehabilitation plan notifications
-- Run this in Supabase SQL Editor

-- Add metadata column if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update the type constraint to include rehabilitation_plan_created
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('case_assignment', 'case_update', 'appointment_reminder', 'rehabilitation_plan_created', 'rehabilitation_plan_completed', 'general'));

-- Create index on metadata for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING GIN (metadata);

-- Add comment to document the new type
COMMENT ON COLUMN notifications.type IS 'Type of notification: case_assignment, case_update, appointment_reminder, rehabilitation_plan_created, rehabilitation_plan_completed, or general';
COMMENT ON COLUMN notifications.metadata IS 'Additional data related to the notification (e.g., plan_id, exercise_count)';

-- Update RLS policies to allow clinicians to create notifications for workers
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

-- Grant necessary permissions
GRANT SELECT, INSERT ON notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
