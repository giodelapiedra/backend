-- =============================================
-- CREATE ADMIN USER WITH PACKAGE4 (HIGHEST LEVEL)
-- =============================================

-- First, run the package4 migration if not already done
-- (Execute add-package4-support.sql first)

-- Create or update admin_admin@test.com with package4
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
  is_available,
  address,
  emergency_contact,
  medical_info,
  created_at,
  updated_at
) VALUES (
  'System',
  'Administrator',
  'admin_admin@test.com',
  '$2b$12$GKPRePtG.ZfX7zX0ovWTEeRIhljGm0QurbZ.pbJF2kiMV/g/lqwNS', -- Your existing password hash
  'admin',
  '+1234567890',
  'ADMIN_TEAM',
  ARRAY['ALL_TEAMS', 'TEAM GEO', 'TEAM ALPHA', 'TEAM BETA'], -- Access to all teams
  'ADMIN_TEAM',
  true,
  'package4', -- ✅ NEW: Highest package level
  true,
  '{}',
  '{}',
  '{}',
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
  package = EXCLUDED.package, -- ✅ Update to package4
  is_available = EXCLUDED.is_available,
  updated_at = NOW();

-- Verify the admin user was created/updated successfully
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

-- Show package distribution
SELECT 
  package,
  COUNT(*) as user_count,
  STRING_AGG(role, ', ') as roles
FROM users 
GROUP BY package 
ORDER BY package;
