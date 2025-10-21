-- Update Existing Assignments with Correct Due Dates
-- This script fixes assignments created before the due date fix

-- Check current assignments that need fixing
SELECT 
    'CURRENT ASSIGNMENTS' as status,
    w.id,
    w.worker_id,
    w.assigned_date,
    w.due_time,
    w.status,
    u.first_name,
    u.last_name,
    u.email
FROM work_readiness_assignments w
JOIN users u ON u.id = w.worker_id
WHERE w.assigned_date = '2025-10-10'
ORDER BY w.due_time DESC;

-- Update assignments based on team leader's assigned shift end time
-- This dynamically gets the shift end time for each team leader
WITH team_leader_shifts AS (
    SELECT DISTINCT
        w.team_leader_id,
        st.end_time,
        st.name as shift_name
    FROM work_readiness_assignments w
    JOIN team_leader_shifts tls ON tls.team_leader_id = w.team_leader_id
    JOIN shift_types st ON st.id = tls.shift_type_id
    WHERE w.assigned_date = '2025-10-10'
    AND tls.is_active = true
    AND tls.effective_date <= '2025-10-10'
    AND (tls.end_date IS NULL OR tls.end_date >= '2025-10-10')
)
UPDATE work_readiness_assignments 
SET 
    due_time = assigned_date::timestamp + (
        SELECT EXTRACT(hour FROM end_time::time) * INTERVAL '1 hour' +
               EXTRACT(minute FROM end_time::time) * INTERVAL '1 minute'
        FROM team_leader_shifts 
        WHERE team_leader_id = work_readiness_assignments.team_leader_id
    ),
    updated_at = NOW()
WHERE assigned_date = '2025-10-10'
AND EXISTS (
    SELECT 1 FROM team_leader_shifts 
    WHERE team_leader_id = work_readiness_assignments.team_leader_id
);

-- Show updated assignments
SELECT 
    'UPDATED ASSIGNMENTS' as status,
    w.id,
    w.worker_id,
    w.assigned_date,
    w.due_time,
    w.status,
    u.first_name,
    u.last_name,
    u.email
FROM work_readiness_assignments w
JOIN users u ON u.id = w.worker_id
WHERE w.assigned_date = '2025-10-10'
ORDER BY w.due_time DESC;

-- Show current time for reference
SELECT 
    NOW() as current_time_utc,
    NOW() AT TIME ZONE 'Asia/Manila' as current_time_manila,
    '2025-10-10 14:00:00'::timestamp AT TIME ZONE 'Asia/Manila' as expected_due_time_manila;
