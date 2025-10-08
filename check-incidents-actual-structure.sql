-- Check what columns actually exist in the incidents table
-- This will help us create the correct RLS policies

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

-- Show sample data from incidents table (first 3 rows)
SELECT * FROM incidents LIMIT 3;
