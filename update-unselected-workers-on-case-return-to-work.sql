-- Create function to automatically update unselected_workers case_status when case goes to return_to_work
CREATE OR REPLACE FUNCTION update_unselected_workers_on_case_return_to_work()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the case status changed to 'return_to_work'
    IF NEW.status = 'return_to_work' AND (OLD.status IS NULL OR OLD.status != 'return_to_work') THEN
        -- Update all unselected_workers records for this worker to 'closed'
        UPDATE unselected_workers 
        SET 
            case_status = 'closed',
            closed_at = NOW(),
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id 
        AND case_status IN ('open', 'in_progress');
        
        -- Log the update (optional)
        RAISE NOTICE 'Unselected workers for worker % updated to closed due to case % status change to return_to_work', NEW.worker_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on cases table to update unselected_workers
DROP TRIGGER IF EXISTS trigger_update_unselected_workers_on_case_return_to_work ON cases;
CREATE TRIGGER trigger_update_unselected_workers_on_case_return_to_work
    AFTER UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_unselected_workers_on_case_return_to_work();

-- Also create trigger for INSERT in case a case is created with return_to_work status
CREATE OR REPLACE FUNCTION update_unselected_workers_on_case_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the case is created with 'return_to_work' status
    IF NEW.status = 'return_to_work' THEN
        -- Update all unselected_workers records for this worker to 'closed'
        UPDATE unselected_workers 
        SET 
            case_status = 'closed',
            closed_at = NOW(),
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id 
        AND case_status IN ('open', 'in_progress');
        
        -- Log the update (optional)
        RAISE NOTICE 'Unselected workers for worker % updated to closed due to new case % with return_to_work status', NEW.worker_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trigger_update_unselected_workers_on_case_insert ON cases;
CREATE TRIGGER trigger_update_unselected_workers_on_case_insert
    AFTER INSERT ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_unselected_workers_on_case_insert();

-- Test the trigger (optional - you can run this to test)
-- First, let's see what unselected_workers and cases exist
SELECT 
    uw.id as unselected_worker_id,
    uw.worker_id,
    uw.case_status as unselected_status,
    uw.assignment_date,
    uw.reason,
    c.id as case_id,
    c.case_number,
    c.status as case_status,
    w.first_name,
    w.last_name
FROM unselected_workers uw
LEFT JOIN cases c ON uw.worker_id = c.worker_id
LEFT JOIN users w ON uw.worker_id = w.id
WHERE uw.case_status IN ('open', 'in_progress')
ORDER BY uw.assignment_date DESC
LIMIT 10;
