-- Fixed check for admin_clinician@test.com assignments
-- This version uses the correct column names

-- Get clinician info
SELECT 
    'Clinician Info' as info_type,
    id as user_id,
    email,
    first_name || ' ' || last_name as full_name,
    role,
    is_active
FROM users 
WHERE email = 'admin_clinician@test.com';

-- Count assigned cases
SELECT 
    'Assigned Cases Count' as info_type,
    COUNT(*) as count,
    'Cases assigned to admin_clinician@test.com' as description
FROM cases c
JOIN users u ON c.clinician_id = u.id
WHERE u.email = 'admin_clinician@test.com';

-- Show assigned cases (if any) - using correct column names
SELECT 
    'Assigned Cases' as info_type,
    c.case_number,
    c.status,
    c.priority,
    w.first_name || ' ' || w.last_name as worker_name,
    i.id as incident_id,
    i.description as incident_description,
    i.severity,
    c.updated_at as assigned_date
FROM cases c
JOIN users u ON c.clinician_id = u.id
LEFT JOIN users w ON c.worker_id = w.id
LEFT JOIN incidents i ON c.incident_id = i.id
WHERE u.email = 'admin_clinician@test.com'
ORDER BY c.updated_at DESC;

-- Count notifications
SELECT 
    'Notifications Count' as info_type,
    COUNT(*) as count,
    'Notifications for admin_clinician@test.com' as description
FROM notifications n
JOIN users u ON n.recipient_id = u.id
WHERE u.email = 'admin_clinician@test.com';

-- Show recent notifications (if any)
SELECT 
    'Recent Notifications' as info_type,
    n.title,
    n.message,
    n.type,
    n.is_read,
    n.created_at,
    s.first_name || ' ' || s.last_name as sender_name
FROM notifications n
JOIN users u ON n.recipient_id = u.id
LEFT JOIN users s ON n.sender_id = s.id
WHERE u.email = 'admin_clinician@test.com'
ORDER BY n.created_at DESC
LIMIT 5;

-- Check if clinician_id column exists in cases table
SELECT 
    'Database Check' as info_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'cases' AND column_name = 'clinician_id'
        ) 
        THEN '✅ clinician_id column EXISTS'
        ELSE '❌ clinician_id column MISSING'
    END as clinician_id_status;

-- Check total cases in database
SELECT 
    'Database Check' as info_type,
    COUNT(*) as total_cases,
    'Total cases in database' as description
FROM cases;
