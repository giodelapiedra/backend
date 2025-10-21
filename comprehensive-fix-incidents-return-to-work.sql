-- COMPREHENSIVE FIX FOR INCIDENTS RETURN_TO_WORK STATUS
-- This handles all possible scenarios where incidents might not be updating

-- First, let's check the current state
SELECT 
    'CURRENT STATE:' as message,
    COUNT(*) as total_incidents,
    COUNT(CASE WHEN return_to_work = true THEN 1 END) as return_to_work_count,
    COUNT(CASE WHEN return_to_work = false THEN 1 END) as still_restricted_count
FROM public.incidents;

-- SCENARIO 1: Incidents with case_id linked to closed cases
-- Update incidents that have case_id and the case is closed
UPDATE public.incidents 
SET return_to_work = true 
WHERE case_id IN (
    SELECT id FROM public.cases 
    WHERE status IN ('return_to_work', 'closed')
);

-- SCENARIO 2: Incidents without case_id but should be linked
-- Check if there are incidents that should be linked to cases
-- This might happen if the incident was created before the case

-- First, let's see if we can match incidents to cases by worker_id and incident_id
UPDATE public.incidents 
SET 
    case_id = c.id,
    return_to_work = CASE 
        WHEN c.status IN ('return_to_work', 'closed') THEN true 
        ELSE false 
    END
FROM public.cases c
WHERE public.incidents.case_id IS NULL 
AND public.incidents.worker_id = c.worker_id
AND c.status IN ('return_to_work', 'closed');

-- SCENARIO 3: Incidents that might be linked via incident_id in cases table
-- Some systems might use incident_id in cases table instead of case_id in incidents
UPDATE public.incidents 
SET 
    case_id = c.id,
    return_to_work = CASE 
        WHEN c.status IN ('return_to_work', 'closed') THEN true 
        ELSE false 
    END
FROM public.cases c
WHERE public.incidents.case_id IS NULL 
AND public.incidents.id = c.incident_id
AND c.status IN ('return_to_work', 'closed');

-- SCENARIO 4: Manual fix for any remaining incidents
-- If there are still incidents that should be marked as return_to_work
-- This is a fallback for any edge cases

-- Check if there are incidents with worker_id that matches closed cases
UPDATE public.incidents 
SET return_to_work = true 
WHERE case_id IS NULL 
AND worker_id IN (
    SELECT worker_id 
    FROM public.cases 
    WHERE status IN ('return_to_work', 'closed')
    AND worker_id IS NOT NULL
);

-- SCENARIO 5: Update incidents based on case status changes
-- This ensures the trigger function works correctly
CREATE OR REPLACE FUNCTION update_incident_return_to_work_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When case status is updated to 'return_to_work' or 'closed'
    IF NEW.status IN ('return_to_work', 'closed') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('return_to_work', 'closed')) THEN
        
        -- Update ALL related incidents' return_to_work status to true
        UPDATE public.incidents 
        SET return_to_work = true 
        WHERE case_id = NEW.id;
        
        -- Also update incidents that might be linked by worker_id
        UPDATE public.incidents 
        SET return_to_work = true 
        WHERE case_id IS NULL 
        AND worker_id = NEW.worker_id;
        
        RAISE NOTICE '✅ Updated incident return_to_work status to TRUE for case_id: % (status: %)', NEW.id, NEW.status;
    END IF;
    
    -- When case status is changed back from 'return_to_work' or 'closed' to something else
    IF OLD.status IN ('return_to_work', 'closed') AND NEW.status NOT IN ('return_to_work', 'closed') THEN
        
        -- Update the related incident's return_to_work status back to false
        UPDATE public.incidents 
        SET return_to_work = false 
        WHERE case_id = NEW.id;
        
        RAISE NOTICE '⚠️ Updated incident return_to_work status to FALSE for case_id: % (status: %)', NEW.id, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_update_incident_return_to_work ON public.cases;
CREATE TRIGGER trigger_update_incident_return_to_work
    AFTER UPDATE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_return_to_work_status();

-- Final check - show the updated state
SELECT 
    'FINAL STATE AFTER COMPREHENSIVE FIX:' as message,
    COUNT(*) as total_incidents,
    COUNT(CASE WHEN return_to_work = true THEN 1 END) as return_to_work_count,
    COUNT(CASE WHEN return_to_work = false THEN 1 END) as still_restricted_count
FROM public.incidents;

-- Show detailed breakdown
SELECT 
    'DETAILED BREAKDOWN:' as message,
    i.id as incident_id,
    i.case_id,
    i.return_to_work,
    c.status as case_status,
    c.case_number,
    CASE 
        WHEN i.case_id IS NULL THEN 'No case linked'
        WHEN c.id IS NULL THEN 'Case not found'
        ELSE 'Properly linked'
    END as linking_status
FROM public.incidents i
LEFT JOIN public.cases c ON i.case_id = c.id
ORDER BY i.created_at DESC;
