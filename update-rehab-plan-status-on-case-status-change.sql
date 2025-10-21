-- Update Rehabilitation Plan Status When Case Status Changes
-- This creates a trigger to automatically update rehabilitation plan status when case status changes
-- Run this in Supabase SQL Editor

-- Create function to handle case status changes
CREATE OR REPLACE FUNCTION update_rehab_plan_on_case_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When case status changes to active states (triaged, assessed, in_rehab)
    -- Update rehabilitation plan status to 'active' if it exists
    IF NEW.status IN ('triaged', 'assessed', 'in_rehab') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('triaged', 'assessed', 'in_rehab')) THEN
        
        -- Update rehabilitation plan status to 'active' for this case
        UPDATE rehabilitation_plans 
        SET 
            status = 'active',
            updated_at = NOW()
        WHERE case_id = NEW.id 
        AND status IN ('paused', 'completed', 'cancelled');
        
        -- Log the update
        RAISE NOTICE '✅ Updated rehabilitation plan status to active for case % (status: %)', NEW.id, NEW.status;
    END IF;
    
    -- When case status changes to 'return_to_work' or 'closed'
    -- Update rehabilitation plan status to 'completed' if it exists
    IF NEW.status IN ('return_to_work', 'closed') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('return_to_work', 'closed')) THEN
        
        -- Update rehabilitation plan status to 'completed' for this case
        UPDATE rehabilitation_plans 
        SET 
            status = 'completed',
            end_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE case_id = NEW.id 
        AND status IN ('active', 'paused');
        
        -- Log the update
        RAISE NOTICE '✅ Updated rehabilitation plan status to completed for case % (status: %)', NEW.id, NEW.status;
    END IF;
    
    -- When case status changes back from active states to inactive states
    -- Update rehabilitation plan status to 'paused' if it exists
    IF OLD.status IN ('triaged', 'assessed', 'in_rehab') AND 
       NEW.status NOT IN ('triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed') THEN
        
        -- Update rehabilitation plan status to 'paused' for this case
        UPDATE rehabilitation_plans 
        SET 
            status = 'paused',
            updated_at = NOW()
        WHERE case_id = NEW.id 
        AND status = 'active';
        
        -- Log the update
        RAISE NOTICE '⚠️ Updated rehabilitation plan status to paused for case % (status: %)', NEW.id, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on cases table
DROP TRIGGER IF EXISTS trigger_update_rehab_plan_on_case_status_change ON cases;
CREATE TRIGGER trigger_update_rehab_plan_on_case_status_change
    AFTER UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_rehab_plan_on_case_status_change();

-- Test the trigger by checking current state
SELECT 
    c.id as case_id,
    c.case_number,
    c.status as case_status,
    rp.id as rehab_plan_id,
    rp.plan_name,
    rp.status as rehab_status,
    rp.updated_at as rehab_updated_at
FROM cases c
LEFT JOIN rehabilitation_plans rp ON c.id = rp.case_id
WHERE c.clinician_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 10;

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_rehab_plan_on_case_status_change';
