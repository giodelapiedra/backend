-- Add return_to_work status to incidents table
-- This will track when a worker has returned to work after an incident

-- Add the return_to_work column to incidents table
ALTER TABLE public.incidents 
ADD COLUMN return_to_work boolean DEFAULT false;

-- Add a comment to explain the column
COMMENT ON COLUMN public.incidents.return_to_work IS 'Indicates if the worker has returned to work after this incident (true) or is still on restricted duty (false)';

-- Create an index for better query performance when filtering by return_to_work status
CREATE INDEX IF NOT EXISTS idx_incidents_return_to_work 
ON public.incidents (return_to_work) 
TABLESPACE pg_default;

-- Create a composite index for worker_id and return_to_work for efficient queries
CREATE INDEX IF NOT EXISTS idx_incidents_worker_return_to_work 
ON public.incidents (worker_id, return_to_work) 
TABLESPACE pg_default;

-- Optional: Create a function to automatically update return_to_work status when case status changes
CREATE OR REPLACE FUNCTION update_incident_return_to_work()
RETURNS TRIGGER AS $$
BEGIN
    -- When a case status is updated to 'return_to_work' or 'closed'
    IF NEW.status IN ('return_to_work', 'closed') AND OLD.status NOT IN ('return_to_work', 'closed') THEN
        -- Update the related incident's return_to_work status
        UPDATE public.incidents 
        SET return_to_work = true 
        WHERE case_id = NEW.id;
        
        RAISE NOTICE 'Updated incident return_to_work status to true for case_id: %', NEW.id;
    END IF;
    
    -- When a case status is changed from 'return_to_work' or 'closed' back to something else
    IF OLD.status IN ('return_to_work', 'closed') AND NEW.status NOT IN ('return_to_work', 'closed') THEN
        -- Update the related incident's return_to_work status back to false
        UPDATE public.incidents 
        SET return_to_work = false 
        WHERE case_id = NEW.id;
        
        RAISE NOTICE 'Updated incident return_to_work status to false for case_id: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to automatically update incident return_to_work status
DROP TRIGGER IF EXISTS trigger_update_incident_return_to_work ON public.cases;
CREATE TRIGGER trigger_update_incident_return_to_work
    AFTER UPDATE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_return_to_work();

-- Optional: Update existing incidents based on their related case status
-- This will set return_to_work = true for incidents where the case is already closed or return_to_work
UPDATE public.incidents 
SET return_to_work = true 
WHERE case_id IN (
    SELECT id FROM public.cases 
    WHERE status IN ('return_to_work', 'closed')
);

-- Show summary of the update
SELECT 
    'Incidents updated with return_to_work status' as message,
    COUNT(*) as total_incidents,
    COUNT(CASE WHEN return_to_work = true THEN 1 END) as return_to_work_count,
    COUNT(CASE WHEN return_to_work = false THEN 1 END) as still_restricted_count
FROM public.incidents;
