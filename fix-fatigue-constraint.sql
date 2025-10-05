-- Fix fatigue_level constraint to allow 0-10 scale
-- Run this in your Supabase SQL editor

-- Drop the existing constraint that's causing the error
ALTER TABLE public.work_readiness 
DROP CONSTRAINT IF EXISTS work_readiness_fatigue_level_check;

-- Add the new constraint for 0-10 scale
ALTER TABLE public.work_readiness 
ADD CONSTRAINT work_readiness_fatigue_level_check 
CHECK (fatigue_level >= 0 AND fatigue_level <= 10);

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.work_readiness'::regclass 
AND conname LIKE '%fatigue_level%';
