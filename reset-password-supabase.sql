-- Reset password for user in Supabase
-- This updates the auth.users table with a new encrypted password
-- Run this in Supabase SQL Editor

-- The new password will be: password123
-- Supabase uses bcrypt for password hashing

-- Option 1: Use Supabase's built-in function (if available)
-- This is the safest method
UPDATE auth.users
SET 
  encrypted_password = crypt('password123', gen_salt('bf')),
  updated_at = now()
WHERE email = 'lololssdllll@gmail.com';

-- Verify the user exists in auth
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
WHERE email = 'lololssdllll@gmail.com';

-- NOTES:
-- 1. The password will be set to: password123
-- 2. User can login with: lololssdllll@gmail.com / password123
-- 3. This uses bcrypt encryption (gen_salt('bf'))
-- 4. The user should change this password after first login for security

