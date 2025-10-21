-- Fix Rehabilitation Plans when Clinician is Unassigned
-- This creates a trigger to automatically pause rehabilitation plans when clinician_id is set to NULL
-- Run this in Supabase SQL Editor

-- Create function to handle clinician unassignment
CREATE OR REPLACE FUNCTION handle_clinician_unassignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if clinician_id was set to NULL (unassigned)
    IF NEW.clinician_id IS NULL AND (OLD.clinician_id IS NOT NULL) THEN
        -- Pause all active rehabilitation plans for this case
        UPDATE rehabilitation_plans 
        SET 
            status = 'paused',
            updated_at = NOW()
        WHERE case_id = NEW.id 
        AND status IN ('active', 'paused')
        AND clinician_id = OLD.clinician_id;
        
        -- Log the update
        RAISE NOTICE 'Paused rehabilitation plans for case % due to clinician unassignment', NEW.id;
    END IF;
    
    -- Check if clinician_id was changed to a different clinician
    IF NEW.clinician_id IS NOT NULL AND OLD.clinician_id IS NOT NULL 
       AND NEW.clinician_id != OLD.clinician_id THEN
        -- Pause all active rehabilitation plans for the old clinician
        UPDATE rehabilitation_plans 
        SET 
            status = 'paused',
            updated_at = NOW()
        WHERE case_id = NEW.id 
        AND status IN ('active', 'paused')
        AND clinician_id = OLD.clinician_id;
        
        -- Log the update
        RAISE NOTICE 'Paused rehabilitation plans for case % due to clinician reassignment from % to %', 
                     NEW.id, OLD.clinician_id, NEW.clinician_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on cases table
DROP TRIGGER IF EXISTS trigger_handle_clinician_unassignment ON cases;
CREATE TRIGGER trigger_handle_clinician_unassignment
    AFTER UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION handle_clinician_unassignment();

-- Test the trigger by checking current state
SELECT 
    c.id as case_id,
    c.case_number,
    c.clinician_id,
    c.status as case_status,
    rp.id as rehab_plan_id,
    rp.plan_name,
    rp.status as rehab_status,
    rp.clinician_id as plan_clinician_id,
    w.email as worker_email
FROM cases c
LEFT JOIN rehabilitation_plans rp ON c.id = rp.case_id
LEFT JOIN users w ON c.worker_id = w.id
WHERE w.email = 'samward@gmail.com'
ORDER BY c.created_at DESC;

-- Fix existing data: Pause active plans where clinician is not assigned to case
UPDATE rehabilitation_plans 
SET 
    status = 'paused',
    updated_at = NOW()
WHERE id IN (
    SELECT rp.id 
    FROM rehabilitation_plans rp
    JOIN cases c ON rp.case_id = c.id
    WHERE rp.status IN ('active', 'paused')
    AND (c.clinician_id IS NULL OR c.clinician_id != rp.clinician_id)
);

-- Verify the fix
SELECT 
    'Fixed rehabilitation plans' as action,
    COUNT(*) as paused_plans
FROM rehabilitation_plans 
WHERE status = 'paused'
AND updated_at > NOW() - INTERVAL '1 minute';

-- Show final state for samward
SELECT 
    c.id as case_id,
    c.case_number,
    c.clinician_id,
    c.status as case_status,
    rp.id as rehab_plan_id,
    rp.plan_name,
    rp.status as rehab_status,
    rp.clinician_id as plan_clinician_id,
    w.email as worker_email,
    CASE 
        WHEN c.clinician_id IS NULL THEN '❌ No clinician assigned'
        WHEN c.clinician_id != rp.clinician_id THEN '⚠️ Clinician mismatch'
        ELSE '✅ Clinician properly assigned'
    END as assignment_status
FROM cases c
LEFT JOIN rehabilitation_plans rp ON c.id = rp.case_id
LEFT JOIN users w ON c.worker_id = w.id
WHERE w.email = 'samward@gmail.com'
ORDER BY c.created_at DESC;
