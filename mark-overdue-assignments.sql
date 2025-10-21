-- Mark Overdue Assignments
-- This script manually marks assignments as overdue if they are past their due time

-- First, show what will be marked as overdue
SELECT 
    'WILL BE MARKED AS OVERDUE' as status,
    w.id,
    w.worker_id,
    w.assigned_date,
    w.due_time,
    w.due_time AT TIME ZONE 'Asia/Manila' as due_time_manila,
    w.status,
    u.first_name,
    u.last_name,
    u.email,
    NOW() - w.due_time as time_passed_since_due
FROM work_readiness_assignments w
JOIN users u ON u.id = w.worker_id
WHERE w.assigned_date = '2025-10-10'
AND w.due_time < NOW()
AND w.status = 'pending'
ORDER BY w.due_time DESC;

-- Mark assignments as overdue if they are past their due time
UPDATE work_readiness_assignments 
SET 
    status = 'overdue',
    updated_at = NOW()
WHERE assigned_date = '2025-10-10'
AND due_time < NOW()
AND status = 'pending';

-- Show the updated assignments
SELECT 
    'UPDATED TO OVERDUE' as status,
    w.id,
    w.worker_id,
    w.assigned_date,
    w.due_time,
    w.due_time AT TIME ZONE 'Asia/Manila' as due_time_manila,
    w.status,
    u.first_name,
    u.last_name,
    u.email,
    NOW() - w.due_time as time_passed_since_due
FROM work_readiness_assignments w
JOIN users u ON u.id = w.worker_id
WHERE w.assigned_date = '2025-10-10'
AND w.status = 'overdue'
ORDER BY w.due_time DESC;

-- Show current time for reference
SELECT 
    'CURRENT TIME REFERENCE' as status,
    NOW() as current_time_utc,
    NOW() AT TIME ZONE 'Asia/Manila' as current_time_manila,
    '2025-10-10 14:00:00'::timestamp AT TIME ZONE 'Asia/Manila' as oct_10_2pm_manila;
