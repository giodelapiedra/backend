-- Check if admin_clinician@test.com exists and has a valid ID
-- This will help verify if the clinician user is properly set up

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

-- Check all users with 'clinician' in their email
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM users 
WHERE email LIKE '%clinician%'
ORDER BY created_at DESC;

-- Check all users with role 'clinician'
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

-- Check the total number of users
SELECT 
    role,
    COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY count DESC;

-- Check if the users table has the expected structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
