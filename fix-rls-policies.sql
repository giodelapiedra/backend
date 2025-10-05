-- Fix RLS recursion issue for users table
-- This script should be run in the Supabase SQL editor

-- First, drop all existing policies on the users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- Create new non-recursive policies
-- Policy for SELECT: Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy for UPDATE: Users can update their own profile  
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policy for INSERT: Allow authenticated users to insert (for registration)
CREATE POLICY "Enable insert for authenticated users only" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Optional: Admin policy for full access (if you have admin role)
-- CREATE POLICY "Admins can do everything" ON users
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';
