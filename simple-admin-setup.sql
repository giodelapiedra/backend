-- =============================================
-- SIMPLE ADMIN SETUP SCRIPT
-- Run this entire script in your database
-- =============================================

-- Step 1: Add package4 support
-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_package_check;

-- Add the new constraint with package4 included
ALTER TABLE users ADD CONSTRAINT users_package_check 
CHECK (package IN ('package1', 'package2', 'package3', 'package4'));

-- Step 2: Create/Update admin_admin@test.com (minimal fields)
INSERT INTO users (
  first_name,
  last_name, 
  email,
  password_hash,
  role,
  phone,
  team,
  managed_teams,
  default_team,
  is_active,
  package,
  created_at,
  updated_at
) VALUES (
  'System',
  'Administrator',
  'admin_admin@test.com',
  '$2b$12$GKPRePtG.ZfX7zX0ovWTEeRIhljGm0QurbZ.pbJF2kiMV/g/lqwNS',
  'admin',
  '+1234567890',
  'ADMIN_TEAM',
  ARRAY['ALL_TEAMS', 'TEAM GEO', 'TEAM ALPHA', 'TEAM BETA'],
  'ADMIN_TEAM',
  true,
  'package4',
  NOW(),
  NOW()
) 
ON CONFLICT (email) 
DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  team = EXCLUDED.team,
  managed_teams = EXCLUDED.managed_teams,
  default_team = EXCLUDED.default_team,
  is_active = EXCLUDED.is_active,
  package = EXCLUDED.package,
  updated_at = NOW();

-- Step 3: Verify the setup
SELECT 
  first_name,
  last_name,
  email,
  role,
  package,
  is_active,
  managed_teams
FROM users 
WHERE email = 'admin_admin@test.com';

-- Step 4: Show package distribution
SELECT 
  package,
  COUNT(*) as user_count,
  STRING_AGG(role, ', ') as roles
FROM users 
GROUP BY package 
ORDER BY package;

-- Step 5: Verify constraint was added
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'users_package_check';

-- Success message
SELECT 'Admin setup completed successfully!' as status;

