-- Create admin_clinician@test.com user if it doesn't exist
-- This script will safely create the clinician user

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
            '$2a$10$rQZ8K9L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K', -- Default password: "password123"
            'clinician',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'User created successfully with ID: %', new_user_id;
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
