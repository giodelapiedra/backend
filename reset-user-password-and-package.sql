-- Reset password and update package for lololssdllll@gmail.com
-- Run this in Supabase SQL Editor

-- First, let's check if the user exists
SELECT id, email, role, package FROM users WHERE email = 'lololssdllll@gmail.com';

-- Update package to package2
UPDATE users 
SET package = 'package2'
WHERE email = 'lololssdllll@gmail.com';

-- To reset password, you need to do it through Supabase Auth Dashboard:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Find user: lololssdllll@gmail.com
-- 3. Click the 3 dots menu → "Reset Password"
-- 4. Or manually set password using the dashboard

-- Alternative: Generate a password reset link
-- (This query will show you how to do it via SQL, but it's easier through dashboard)

-- Verify the update
SELECT id, email, role, package FROM users WHERE email = 'lololssdllll@gmail.com';

-- IMPORTANT: 
-- For password reset, go to Supabase Dashboard:
-- Authentication → Users → Find user → Click "..." → "Send password reset email"
-- Or set a new password directly: Click "..." → "Edit user" → Set new password

-- If you want to set password directly to "password123" (for testing):
-- You'll need to use Supabase Auth API or dashboard
-- SQL alone cannot set auth passwords in Supabase









