-- COMPREHENSIVE RLS POLICY FIX FOR INCIDENT CREATION
-- This script fixes RLS policies for both cases and notifications tables
-- Run this in your Supabase SQL editor to fix the 403 errors

-- =============================================
-- 1. FIX CASES TABLE RLS POLICIES
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant cases" ON cases;
DROP POLICY IF EXISTS "Users can insert cases" ON cases;
DROP POLICY IF EXISTS "Users can update cases" ON cases;

-- Policy for SELECT (viewing cases)
CREATE POLICY "Users can view relevant cases" ON cases
  FOR SELECT USING (
    worker_id = auth.uid() OR 
    case_manager_id = auth.uid() OR 
    clinician_id = auth.uid() OR
    employer_id = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

-- Policy for INSERT (creating cases) - CRITICAL FOR INCIDENT CREATION
CREATE POLICY "Users can insert cases" ON cases
  FOR INSERT WITH CHECK (
    -- Site supervisors can create cases when reporting incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers can create cases
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'case_manager') OR
    -- Clinicians can create cases
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'clinician')
  );

-- Policy for UPDATE (updating cases)
CREATE POLICY "Users can update cases" ON cases
  FOR UPDATE USING (
    case_manager_id = auth.uid() OR
    clinician_id = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

-- =============================================
-- 2. FIX NOTIFICATIONS TABLE RLS POLICIES
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Team leaders can create notifications for their team" ON notifications;
DROP POLICY IF EXISTS "Team leaders can send notifications to team members" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

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

-- =============================================
-- 3. VERIFY POLICIES WERE CREATED
-- =============================================

-- Check cases policies
SELECT 'CASES POLICIES:' as table_name;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'cases'
ORDER BY policyname;

-- Check notifications policies
SELECT 'NOTIFICATIONS POLICIES:' as table_name;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- =============================================
-- 4. TEST QUERIES (OPTIONAL)
-- =============================================

-- Test if current user can insert into cases (should return true for site supervisors)
SELECT EXISTS(
  SELECT 1 FROM users 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'site_supervisor', 'case_manager', 'clinician')
) as can_insert_cases;

-- Test if current user can insert into notifications (should return true for site supervisors)
SELECT EXISTS(
  SELECT 1 FROM users 
  WHERE id = auth.uid() 
  AND role IN ('admin', 'site_supervisor', 'case_manager', 'clinician', 'team_leader')
) as can_insert_notifications;
