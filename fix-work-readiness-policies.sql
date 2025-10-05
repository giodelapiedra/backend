-- Fix work_readiness table by adding missing INSERT policy
-- Run this in your Supabase SQL editor

-- Add INSERT policy for work_readiness table
CREATE POLICY "Workers can insert own work readiness" ON work_readiness
  FOR INSERT WITH CHECK (worker_id = auth.uid());

-- Add UPDATE policy for work_readiness table (for team leaders to update status)
CREATE POLICY "Team leaders can update work readiness status" ON work_readiness
  FOR UPDATE USING (
    team_leader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'work_readiness'
ORDER BY policyname;




