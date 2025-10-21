-- =============================================
-- ADD PACKAGE4 SUPPORT FOR ADMIN USERS
-- =============================================

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_package_check;

-- Add the new constraint with package4 included
ALTER TABLE users ADD CONSTRAINT users_package_check 
CHECK (package IN ('package1', 'package2', 'package3', 'package4'));

-- Update the default package for admin users to package4
UPDATE users 
SET package = 'package4' 
WHERE role = 'admin' AND package = 'package3';

-- Verify the constraint was added successfully
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'users_package_check';

-- Show current package distribution
SELECT package, COUNT(*) as user_count
FROM users 
GROUP BY package 
ORDER BY package;
