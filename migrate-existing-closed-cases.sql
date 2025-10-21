-- Migration script to move existing closed cases to closed_unselected_workers table
-- This script will handle any existing closed cases in the unselected_workers table

-- Step 1: Check if there are any existing closed cases
SELECT 
    COUNT(*) as closed_cases_count,
    'Existing closed cases in unselected_workers' as description
FROM unselected_workers 
WHERE case_status = 'closed';

-- Step 2: Move existing closed cases to closed_unselected_workers table
INSERT INTO closed_unselected_workers (
    original_case_id,
    team_leader_id,
    worker_id,
    assignment_date,
    reason,
    notes,
    closed_at,
    closed_by,
    created_at,
    updated_at
)
SELECT 
    id as original_case_id,
    team_leader_id,
    worker_id,
    assignment_date,
    reason,
    notes,
    updated_at as closed_at, -- Use updated_at as closed_at if no specific close time
    team_leader_id as closed_by, -- Assume team leader closed it
    created_at,
    updated_at
FROM unselected_workers 
WHERE case_status = 'closed';

-- Step 3: Show how many cases were migrated
SELECT 
    COUNT(*) as migrated_cases,
    'Cases migrated to closed_unselected_workers' as description
FROM closed_unselected_workers;

-- Step 4: Delete the migrated cases from unselected_workers
DELETE FROM unselected_workers 
WHERE case_status = 'closed';

-- Step 5: Verify the migration
SELECT 
    COUNT(*) as remaining_open_cases,
    'Remaining open cases in unselected_workers' as description
FROM unselected_workers;

-- Step 6: Show final counts
SELECT 
    (SELECT COUNT(*) FROM unselected_workers) as active_cases,
    (SELECT COUNT(*) FROM closed_unselected_workers) as closed_cases,
    'Final counts after migration' as description;

-- Step 7: Optional - Remove case_status column if no longer needed
-- Uncomment the following lines if you want to remove the case_status column
-- ALTER TABLE unselected_workers DROP COLUMN IF EXISTS case_status;

-- Step 8: Verify table structures
SELECT 
    'unselected_workers' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'unselected_workers'
ORDER BY ordinal_position;

SELECT 
    'closed_unselected_workers' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'closed_unselected_workers'
ORDER BY ordinal_position;
