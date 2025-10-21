-- Manual Test for Rehabilitation Plan Notifications
-- Run this in Supabase SQL Editor to test the notification system

-- 1. Check if we have users with the right roles
SELECT 
    id,
    first_name,
    last_name,
    role,
    email
FROM users 
WHERE role IN ('clinician', 'worker')
ORDER BY role, first_name;

-- 2. Check if we have cases with assigned clinicians and workers
SELECT 
    c.id as case_id,
    c.case_number,
    c.status,
    c.clinician_id,
    c.worker_id,
    cl.first_name as clinician_name,
    w.first_name as worker_name
FROM cases c
LEFT JOIN users cl ON c.clinician_id = cl.id
LEFT JOIN users w ON c.worker_id = w.id
WHERE c.clinician_id IS NOT NULL AND c.worker_id IS NOT NULL
LIMIT 5;

-- 3. Test creating a rehabilitation plan assignment notification manually
-- Replace the UUIDs with actual user IDs from step 1
DO $$
DECLARE
    clinician_id UUID;
    worker_id UUID;
    case_id UUID;
BEGIN
    -- Get a clinician and worker
    SELECT id INTO clinician_id FROM users WHERE role = 'clinician' LIMIT 1;
    SELECT id INTO worker_id FROM users WHERE role = 'worker' LIMIT 1;
    SELECT id INTO case_id FROM cases WHERE clinician_id IS NOT NULL AND worker_id IS NOT NULL LIMIT 1;
    
    -- Create notification
    INSERT INTO notifications (
        recipient_id,
        sender_id,
        type,
        title,
        message,
        priority,
        is_read
    ) VALUES (
        worker_id,
        clinician_id,
        'rehab_plan_assigned',
        'Test: New Rehabilitation Plan Assigned',
        'This is a test notification for rehabilitation plan assignment.',
        'high',
        false
    );
    
    RAISE NOTICE 'Test notification created for worker: %', worker_id;
END $$;

-- 4. Test creating a rehabilitation plan completion notification manually
DO $$
DECLARE
    clinician_id UUID;
    worker_id UUID;
BEGIN
    -- Get a clinician and worker
    SELECT id INTO clinician_id FROM users WHERE role = 'clinician' LIMIT 1;
    SELECT id INTO worker_id FROM users WHERE role = 'worker' LIMIT 1;
    
    -- Create notification
    INSERT INTO notifications (
        recipient_id,
        sender_id,
        type,
        title,
        message,
        priority,
        is_read
    ) VALUES (
        clinician_id,
        worker_id,
        'rehab_plan_completed',
        'Test: Rehabilitation Plan Completed',
        'This is a test notification for rehabilitation plan completion.',
        'medium',
        false
    );
    
    RAISE NOTICE 'Test notification created for clinician: %', clinician_id;
END $$;

-- 5. Check if the test notifications were created
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
WHERE title LIKE 'Test:%'
ORDER BY created_at DESC;

-- 6. Check all recent notifications
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.is_read,
    n.created_at,
    r.first_name as recipient_name,
    r.role as recipient_role,
    s.first_name as sender_name,
    s.role as sender_role
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
LEFT JOIN users s ON n.sender_id = s.id
ORDER BY n.created_at DESC
LIMIT 10;
