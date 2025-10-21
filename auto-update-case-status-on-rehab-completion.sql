-- Create function to automatically update case status when rehabilitation plan is completed
CREATE OR REPLACE FUNCTION update_case_status_on_rehab_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the rehabilitation plan status changed to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Update the associated case status to 'return_to_work' 
        -- This indicates the worker is ready to return to work after completing rehabilitation
        UPDATE cases 
        SET 
            status = 'return_to_work',
            updated_at = NOW()
        WHERE id = NEW.case_id;
        
        -- Log the update (optional)
        RAISE NOTICE 'Case % status updated to return_to_work due to completed rehabilitation plan %', NEW.case_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on rehabilitation_plans table
DROP TRIGGER IF EXISTS trigger_update_case_on_rehab_completion ON rehabilitation_plans;
CREATE TRIGGER trigger_update_case_on_rehab_completion
    AFTER UPDATE ON rehabilitation_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_case_status_on_rehab_completion();

-- Also create trigger for INSERT in case a plan is created as completed
CREATE OR REPLACE FUNCTION update_case_status_on_rehab_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the rehabilitation plan is created with 'completed' status
    IF NEW.status = 'completed' THEN
        -- Update the associated case status to 'return_to_work'
        -- This indicates the worker is ready to return to work after completing rehabilitation
        UPDATE cases 
        SET 
            status = 'return_to_work',
            updated_at = NOW()
        WHERE id = NEW.case_id;
        
        -- Log the update (optional)
        RAISE NOTICE 'Case % status updated to return_to_work due to completed rehabilitation plan %', NEW.case_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trigger_update_case_on_rehab_insert ON rehabilitation_plans;
CREATE TRIGGER trigger_update_case_on_rehab_insert
    AFTER INSERT ON rehabilitation_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_case_status_on_rehab_insert();

-- Test the trigger (optional - you can run this to test)
-- First, let's see what cases and rehabilitation plans exist
SELECT 
    c.id as case_id,
    c.case_number,
    c.status as case_status,
    rp.id as rehab_plan_id,
    rp.plan_name,
    rp.status as rehab_status
FROM cases c
LEFT JOIN rehabilitation_plans rp ON c.id = rp.case_id
WHERE c.clinician_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 10;
