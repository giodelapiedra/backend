-- Fix Missing User Record in Database
-- This happens when a user exists in Supabase Auth but not in the users table

-- First, check if user exists in auth but not in users table
-- You can run this to see the problem:
-- SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'lolosi@gmail.com';

-- Solution 1: Create the missing user record manually
-- Replace the values below with the actual user's information

INSERT INTO public.users (
  id,
  first_name,
  last_name,
  email,
  password_hash,
  role,
  team,
  phone,
  is_active,
  package,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE((au.raw_user_meta_data->>'first_name')::text, 'Team'),
  COALESCE((au.raw_user_meta_data->>'last_name')::text, 'Leader'),
  au.email,
  'placeholder_hash', -- Will need password reset
  COALESCE((au.raw_user_meta_data->>'role')::text, 'team_leader'),
  COALESCE((au.raw_user_meta_data->>'team')::text, 'TEAM ALPHA'),
  '',
  true,
  COALESCE((au.raw_user_meta_data->>'package')::text, 'package2'),
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'lolosi@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
  );

-- Verify the user was created
SELECT id, email, role, team, package FROM public.users WHERE email = 'lolosi@gmail.com';

-- If user is team_leader, make sure they have managed_teams
UPDATE public.users 
SET 
  managed_teams = ARRAY[team],
  default_team = team
WHERE email = 'lolosi@gmail.com' 
  AND role = 'team_leader'
  AND managed_teams IS NULL;

