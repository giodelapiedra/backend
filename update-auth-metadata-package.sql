-- Update user_metadata in auth.users to include package
-- This is what the frontend actually reads!
-- Run this in Supabase SQL Editor

-- First, check current metadata
SELECT 
  id,
  email,
  raw_user_meta_data,
  updated_at
FROM auth.users 
WHERE email = 'samward@gmail.com';

-- Update the user_metadata to include package
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{package}',
    '"package2"'::jsonb
  ),
  updated_at = now()
WHERE email = 'samward@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  raw_user_meta_data->>'package' as package,
  raw_user_meta_data->>'role' as role,
  updated_at
FROM auth.users 
WHERE email = 'samward@gmail.com';

-- IMPORTANT: User needs to LOGOUT and LOGIN again for changes to take effect!
-- Or refresh the session

-- Also update in public.users table for consistency
UPDATE users
SET package = 'package2'
WHERE email = 'samward@gmail.com';

-- Verify both tables
SELECT 
  'public.users' as table_name,
  email,
  package,
  role
FROM users
WHERE email = 'samward@gmail.com'
UNION ALL
SELECT 
  'auth.users' as table_name,
  email,
  raw_user_meta_data->>'package' as package,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'samward@gmail.com';

