-- Disable RLS on users table to fix login issue
-- Run this in Supabase SQL Editor

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';
