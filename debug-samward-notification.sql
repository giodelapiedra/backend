-- Debug Notification Issue for samward@gmail.com
-- Run this in Supabase SQL Editor to check what happened

-- 1. Check if samward@gmail.com user exists and get their details
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM users 
WHERE email = 'samward@gmail.com';

-- 2. Check if there are any notifications for samward@gmail.com
SELECT 
    n.id,
    n.recipient_id,
    n.sender_id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.is_read,
    n.created_at,
    s.first_name as sender_name,
    s.email as sender_email
FROM notifications n
LEFT JOIN users s ON n.sender_id = s.id
WHERE n.recipient_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
ORDER BY n.created_at DESC;

-- 3. Check recent rehabilitation plans created
SELECT 
    rp.id,
    rp.plan_name,
    rp.status,
    rp.worker_id,
    rp.clinician_id,
    rp.created_at,
    w.first_name as worker_name,
    w.email as worker_email,
    c.first_name as clinician_name,
    c.email as clinician_email,
    cs.case_number
FROM rehabilitation_plans rp
LEFT JOIN users w ON rp.worker_id = w.id
LEFT JOIN users c ON rp.clinician_id = c.id
LEFT JOIN cases cs ON rp.case_id = cs.id
ORDER BY rp.created_at DESC
LIMIT 10;

-- 4. Check if samward@gmail.com is assigned to any cases
SELECT 
    c.id as case_id,
    c.case_number,
    c.status,
    c.worker_id,
    c.clinician_id,
    w.first_name as worker_name,
    w.email as worker_email,
    cl.first_name as clinician_name,
    cl.email as clinician_email
FROM cases c
LEFT JOIN users w ON c.worker_id = w.id
LEFT JOIN users cl ON c.clinician_id = cl.id
WHERE w.email = 'samward@gmail.com' OR cl.email = 'samward@gmail.com'
ORDER BY c.created_at DESC;

-- 5. Check all recent notifications (last 24 hours)
SELECT 
    n.id,
    n.recipient_id,
    n.sender_id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.is_read,
    n.created_at,
    r.first_name as recipient_name,
    r.email as recipient_email,
    s.first_name as sender_name,
    s.email as sender_email
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
LEFT JOIN users s ON n.sender_id = s.id
WHERE n.created_at > NOW() - INTERVAL '24 hours'
ORDER BY n.created_at DESC;

-- 6. Test creating a notification for samward@gmail.com manually
DO $$
DECLARE
    samward_id UUID;
    clinician_id UUID;
BEGIN
    -- Get samward's user ID
    SELECT id INTO samward_id FROM users WHERE email = 'samward@gmail.com';
    
    -- Get a clinician ID
    SELECT id INTO clinician_id FROM users WHERE role = 'clinician' LIMIT 1;
    
    IF samward_id IS NOT NULL THEN
        -- Create test notification
        INSERT INTO notifications (
            recipient_id,
            sender_id,
            type,
            title,
            message,
            priority,
            is_read
        ) VALUES (
            samward_id,
            clinician_id,
            'rehab_plan_assigned',
            'Test Notification for Samward',
            'This is a test notification to verify the system works for samward@gmail.com',
            'high',
            false
        );
        
        RAISE NOTICE 'Test notification created for samward@gmail.com (ID: %)', samward_id;
    ELSE
        RAISE NOTICE 'User samward@gmail.com not found!';
    END IF;
END $$;

-- 7. Check if the test notification was created
SELECT 
    n.id,
    n.recipient_id,
    n.type,
    n.title,
    n.message,
    n.created_at,
    r.email as recipient_email
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
WHERE r.email = 'samward@gmail.com'
ORDER BY n.created_at DESC;
