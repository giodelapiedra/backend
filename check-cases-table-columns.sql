-- Check which columns exist in the cases table
-- This will help identify missing columns

-- Check if specific columns exist
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

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'cases' 
            AND column_name = 'updated_at'
        ) 
        THEN '✅ updated_at column EXISTS'
        ELSE '❌ updated_at column MISSING'
    END as updated_at_status;

-- Show all columns in the cases table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY ordinal_position;

-- Check if the cases table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'cases'
        ) 
        THEN '✅ cases table EXISTS'
        ELSE '❌ cases table MISSING'
    END as cases_table_status;




