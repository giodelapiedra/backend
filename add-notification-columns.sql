-- Add severity and priority columns to notifications table
-- Run this in your Supabase SQL Editor

-- Add severity column
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS severity VARCHAR(20);

-- Add priority column  
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority VARCHAR(10);

-- Add check constraints for severity (drop first if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_severity_check') THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_severity_check;
    END IF;
END $$;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_severity_check 
CHECK (severity IN ('near_miss', 'first_aid', 'medical_treatment', 'lost_time', 'fatality') OR severity IS NULL);

-- Add check constraints for priority (drop first if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_priority_check') THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_priority_check;
    END IF;
END $$;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'urgent') OR priority IS NULL);

-- Update existing notifications to have default priority
UPDATE notifications 
SET priority = 'medium' 
WHERE priority IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
