-- Fix notification constraints to match actual form values
-- Run this in your Supabase SQL Editor

-- Drop existing severity constraint
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_severity_check') THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_severity_check;
    END IF;
END $$;

-- Add new severity constraint that matches form values
ALTER TABLE notifications 
ADD CONSTRAINT notifications_severity_check 
CHECK (severity IN ('low', 'medium', 'high') OR severity IS NULL);

-- Drop existing priority constraint
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_priority_check') THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_priority_check;
    END IF;
END $$;

-- Add new priority constraint that matches form values
ALTER TABLE notifications 
ADD CONSTRAINT notifications_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'urgent') OR priority IS NULL);

-- Update existing notifications to have default values
UPDATE notifications 
SET priority = 'medium' 
WHERE priority IS NULL;

UPDATE notifications 
SET severity = 'medium' 
WHERE severity IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
