-- Check the existing user record
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  team,
  package,
  is_active,
  created_at
FROM public.users 
WHERE email = 'lolosi@gmail.com';

-- Check if the ID matches with Auth
-- You can also check in Supabase Auth dashboard:
-- Go to Authentication > Users > Search for lolosi@gmail.com
-- Compare the ID there with the ID above

-- If IDs don't match, we need to either:
-- 1. Update the database record to match Auth ID, OR
-- 2. Delete the database record and recreate properly

-- Option 1: Update database record to match Auth ID
-- (Replace 'AUTH_USER_ID_HERE' with the actual Auth user ID)
/*
UPDATE public.users 
SET 
  id = 'AUTH_USER_ID_HERE',
  updated_at = NOW()
WHERE email = 'lolosi@gmail.com';
*/

-- Option 2: Delete and let Admin Dashboard recreate properly
/*
DELETE FROM public.users WHERE email = 'lolosi@gmail.com';
*/

-- After fixing, verify the user can be fetched:
-- SELECT * FROM public.users WHERE email = 'lolosi@gmail.com';
