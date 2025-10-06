-- Verify that clinician_id column was added successfully
-- This script will confirm the migration was successful

-- Check if clinician_id column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'cases' 
            AND column_name = 'clinician_id'
        ) 
        THEN '✅ clinician_id column EXISTS'
        ELSE '❌ clinician_id column MISSING'
    END as clinician_id_status;

-- Check if priority column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'cases' 
            AND column_name = 'priority'
        ) 
        THEN '✅ priority column EXISTS'
        ELSE '❌ priority column MISSING'
    END as priority_status;

-- Check if indexes were created
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'cases' 
            AND indexname = 'idx_cases_clinician_id'
        ) 
        THEN '✅ clinician_id index EXISTS'
        ELSE '❌ clinician_id index MISSING'
    END as clinician_id_index_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_indexes 
            WHERE tablename = 'cases' 
            AND indexname = 'idx_cases_priority'
        ) 
        THEN '✅ priority index EXISTS'
        ELSE '❌ priority index MISSING'
    END as priority_index_status;

-- Show the complete table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    CASE 
        WHEN column_name = 'clinician_id' THEN '👨‍⚕️ Clinician Assignment'
        WHEN column_name = 'priority' THEN '⚡ Case Priority'
        ELSE ''
    END as description
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY ordinal_position;

-- Test the foreign key constraint
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
    AND tc.table_name = 'cases'
    AND kcu.column_name = 'clinician_id';

-- Show sample data with new columns
SELECT 
    id,
    case_number,
    status,
    case_manager_id,
    worker_id,
    clinician_id,
    priority,
    created_at,
    updated_at
FROM cases 
LIMIT 5;




