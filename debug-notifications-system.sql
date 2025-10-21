-- Debug Notifications System
-- Run this in Supabase SQL Editor to check the notification system

-- 1. Check if notifications table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 2. Check if there are any notifications in the table
SELECT 
    id,
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read,
    created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_clinician_on_rehab_plan_completion';

-- 4. Check if the function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'notify_clinician_on_rehab_plan_completion';

-- 5. Check current rehabilitation plans and their status
SELECT 
    rp.id,
    rp.plan_name,
    rp.status,
    rp.clinician_id,
    rp.worker_id,
    rp.updated_at,
    c.case_number,
    w.first_name as worker_name,
    cl.first_name as clinician_name
FROM rehabilitation_plans rp
LEFT JOIN cases c ON rp.case_id = c.id
LEFT JOIN users w ON rp.worker_id = w.id
LEFT JOIN users cl ON rp.clinician_id = cl.id
ORDER BY rp.updated_at DESC
LIMIT 10;

-- 6. Test creating a notification manually
INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read
) VALUES (
    (SELECT id FROM users WHERE role = 'clinician' LIMIT 1),
    (SELECT id FROM users WHERE role = 'worker' LIMIT 1),
    'test_notification',
    'Test Notification',
    'This is a test notification to verify the system works.',
    'medium',
    false
);

-- 7. Check if the test notification was created
SELECT 
    id,
    recipient_id,
    sender_id,
    type,
    title,
    message,
    created_at
FROM notifications
WHERE type = 'test_notification'
ORDER BY created_at DESC;
