-- Check the current structure of the work_readiness table
-- This will help identify what columns are missing

-- Show all columns in the work_readiness table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'work_readiness' 
ORDER BY ordinal_position;

-- Show foreign key constraints
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
    AND tc.table_name = 'work_readiness';

-- Show indexes on the work_readiness table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'work_readiness';

-- Show sample data from work_readiness table (first 5 rows)
SELECT * FROM work_readiness LIMIT 5;
