-- Add package column to users table if it doesn't exist
-- Run this in Supabase SQL Editor

-- Add the package column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS package VARCHAR(20) DEFAULT 'package1' 
CHECK (package IN ('package1', 'package2', 'package3'));

-- Update existing users to have package1 as default
UPDATE users 
SET package = 'package1' 
WHERE package IS NULL;

-- Now update the specific user to package2
UPDATE users 
SET package = 'package2'
WHERE email = 'lololssdllll@gmail.com';

-- Verify the update
SELECT id, email, role, package FROM users WHERE email = 'lololssdllll@gmail.com';

-- Check all users packages
SELECT email, role, package FROM users ORDER BY email;

