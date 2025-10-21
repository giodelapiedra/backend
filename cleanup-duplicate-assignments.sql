-- Cleanup Duplicate Assignments
-- This script removes duplicate assignments, keeping only the most recent one

-- First, let's see what duplicates exist
SELECT 
    worker_id, 
    assigned_date, 
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at DESC) as assignment_ids,
    array_agg(status ORDER BY created_at DESC) as statuses,
    array_agg(created_at ORDER BY created_at DESC) as created_times
FROM work_readiness_assignments 
GROUP BY worker_id, assigned_date 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Create a temporary table with the IDs to keep (most recent for each worker/date)
WITH duplicates_to_keep AS (
    SELECT DISTINCT ON (worker_id, assigned_date)
        id,
        worker_id,
        assigned_date,
        created_at
    FROM work_readiness_assignments
    ORDER BY worker_id, assigned_date, created_at DESC
),
duplicates_to_delete AS (
    SELECT w.id
    FROM work_readiness_assignments w
    WHERE NOT EXISTS (
        SELECT 1 FROM duplicates_to_keep k 
        WHERE k.id = w.id
    )
    AND EXISTS (
        SELECT 1 FROM duplicates_to_keep k 
        WHERE k.worker_id = w.worker_id 
        AND k.assigned_date = w.assigned_date
    )
)
-- Show what will be deleted (for verification)
SELECT 
    'TO DELETE' as action,
    w.id,
    w.worker_id,
    w.assigned_date,
    w.status,
    w.created_at,
    u.first_name,
    u.last_name
FROM work_readiness_assignments w
JOIN users u ON u.id = w.worker_id
WHERE w.id IN (SELECT id FROM duplicates_to_delete)
ORDER BY w.worker_id, w.assigned_date, w.created_at;

-- Uncomment the line below to actually delete the duplicates
-- DELETE FROM work_readiness_assignments WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Verify no duplicates remain
SELECT 
    worker_id, 
    assigned_date, 
    COUNT(*) as count
FROM work_readiness_assignments 
GROUP BY worker_id, assigned_date 
HAVING COUNT(*) > 1;
