-- Check the structure of the incidents table
-- This will help identify the correct column names

-- Check if incidents table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'incidents'
        ) 
        THEN '✅ incidents table EXISTS'
        ELSE '❌ incidents table MISSING'
    END as incidents_table_status;

-- Show all columns in the incidents table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'incidents' 
ORDER BY ordinal_position;

-- Check if there are any incidents in the table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM incidents LIMIT 1
        ) 
        THEN '✅ incidents table has data'
        ELSE 'ℹ️ incidents table is empty'
    END as data_status;

-- Show sample data from incidents table (first 5 rows)
SELECT 
    id,
    description,
    severity,
    status,
    created_at
FROM incidents 
LIMIT 5;
