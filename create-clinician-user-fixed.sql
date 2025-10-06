-- Create admin_clinician@test.com user with proper password hash
-- This script will safely create the clinician user with all required fields

-- First, check if the user already exists
DO $$
DECLARE
    user_exists boolean;
    new_user_id uuid;
BEGIN
    -- Check if user exists
    SELECT EXISTS(
        SELECT 1 FROM users WHERE email = 'admin_clinician@test.com'
    ) INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE 'User admin_clinician@test.com already exists';
        
        -- Show the existing user details
        PERFORM * FROM users WHERE email = 'admin_clinician@test.com';
        
    ELSE
        RAISE NOTICE 'Creating user admin_clinician@test.com...';
        
        -- Generate a new UUID for the user
        new_user_id := gen_random_uuid();
        
        -- Insert the new user with password hash
        -- Password: "password123" (hashed with bcrypt)
        INSERT INTO users (
            id,
            email,
            first_name,
            last_name,
            password_hash,
            role,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            new_user_id,
            'admin_clinician@test.com',
            'Admin',
            'Clinician',
            '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password123
            'clinician',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'User created successfully with ID: %', new_user_id;
        RAISE NOTICE 'Login credentials: admin_clinician@test.com / password123';
    END IF;
END $$;

-- Verify the user was created/exists
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

-- Show all clinicians
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

-- Check the users table structure to see all required fields
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;




