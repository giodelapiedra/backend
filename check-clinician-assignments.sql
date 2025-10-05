-- Check how many incidents/cases are assigned to admin_clinician@test.com
-- This will show the current assignment status

-- First, get the clinician's user ID
SELECT 
    id as clinician_id,
    email,
    first_name,
    last_name,
    role,
    is_active
FROM users 
WHERE email = 'admin_clinician@test.com';

-- Check how many cases are assigned to this clinician
SELECT 
    COUNT(*) as total_assigned_cases,
    'Cases assigned to admin_clinician@test.com' as description
FROM cases c
JOIN users u ON c.clinician_id = u.id
WHERE u.email = 'admin_clinician@test.com';

-- Show detailed information about assigned cases
SELECT 
    c.id as case_id,
    c.case_number,
    c.status,
    c.priority,
    c.created_at as case_created,
    c.updated_at as case_updated,
    c.clinician_id,
    u.email as clinician_email,
    u.first_name || ' ' || u.last_name as clinician_name,
    w.first_name || ' ' || w.last_name as worker_name,
    w.email as worker_email,
    i.id as incident_id,
    i.description as incident_description,
    i.severity as incident_severity
FROM cases c
JOIN users u ON c.clinician_id = u.id
LEFT JOIN users w ON c.worker_id = w.id
LEFT JOIN incidents i ON c.incident_id = i.id
WHERE u.email = 'admin_clinician@test.com'
ORDER BY c.updated_at DESC;

-- Check if there are any notifications for this clinician
SELECT 
    COUNT(*) as total_notifications,
    'Notifications for admin_clinician@test.com' as description
FROM notifications n
JOIN users u ON n.recipient_id = u.id
WHERE u.email = 'admin_clinician@test.com';

-- Show recent notifications for this clinician
SELECT 
    n.id as notification_id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.is_read,
    n.created_at,
    s.first_name || ' ' || s.last_name as sender_name,
    s.email as sender_email,
    c.case_number,
    i.id as incident_id
FROM notifications n
JOIN users u ON n.recipient_id = u.id
LEFT JOIN users s ON n.sender_id = s.id
LEFT JOIN cases c ON n.related_case_id = c.id
LEFT JOIN incidents i ON n.related_incident_id = i.id
WHERE u.email = 'admin_clinician@test.com'
ORDER BY n.created_at DESC
LIMIT 10;

-- Check the cases table structure to see if clinician_id column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'cases' AND column_name = 'clinician_id'
        ) 
        THEN '✅ clinician_id column EXISTS in cases table'
        ELSE '❌ clinician_id column MISSING in cases table'
    END as clinician_id_column_status;

-- Check if there are any cases at all in the database
SELECT 
    COUNT(*) as total_cases,
    'Total cases in database' as description
FROM cases;

-- Show all cases with their assignment status
SELECT 
    c.id,
    c.case_number,
    c.status,
    c.priority,
    c.clinician_id,
    u.email as clinician_email,
    u.first_name || ' ' || u.last_name as clinician_name,
    c.case_manager_id,
    cm.email as case_manager_email,
    cm.first_name || ' ' || cm.last_name as case_manager_name,
    c.created_at,
    c.updated_at
FROM cases c
LEFT JOIN users u ON c.clinician_id = u.id
LEFT JOIN users cm ON c.case_manager_id = cm.id
ORDER BY c.updated_at DESC
LIMIT 20;
