-- Simplified Rehabilitation Plan Status Update Trigger
-- This is a more direct approach that should definitely work
-- Run this in Supabase SQL Editor

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_rehab_plan_on_case_status_change ON cases;
DROP FUNCTION IF EXISTS update_rehab_plan_on_case_status_change();

-- Create a simpler, more direct function
CREATE OR REPLACE FUNCTION update_rehab_plan_on_case_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the trigger execution
    RAISE NOTICE 'Trigger fired: Case % status changed from % to %', NEW.id, OLD.status, NEW.status;
    
    -- When case status changes to active states (triaged, assessed, in_rehab)
    -- Update rehabilitation plan status to 'active' if it exists
    IF NEW.status IN ('triaged', 'assessed', 'in_rehab') THEN
        -- Update ALL rehabilitation plans for this case to 'active'
        UPDATE rehabilitation_plans 
        SET 
            status = 'active',
            updated_at = NOW()
        WHERE case_id = NEW.id;
        
        -- Log the update
        RAISE NOTICE 'Updated rehabilitation plan status to active for case % (status: %)', NEW.id, NEW.status;
    END IF;
    
    -- When case status changes to completion states
    IF NEW.status IN ('return_to_work', 'closed') THEN
        -- Update ALL rehabilitation plans for this case to 'completed'
        UPDATE rehabilitation_plans 
        SET 
            status = 'completed',
            end_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE case_id = NEW.id;
        
        -- Log the update
        RAISE NOTICE 'Updated rehabilitation plan status to completed for case % (status: %)', NEW.id, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_update_rehab_plan_on_case_status_change
    AFTER UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_rehab_plan_on_case_status_change();

-- Test the trigger by updating a case status
-- First, let's find a case with a rehabilitation plan
SELECT 
    c.id as case_id,
    c.case_number,
    c.status as case_status,
    rp.id as rehab_plan_id,
    rp.status as rehab_status
FROM cases c
JOIN rehabilitation_plans rp ON c.id = rp.case_id
WHERE rp.status = 'completed'
LIMIT 1;

-- Manual test (replace 'your-case-id' with actual case ID from above query)
-- UPDATE cases 
-- SET status = 'triaged', updated_at = NOW()
-- WHERE id = 'your-case-id-here';

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_rehab_plan_on_case_status_change';
