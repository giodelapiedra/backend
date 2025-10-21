-- Add unique constraint to unselected_workers table
-- This prevents duplicate entries for the same team leader and worker combination

-- Check if constraint already exists
DO $$
BEGIN
    -- Check if unique constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'unselected_workers_team_leader_id_worker_id_key'
        AND table_name = 'unselected_workers'
        AND constraint_type = 'UNIQUE'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE unselected_workers 
        ADD CONSTRAINT unselected_workers_team_leader_id_worker_id_key 
        UNIQUE (team_leader_id, worker_id);
        
        RAISE NOTICE 'Added unique constraint for team_leader_id, worker_id';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Verify the constraint was added
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'unselected_workers' 
AND constraint_type = 'UNIQUE';

-- Show table structure
\d unselected_workers;




