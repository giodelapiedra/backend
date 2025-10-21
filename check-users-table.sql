-- =============================================
-- CHECK USERS TABLE STRUCTURE
-- =============================================

-- Check what columns exist in users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check current users
SELECT id, first_name, last_name, email, role, package, is_active, created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
