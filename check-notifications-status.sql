-- Check existing notification types in your database
-- Run this FIRST to see what types already exist

-- Check current constraint definition
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
AND contype = 'c'  -- 'c' means check constraint
ORDER BY conname;

-- Check existing notification types and their counts
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- Check if metadata column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name = 'metadata';

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
