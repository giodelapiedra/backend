-- Create incidents table with proper structure
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NULL,
  reported_by uuid NULL,
  incident_type character varying(50) NULL,
  description text NULL,
  severity character varying(20) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  worker_id uuid NULL,
  return_to_work boolean NULL DEFAULT false,
  CONSTRAINT incidents_pkey PRIMARY KEY (id),
  CONSTRAINT incidents_case_id_fkey FOREIGN KEY (case_id) REFERENCES cases (id),
  CONSTRAINT incidents_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES users (id),
  CONSTRAINT incidents_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES users (id)
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id ON public.incidents USING btree (worker_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_incidents_case_id ON public.incidents USING btree (case_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_incidents_return_to_work ON public.incidents USING btree (return_to_work) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_incidents_worker_return_to_work ON public.incidents USING btree (worker_id, return_to_work) TABLESPACE pg_default;

-- Function to handle incident creation
CREATE OR REPLACE FUNCTION handle_incident_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the incident creation
    RAISE NOTICE 'New incident created with ID: %, Worker ID: %, Type: %, Severity: %', 
        NEW.id, NEW.worker_id, NEW.incident_type, NEW.severity;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to link incident to case and update unselected workers
CREATE OR REPLACE FUNCTION link_incident_case_to_unselected_worker()
RETURNS TRIGGER AS $$
BEGIN
    -- When case_id is updated or inserted
    IF NEW.case_id IS NOT NULL THEN
        -- Update the incident's worker_id to match the case's worker_id
        UPDATE public.incidents 
        SET worker_id = (
            SELECT worker_id 
            FROM public.cases 
            WHERE id = NEW.case_id
        )
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Linked incident % to case % and updated worker_id', NEW.id, NEW.case_id;
        
        -- Update unselected workers status
        UPDATE public.unselected_workers 
        SET 
            case_status = 'in_progress',
            updated_at = NOW()
        WHERE worker_id = (
            SELECT worker_id 
            FROM public.cases 
            WHERE id = NEW.case_id
        ) 
        AND case_status = 'open';
        
        RAISE NOTICE 'Updated unselected workers status to in_progress for case %', NEW.case_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CRITICAL FUNCTION: Update incident return_to_work status when case status changes
-- This handles ALL valid case status values: 'new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed'
CREATE OR REPLACE FUNCTION update_incident_return_to_work_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When case status is updated to 'return_to_work' or 'closed'
    -- These are the statuses that indicate worker can return to work
    IF NEW.status IN ('return_to_work', 'closed') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('return_to_work', 'closed')) THEN
        
        -- Update ALL related incidents' return_to_work status to true
        UPDATE public.incidents 
        SET return_to_work = true 
        WHERE case_id = NEW.id;
        
        RAISE NOTICE '✅ Updated incident return_to_work status to TRUE for case_id: % (status: %)', NEW.id, NEW.status;
        
        -- Also update unselected workers to closed status
        UPDATE public.unselected_workers 
        SET 
            case_status = 'closed',
            closed_at = NOW(),
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id 
        AND case_status IN ('open', 'in_progress');
        
        RAISE NOTICE '✅ Updated unselected workers to closed for worker % due to case % status change', NEW.worker_id, NEW.id;
    END IF;
    
    -- When case status is changed back from 'return_to_work' or 'closed' to something else
    -- This handles cases that are reopened or status changed back
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

-- Create triggers
-- Trigger for incident creation
DROP TRIGGER IF EXISTS trigger_incident_creation ON public.incidents;
CREATE TRIGGER trigger_incident_creation
    AFTER INSERT ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION handle_incident_creation();

-- Trigger for linking incident to case
DROP TRIGGER IF EXISTS trigger_link_incident_case ON public.incidents;
CREATE TRIGGER trigger_link_incident_case
    AFTER INSERT OR UPDATE OF case_id ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION link_incident_case_to_unselected_worker();

-- CRITICAL TRIGGER: Update incident return_to_work status when case status changes
-- This trigger fires when ANY case status is updated
DROP TRIGGER IF EXISTS trigger_update_incident_return_to_work ON public.cases;
CREATE TRIGGER trigger_update_incident_return_to_work
    AFTER UPDATE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_return_to_work_status();

-- IMMEDIATE FIX: Update existing incidents based on their related case status
-- This will fix the current issue where cases are closed but incidents still show return_to_work = false
UPDATE public.incidents 
SET return_to_work = true 
WHERE case_id IN (
    SELECT id FROM public.cases 
    WHERE status IN ('return_to_work', 'closed')
);

-- Show current status before fix
SELECT 
    'BEFORE FIX - Current incidents status:' as message,
    COUNT(*) as total_incidents,
    COUNT(CASE WHEN return_to_work = true THEN 1 END) as return_to_work_count,
    COUNT(CASE WHEN return_to_work = false THEN 1 END) as still_restricted_count
FROM public.incidents;

-- Show cases with closed status
SELECT 
    'Cases with closed status:' as message,
    COUNT(*) as closed_cases_count
FROM public.cases 
WHERE status = 'closed';

-- Show incidents linked to closed cases
SELECT 
    'Incidents linked to closed cases:' as message,
    COUNT(*) as incidents_linked_to_closed_cases
FROM public.incidents i
JOIN public.cases c ON i.case_id = c.id
WHERE c.status = 'closed';

-- Show summary after fix
SELECT 
    'AFTER FIX - Updated incidents status:' as message,
    COUNT(*) as total_incidents,
    COUNT(CASE WHEN return_to_work = true THEN 1 END) as return_to_work_count,
    COUNT(CASE WHEN return_to_work = false THEN 1 END) as still_restricted_count
FROM public.incidents;
