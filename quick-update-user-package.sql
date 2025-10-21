-- Quick update: Change package to package2 for lololssdllll@gmail.com
-- Run this in Supabase SQL Editor

UPDATE users 
SET package = 'package2'
WHERE email = 'lololssdllll@gmail.com';

-- Verify
SELECT id, email, role, package FROM users WHERE email = 'lololssdllll@gmail.com';









