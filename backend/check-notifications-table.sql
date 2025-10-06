-- Check notifications table structure
-- This will help identify what's missing

-- Check if notifications table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'notifications'
        ) 
        THEN '✅ notifications table EXISTS'
        ELSE '❌ notifications table MISSING'
    END as notifications_table_status;

-- Check if recipient_id column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'recipient_id'
        ) 
        THEN '✅ recipient_id column EXISTS'
        ELSE '❌ recipient_id column MISSING'
    END as recipient_id_status;

-- Check if sender_id column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'sender_id'
        ) 
        THEN '✅ sender_id column EXISTS'
        ELSE '❌ sender_id column MISSING'
    END as sender_id_status;

-- Check if type column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'type'
        ) 
        THEN '✅ type column EXISTS'
        ELSE '❌ type column MISSING'
    END as type_status;

-- Check if is_read column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'is_read'
        ) 
        THEN '✅ is_read column EXISTS'
        ELSE '❌ is_read column MISSING'
    END as is_read_status;

-- Show all columns in the notifications table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Check if there are any notifications in the table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM notifications LIMIT 1
        ) 
        THEN '✅ notifications table has data'
        ELSE 'ℹ️ notifications table is empty'
    END as data_status;