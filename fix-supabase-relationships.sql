-- Fix Supabase Foreign Key Relationships
-- Run this in your Supabase SQL Editor

-- First, check the actual table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'incidents' 
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Check if foreign key constraints exist
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('cases', 'incidents', 'notifications')
ORDER BY tc.table_name, kcu.column_name;

-- Drop existing foreign key constraints if they exist
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_worker_id_fkey;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_employer_id_fkey;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_case_manager_id_fkey;
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_incident_id_fkey;

ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_worker_id_fkey;
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_employer_id_fkey;
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_reported_by_id_fkey;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;

-- Add foreign key constraints for cases table (only for existing columns)
DO $$ 
BEGIN
    -- Add worker_id constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'worker_id') THEN
        ALTER TABLE cases 
        ADD CONSTRAINT cases_worker_id_fkey 
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add employer_id constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'employer_id') THEN
        ALTER TABLE cases 
        ADD CONSTRAINT cases_employer_id_fkey 
        FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add case_manager_id constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'case_manager_id') THEN
        ALTER TABLE cases 
        ADD CONSTRAINT cases_case_manager_id_fkey 
        FOREIGN KEY (case_manager_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add clinician_id constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'clinician_id') THEN
        ALTER TABLE cases 
        ADD CONSTRAINT cases_clinician_id_fkey 
        FOREIGN KEY (clinician_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add incident_id constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'incident_id') THEN
        ALTER TABLE cases 
        ADD CONSTRAINT cases_incident_id_fkey 
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add incident_id column to cases table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'incident_id') THEN
        ALTER TABLE cases ADD COLUMN incident_id UUID;
        ALTER TABLE cases 
        ADD CONSTRAINT cases_incident_id_fkey 
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for incidents table (only for existing columns)
DO $$ 
BEGIN
    -- Add worker_id constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'worker_id') THEN
        ALTER TABLE incidents 
        ADD CONSTRAINT incidents_worker_id_fkey 
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add employer_id constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'employer_id') THEN
        ALTER TABLE incidents 
        ADD CONSTRAINT incidents_employer_id_fkey 
        FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add reported_by_id constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'reported_by_id') THEN
        ALTER TABLE incidents 
        ADD CONSTRAINT incidents_reported_by_id_fkey 
        FOREIGN KEY (reported_by_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for notifications table (only if columns exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'recipient_id') THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_recipient_id_fkey 
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'sender_id') THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verify the constraints were created
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('cases', 'incidents', 'notifications')
ORDER BY tc.table_name, kcu.column_name;
