-- Fix conflicting notification type constraints
-- Run this in your Supabase SQL Editor

-- Remove the conflicting constraint that blocks work_readiness_submitted
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Keep only the comprehensive constraint that allows work readiness notifications
-- (check_notification_type constraint should already exist and allow work_readiness_submitted)

-- Verify the remaining constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'notifications' AND constraint_name = 'check_notification_type';
