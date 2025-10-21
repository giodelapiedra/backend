-- COMPREHENSIVE SOLUTION: Update both incidents AND unselected_workers when case status changes
-- This ensures complete system consistency

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

-- Create unselected_workers table with proper structure
CREATE TABLE IF NOT EXISTS public.unselected_workers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_leader_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  assignment_date date NOT NULL,
  reason character varying(50) NOT NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  case_status character varying(20) NULL DEFAULT 'open'::character varying,
  closed_at timestamp with time zone NULL,
  reopened_at timestamp with time zone NULL,
  reported_to_case_manager boolean NOT NULL DEFAULT false,
  reported_at timestamp with time zone NULL,
  reported_by uuid NULL,
  case_id uuid NULL,
  CONSTRAINT unselected_workers_pkey PRIMARY KEY (id),
  CONSTRAINT unselected_workers_unique_exact_duplicate UNIQUE (
    team_leader_id,
    worker_id,
    assignment_date,
    reason,
    notes,
    created_at
  ),
  CONSTRAINT unselected_workers_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT unselected_workers_team_leader_id_fkey FOREIGN KEY (team_leader_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT unselected_workers_case_id_fkey FOREIGN KEY (case_id) REFERENCES cases (id) ON DELETE SET NULL,
  CONSTRAINT unselected_workers_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT unselected_workers_reason_check CHECK (
    (
      (reason)::text = ANY (
        (
          ARRAY[
            'sick'::character varying,
            'on_leave_rdo'::character varying,
            'transferred'::character varying,
            'injured_medical'::character varying,
            'not_rostered'::character varying
          ]
        )::text[]
      )
    )
  ),
  CONSTRAINT unselected_workers_case_status_check CHECK (
    (
      (case_status)::text = ANY (
        (
          ARRAY[
            'open'::character varying,
            'in_progress'::character varying,
            'closed'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes for incidents
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id ON public.incidents USING btree (worker_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_incidents_case_id ON public.incidents USING btree (case_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_incidents_return_to_work ON public.incidents USING btree (return_to_work) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_incidents_worker_return_to_work ON public.incidents USING btree (worker_id, return_to_work) TABLESPACE pg_default;

-- Create indexes for unselected_workers
CREATE INDEX IF NOT EXISTS idx_unselected_workers_reported_open ON public.unselected_workers USING btree (
  team_leader_id,
  case_status,
  reported_to_case_manager
) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_unselected_workers_team_leader_date ON public.unselected_workers USING btree (team_leader_id, assignment_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_unselected_workers_worker_date ON public.unselected_workers USING btree (worker_id, assignment_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_unselected_workers_reason ON public.unselected_workers USING btree (reason) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_unselected_workers_case_id ON public.unselected_workers USING btree (case_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_unselected_workers_case_status ON public.unselected_workers USING btree (case_status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_unselected_workers_closed_at ON public.unselected_workers USING btree (closed_at) TABLESPACE pg_default;

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
        
        -- Update unselected workers status to in_progress
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

-- CRITICAL FUNCTION: Update both incidents AND unselected_workers when case status changes
-- This is the main function that handles clinician status updates
CREATE OR REPLACE FUNCTION update_incident_and_unselected_workers_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When clinician updates case status to 'return_to_work' or 'closed'
    IF NEW.status IN ('return_to_work', 'closed') AND 
       (OLD.status IS NULL OR OLD.status NOT IN ('return_to_work', 'closed')) THEN
        
        -- 1. Update ALL related incidents' return_to_work status to true
        UPDATE public.incidents 
        SET return_to_work = true 
        WHERE case_id = NEW.id;
        
        RAISE NOTICE '✅ Updated incident return_to_work status to TRUE for case_id: % (status: %)', NEW.id, NEW.status;
        
        -- 2. Update ALL unselected_workers to closed status for this worker
        UPDATE public.unselected_workers 
        SET 
            case_status = 'closed',
            closed_at = NOW(),
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id 
        AND case_status IN ('open', 'in_progress');
        
        RAISE NOTICE '✅ Updated unselected workers to closed for worker % due to case % status change', NEW.worker_id, NEW.id;
        
        -- 3. Also update unselected_workers that are linked to this specific case
        UPDATE public.unselected_workers 
        SET 
            case_status = 'closed',
            closed_at = NOW(),
            updated_at = NOW()
        WHERE case_id = NEW.id 
        AND case_status IN ('open', 'in_progress');
        
        RAISE NOTICE '✅ Updated unselected workers linked to case % to closed', NEW.id;
    END IF;
    
    -- When case status is changed back from 'return_to_work' or 'closed' to something else
    IF OLD.status IN ('return_to_work', 'closed') AND NEW.status NOT IN ('return_to_work', 'closed') THEN
        
        -- 1. Update the related incident's return_to_work status back to false
        UPDATE public.incidents 
        SET return_to_work = false 
        WHERE case_id = NEW.id;
        
        RAISE NOTICE '⚠️ Updated incident return_to_work status to FALSE for case_id: % (status: %)', NEW.id, NEW.status;
        
        -- 2. Update unselected_workers back to in_progress (not fully closed)
        UPDATE public.unselected_workers 
        SET 
            case_status = 'in_progress',
            reopened_at = NOW(),
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id 
        AND case_status = 'closed';
        
        RAISE NOTICE '⚠️ Updated unselected workers back to in_progress for worker %', NEW.worker_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update unselected workers when case is created
CREATE OR REPLACE FUNCTION update_unselected_workers_on_case_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- When a case is created, update unselected workers to in_progress
    UPDATE public.unselected_workers 
    SET 
        case_status = 'in_progress',
        case_id = NEW.id,
        updated_at = NOW()
    WHERE worker_id = NEW.worker_id 
    AND case_status = 'open';
    
    RAISE NOTICE 'Updated unselected workers to in_progress for worker % due to new case %', NEW.worker_id, NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update unselected workers when case status changes to return_to_work
CREATE OR REPLACE FUNCTION update_unselected_workers_on_case_return_to_work()
RETURNS TRIGGER AS $$
BEGIN
    -- When case status changes to 'return_to_work'
    IF NEW.status = 'return_to_work' AND (OLD.status IS NULL OR OLD.status != 'return_to_work') THEN
        -- Update all unselected_workers records for this worker to 'closed'
        UPDATE public.unselected_workers 
        SET 
            case_status = 'closed',
            closed_at = NOW(),
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id 
        AND case_status IN ('open', 'in_progress');
        
        RAISE NOTICE 'Unselected workers for worker % updated to closed due to case % status change to return_to_work', NEW.worker_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update unselected workers updated_at
CREATE OR REPLACE FUNCTION update_unselected_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update unselected worker case manager assignment
CREATE OR REPLACE FUNCTION update_unselected_worker_case_manager_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- This function can be customized based on your case manager assignment logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for incidents
DROP TRIGGER IF EXISTS trigger_incident_creation ON public.incidents;
CREATE TRIGGER trigger_incident_creation
    AFTER INSERT ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION handle_incident_creation();

DROP TRIGGER IF EXISTS trigger_link_incident_case ON public.incidents;
CREATE TRIGGER trigger_link_incident_case
    AFTER INSERT OR UPDATE OF case_id ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION link_incident_case_to_unselected_worker();

-- Create triggers for unselected_workers
DROP TRIGGER IF EXISTS trigger_unselected_worker_case_manager_assignment ON public.unselected_workers;
CREATE TRIGGER trigger_unselected_worker_case_manager_assignment
    BEFORE UPDATE ON public.unselected_workers
    FOR EACH ROW
    EXECUTE FUNCTION update_unselected_worker_case_manager_assignment();

DROP TRIGGER IF EXISTS trigger_update_timestamp ON public.unselected_workers;
CREATE TRIGGER trigger_update_timestamp
    BEFORE UPDATE ON public.unselected_workers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_timestamp();

DROP TRIGGER IF EXISTS trigger_update_unselected_workers_updated_at ON public.unselected_workers;
CREATE TRIGGER trigger_update_unselected_workers_updated_at
    BEFORE UPDATE ON public.unselected_workers
    FOR EACH ROW
    EXECUTE FUNCTION update_unselected_workers_updated_at();

-- CRITICAL TRIGGER: Update both incidents AND unselected_workers when case status changes
-- This is the main trigger that handles clinician status updates
DROP TRIGGER IF EXISTS trigger_update_incident_and_unselected_workers ON public.cases;
CREATE TRIGGER trigger_update_incident_and_unselected_workers
    AFTER UPDATE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_and_unselected_workers_status();

-- Trigger for case creation
DROP TRIGGER IF EXISTS trigger_update_unselected_workers_on_case_insert ON public.cases;
CREATE TRIGGER trigger_update_unselected_workers_on_case_insert
    AFTER INSERT ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION update_unselected_workers_on_case_insert();

-- Trigger for case return to work
DROP TRIGGER IF EXISTS trigger_update_unselected_workers_on_case_return_to_work ON public.cases;
CREATE TRIGGER trigger_update_unselected_workers_on_case_return_to_work
    AFTER UPDATE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION update_unselected_workers_on_case_return_to_work();

-- IMMEDIATE FIX: Update existing data
-- Update incidents based on their related case status
UPDATE public.incidents 
SET return_to_work = true 
WHERE case_id IN (
    SELECT id FROM public.cases 
    WHERE status IN ('return_to_work', 'closed')
);

-- Update unselected_workers based on their related case status
UPDATE public.unselected_workers 
SET 
    case_status = 'closed',
    closed_at = NOW(),
    updated_at = NOW()
WHERE worker_id IN (
    SELECT worker_id FROM public.cases 
    WHERE status IN ('return_to_work', 'closed')
    AND worker_id IS NOT NULL
)
AND case_status IN ('open', 'in_progress');

-- Show final summary
SELECT 
    'FINAL SUMMARY - Incidents:' as message,
    COUNT(*) as total_incidents,
    COUNT(CASE WHEN return_to_work = true THEN 1 END) as return_to_work_count,
    COUNT(CASE WHEN return_to_work = false THEN 1 END) as still_restricted_count
FROM public.incidents;

SELECT 
    'FINAL SUMMARY - Unselected Workers:' as message,
    COUNT(*) as total_unselected_workers,
    COUNT(CASE WHEN case_status = 'open' THEN 1 END) as open_count,
    COUNT(CASE WHEN case_status = 'in_progress' THEN 1 END) as in_progress_count,
    COUNT(CASE WHEN case_status = 'closed' THEN 1 END) as closed_count
FROM public.unselected_workers;
