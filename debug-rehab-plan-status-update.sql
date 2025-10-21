-- Debug Rehabilitation Plan Status Update Issue
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_rehab_plan_on_case_status_change';

-- 2. Check current case and rehabilitation plan statuses
SELECT 
    c.id as case_id,
    c.case_number,
    c.status as case_status,
    c.updated_at as case_updated_at,
    rp.id as rehab_plan_id,
    rp.plan_name,
    rp.status as rehab_status,
    rp.updated_at as rehab_updated_at
FROM cases c
LEFT JOIN rehabilitation_plans rp ON c.id = rp.case_id
WHERE c.clinician_id IS NOT NULL
ORDER BY c.updated_at DESC
LIMIT 10;

-- 3. Check if there are any rehabilitation plans with 'completed' status
SELECT 
    rp.id,
    rp.case_id,
    rp.status,
    rp.updated_at,
    c.case_number,
    c.status as case_status
FROM rehabilitation_plans rp
JOIN cases c ON rp.case_id = c.id
WHERE rp.status = 'completed'
ORDER BY rp.updated_at DESC;

-- 4. Test the trigger manually (replace 'your-case-id' with actual case ID)
-- First, find a case with a completed rehabilitation plan
SELECT 
    c.id as case_id,
    c.case_number,
    c.status as case_status,
    rp.id as rehab_plan_id,
    rp.status as rehab_status
FROM cases c
JOIN rehabilitation_plans rp ON c.id = rp.case_id
WHERE rp.status = 'completed'
LIMIT 1;

-- 5. Manual test update (uncomment and replace with actual case ID)
-- UPDATE cases 
-- SET status = 'triaged', updated_at = NOW()
-- WHERE id = 'your-case-id-here';

-- 6. Check if the trigger function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_rehab_plan_on_case_status_change';

-- 7. Check recent case status changes
SELECT 
    c.id,
    c.case_number,
    c.status,
    c.updated_at
FROM cases c
WHERE c.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY c.updated_at DESC;
