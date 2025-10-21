-- Add DELETE policy for clinicians on rehabilitation_plans table
-- This allows clinicians to delete (cancel) their own rehabilitation plans
-- Run this in Supabase SQL Editor

-- Add DELETE policy for clinicians
CREATE POLICY "Clinicians can delete their plans" ON rehabilitation_plans
  FOR DELETE
  USING (clinician_id = auth.uid());

-- Verify the policy was created
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
WHERE tablename = 'rehabilitation_plans' 
AND policyname = 'Clinicians can delete their plans';

-- Test the policy (optional - you can run this to verify it works)
-- This should show the policy exists and is properly configured
SELECT 
  p.policyname,
  p.cmd as command,
  p.qual as condition,
  p.with_check
FROM pg_policies p
WHERE p.tablename = 'rehabilitation_plans'
AND p.policyname LIKE '%delete%'
ORDER BY p.policyname;
