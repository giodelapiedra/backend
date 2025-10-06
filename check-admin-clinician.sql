-- Check if admin_clinician@test.com exists in the database
-- This will help verify if the clinician is properly set up

-- Check if the user exists
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM users 
WHERE email = 'admin_clinician@test.com';

-- Check all clinicians in the database
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM users 
WHERE role = 'clinician'
ORDER BY created_at DESC;

-- Check if there are any users with 'admin' in their email
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active
FROM users 
WHERE email LIKE '%admin%'
ORDER BY created_at DESC;

-- Check if there are any users with 'clinician' in their email
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active
FROM users 
WHERE email LIKE '%clinician%'
ORDER BY created_at DESC;
