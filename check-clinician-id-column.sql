-- Check if clinician_id column exists in cases table
-- This script will help verify the current state of the cases table

-- Check if the cases table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'cases';

-- Check the current structure of the cases table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'cases'
ORDER BY ordinal_position;

-- Check if clinician_id column specifically exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name = 'clinician_id';

-- Check if priority column exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name = 'priority';

-- Check existing indexes on cases table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'cases';

-- Check foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'cases';

-- Show sample data from cases table (first 5 rows)
SELECT 
    id,
    case_number,
    status,
    case_manager_id,
    worker_id,
    incident_id,
    created_at,
    updated_at
FROM cases 
LIMIT 5;
