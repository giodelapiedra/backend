-- Fix RLS policies for notifications table
-- This will allow site supervisors to create notifications when creating incidents

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Team leaders can create notifications for their team" ON notifications;
DROP POLICY IF EXISTS "Team leaders can send notifications to team members" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Policy for SELECT (viewing notifications)
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Policy for INSERT (creating notifications) - CRITICAL FOR INCIDENT CREATION
CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (
    -- Site supervisors can create notifications when reporting incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers can create notifications
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'case_manager') OR
    -- Clinicians can create notifications
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'clinician') OR
    -- Team leaders can create notifications for their team
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'team_leader')
  );

-- Policy for UPDATE (updating notifications - mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (recipient_id = auth.uid());

-- Add comment to document the policies
COMMENT ON POLICY "Users can insert notifications" ON notifications IS 'Allows site supervisors, case managers, clinicians, and team leaders to create notifications';

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notifications';
