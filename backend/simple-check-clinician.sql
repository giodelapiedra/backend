-- Simple check for admin_clinician@test.com
-- This version uses simpler queries to avoid authorization issues

-- Check if the user exists (simple query)
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active
FROM users 
WHERE email = 'admin_clinician@test.com';

-- Check if there are any cases in the database
SELECT 
    COUNT(*) as total_cases
FROM cases;

-- Check if clinician_id column exists
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name = 'clinician_id';

-- Check if there are any cases with clinician_id assigned
SELECT 
    COUNT(*) as cases_with_clinician
FROM cases 
WHERE clinician_id IS NOT NULL;

-- Show all cases (first 10) to see the structure
SELECT 
    id,
    case_number,
    status,
    case_manager_id,
    worker_id,
    clinician_id,
    created_at
FROM cases 
ORDER BY created_at DESC
LIMIT 10;




