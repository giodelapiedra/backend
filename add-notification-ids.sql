-- Add incident_id and case_id columns to notifications table
-- Run this in your Supabase SQL Editor

-- Add incident_id column
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES incidents(id);

-- Add case_id column
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES cases(id);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
