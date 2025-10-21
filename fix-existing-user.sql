-- Quick Fix for Existing User
-- This will update the existing lolosi@gmail.com user to be a proper team leader

UPDATE public.users 
SET 
  role = 'team_leader',
  team = 'TEAM ALPHA',
  package = 'package2',
  default_team = 'TEAM ALPHA',
  managed_teams = ARRAY['TEAM ALPHA'],
  is_active = true,
  updated_at = NOW()
WHERE email = 'lolosi@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  team,
  package,
  managed_teams,
  is_active
FROM public.users 
WHERE email = 'lolosi@gmail.com';

-- If this works, the user should now be able to access the team leader dashboard
