-- Create unselected_workers table for Incident Management System
-- This table supports multiple incidents per worker with unique incident numbers

-- ========================================
-- STEP 1: CREATE THE TABLE
-- ========================================

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
  
  -- Primary key
  CONSTRAINT unselected_workers_pkey PRIMARY KEY (id),
  
  -- Unique constraint for team_leader_id, worker_id, case_status combination
  -- This allows multiple cases per worker as long as they have different case_status
  CONSTRAINT unselected_workers_team_leader_id_worker_id_case_status_key 
    UNIQUE (team_leader_id, worker_id, case_status),
  
  -- Deferrable unique constraint for open cases
  CONSTRAINT unselected_workers_unique_open_case 
    UNIQUE (team_leader_id, worker_id, case_status) 
    DEFERRABLE INITIALLY DEFERRED,
  
  -- Foreign key constraints
  CONSTRAINT unselected_workers_team_leader_id_fkey 
    FOREIGN KEY (team_leader_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT unselected_workers_worker_id_fkey 
    FOREIGN KEY (worker_id) REFERENCES users (id) ON DELETE CASCADE,
  
  -- Check constraints for valid values
  CONSTRAINT unselected_workers_reason_check CHECK (
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
  ),
  CONSTRAINT unselected_workers_case_status_check CHECK (
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
) TABLESPACE pg_default;

-- ========================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Index for team leader and date queries
CREATE INDEX IF NOT EXISTS idx_unselected_workers_team_leader_date 
  ON public.unselected_workers USING btree (team_leader_id, assignment_date) 
  TABLESPACE pg_default;

-- Index for worker and date queries
CREATE INDEX IF NOT EXISTS idx_unselected_workers_worker_date 
  ON public.unselected_workers USING btree (worker_id, assignment_date) 
  TABLESPACE pg_default;

-- Index for reason filtering
CREATE INDEX IF NOT EXISTS idx_unselected_workers_reason 
  ON public.unselected_workers USING btree (reason) 
  TABLESPACE pg_default;

-- Index for case status filtering
CREATE INDEX IF NOT EXISTS idx_unselected_workers_case_status 
  ON public.unselected_workers USING btree (case_status) 
  TABLESPACE pg_default;

-- Index for closed cases queries
CREATE INDEX IF NOT EXISTS idx_unselected_workers_closed_at 
  ON public.unselected_workers USING btree (closed_at) 
  TABLESPACE pg_default;

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_unselected_workers_created_at 
  ON public.unselected_workers USING btree (created_at) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_unselected_workers_team_leader_status 
  ON public.unselected_workers USING btree (team_leader_id, case_status) 
  TABLESPACE pg_default;

-- ========================================
-- STEP 3: CREATE UPDATE TRIGGER FUNCTION
-- ========================================

-- Create the trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_unselected_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_unselected_workers_updated_at ON public.unselected_workers;
CREATE TRIGGER trigger_update_unselected_workers_updated_at
  BEFORE UPDATE ON public.unselected_workers
    FOR EACH ROW
    EXECUTE FUNCTION update_unselected_workers_updated_at();

-- ========================================
-- STEP 4: CREATE CLOSED CASES TABLE
-- ========================================

-- Create a separate table for closed cases to maintain history
CREATE TABLE IF NOT EXISTS public.closed_unselected_workers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_case_id uuid NOT NULL,
  team_leader_id uuid NOT NULL,
  worker_id uuid NOT NULL,
  assignment_date date NOT NULL,
  reason character varying(50) NOT NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  closed_at timestamp with time zone NULL DEFAULT now(),
  closed_by uuid NULL,
  
  -- Primary key
  CONSTRAINT closed_unselected_workers_pkey PRIMARY KEY (id),
  
  -- Foreign key constraints
  CONSTRAINT closed_unselected_workers_team_leader_id_fkey 
    FOREIGN KEY (team_leader_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT closed_unselected_workers_worker_id_fkey 
    FOREIGN KEY (worker_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT closed_unselected_workers_closed_by_fkey 
    FOREIGN KEY (closed_by) REFERENCES users (id) ON DELETE SET NULL,
  
  -- Check constraints
  CONSTRAINT closed_unselected_workers_reason_check CHECK (
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
) TABLESPACE pg_default;

-- Indexes for closed cases table
CREATE INDEX IF NOT EXISTS idx_closed_unselected_workers_team_leader 
  ON public.closed_unselected_workers USING btree (team_leader_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_closed_unselected_workers_worker 
  ON public.closed_unselected_workers USING btree (worker_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_closed_unselected_workers_closed_at 
  ON public.closed_unselected_workers USING btree (closed_at) 
  TABLESPACE pg_default;

-- ========================================
-- STEP 5: CREATE HELPFUL FUNCTIONS
-- ========================================

-- Function to close a case and move it to closed table
CREATE OR REPLACE FUNCTION close_unselected_worker_case(case_id uuid, closed_by_user_id uuid DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  case_record RECORD;
BEGIN
  -- Get the case record
  SELECT * INTO case_record 
  FROM public.unselected_workers 
  WHERE id = case_id AND case_status = 'open';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Insert into closed cases table
  INSERT INTO public.closed_unselected_workers (
    original_case_id,
    team_leader_id,
    worker_id,
    assignment_date,
    reason,
    notes,
    created_at,
    closed_at,
    closed_by
  ) VALUES (
    case_record.id,
    case_record.team_leader_id,
    case_record.worker_id,
    case_record.assignment_date,
    case_record.reason,
    case_record.notes,
    case_record.created_at,
    NOW(),
    closed_by_user_id
  );
  
  -- Update the original case to closed
  UPDATE public.unselected_workers 
  SET 
    case_status = 'closed',
    closed_at = NOW(),
    updated_at = NOW()
  WHERE id = case_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get incident number (formatted ID)
CREATE OR REPLACE FUNCTION get_incident_number(case_id uuid)
RETURNS TEXT AS $$
BEGIN
  RETURN 'INC-' || UPPER(SUBSTRING(case_id::text, 1, 8));
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 6: VERIFY TABLE CREATION
-- ========================================

-- Check if table was created successfully
SELECT 
  'TABLE CREATION VERIFICATION' as section,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'unselected_workers'
ORDER BY ordinal_position;

-- Check constraints
SELECT 
  'CONSTRAINTS VERIFICATION' as section,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'unselected_workers';

-- Check indexes
SELECT 
  'INDEXES VERIFICATION' as section,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'unselected_workers';

-- ========================================
-- STEP 7: TEST THE SYSTEM
-- ========================================

-- Test inserting a sample incident
DO $$
DECLARE
  team_leader_uuid uuid;
  worker_uuid uuid;
  case_uuid uuid;
BEGIN
  -- Get a team leader (preferably admin_team_leader@test.com)
  SELECT id INTO team_leader_uuid 
  FROM public.users 
  WHERE email = 'admin_team_leader@test.com'
  AND role = 'team_leader' 
  AND is_active = true;
  
  -- If not found, get any team leader
  IF team_leader_uuid IS NULL THEN
    SELECT id INTO team_leader_uuid 
    FROM public.users 
    WHERE role = 'team_leader' 
    AND is_active = true 
    LIMIT 1;
  END IF;
  
  -- Get a worker
  SELECT id INTO worker_uuid 
  FROM public.users 
  WHERE role = 'worker' 
  AND is_active = true 
  LIMIT 1;
  
  -- Insert test case if we have both
  IF team_leader_uuid IS NOT NULL AND worker_uuid IS NOT NULL THEN
    INSERT INTO public.unselected_workers (
      team_leader_id,
      worker_id,
      assignment_date,
      reason,
      notes
    ) VALUES (
      team_leader_uuid,
      worker_uuid,
      CURRENT_DATE,
      'sick',
      'Test incident for verification'
    ) RETURNING id INTO case_uuid;
    
    RAISE NOTICE 'Test case created with ID: %', case_uuid;
    RAISE NOTICE 'Incident Number: %', get_incident_number(case_uuid);
    
    -- Test creating a second incident for the same worker
    INSERT INTO public.unselected_workers (
      team_leader_id,
      worker_id,
      assignment_date,
      reason,
      notes
    ) VALUES (
      team_leader_uuid,
      worker_uuid,
      CURRENT_DATE,
      'injured_medical',
      'Second incident for same worker - should work!'
    ) RETURNING id INTO case_uuid;
    
    RAISE NOTICE 'Second test case created with ID: %', case_uuid;
    RAISE NOTICE 'Second Incident Number: %', get_incident_number(case_uuid);
    
  ELSE
    RAISE NOTICE 'No team leader or worker found for testing';
    RAISE NOTICE 'Team Leader UUID: %', team_leader_uuid;
    RAISE NOTICE 'Worker UUID: %', worker_uuid;
  END IF;
END $$;

-- ========================================
-- STEP 8: SAMPLE QUERIES FOR TESTING
-- ========================================

-- Query to get all open incidents with incident numbers
SELECT 
  'SAMPLE QUERY - OPEN INCIDENTS' as section,
  id,
  get_incident_number(id) as incident_number,
  team_leader_id,
  worker_id,
  assignment_date,
  reason,
  case_status,
  created_at
FROM public.unselected_workers 
WHERE case_status = 'open'
ORDER BY created_at DESC;

-- Query to get incidents by team leader
SELECT 
  'SAMPLE QUERY - INCIDENTS BY TEAM LEADER' as section,
  uw.id,
  get_incident_number(uw.id) as incident_number,
  tl.first_name || ' ' || tl.last_name as team_leader_name,
  w.first_name || ' ' || w.last_name as worker_name,
  uw.reason,
  uw.case_status,
  uw.created_at
FROM public.unselected_workers uw
JOIN public.users tl ON uw.team_leader_id = tl.id
JOIN public.users w ON uw.worker_id = w.id
WHERE uw.case_status = 'open'
ORDER BY uw.created_at DESC;

-- ========================================
-- STEP 9: PROPER EXAMPLES WITH REAL UUIDs
-- ========================================

-- Example 1: Insert incident using actual UUIDs from your database
-- First, let's see what UUIDs are available
SELECT 
  'AVAILABLE TEAM LEADERS' as section,
  id,
  first_name,
  last_name,
  email,
  team
FROM public.users 
WHERE role = 'team_leader' 
AND is_active = true;

SELECT 
  'AVAILABLE WORKERS' as section,
  id,
  first_name,
  last_name,
  email,
  team
FROM public.users 
WHERE role = 'worker' 
AND is_active = true
LIMIT 5;

-- Example 2: Insert incident for specific team leader and worker
-- Replace the UUIDs below with actual UUIDs from your database
/*
INSERT INTO public.unselected_workers (
  team_leader_id,
  worker_id,
  assignment_date,
  reason,
  notes
) VALUES (
  'REPLACE_WITH_ACTUAL_TEAM_LEADER_UUID',
  'REPLACE_WITH_ACTUAL_WORKER_UUID',
  CURRENT_DATE,
  'sick',
  'Worker is sick today'
);

-- Get the incident number
SELECT 
  id,
  get_incident_number(id) as incident_number,
  reason,
  created_at
FROM public.unselected_workers 
WHERE id = 'REPLACE_WITH_NEW_CASE_UUID';
*/

-- Example 3: Insert multiple incidents for same worker
-- This demonstrates that multiple incidents per worker work
/*
-- First incident
INSERT INTO public.unselected_workers (
  team_leader_id,
  worker_id,
  assignment_date,
  reason,
  notes
) VALUES (
  'REPLACE_WITH_ACTUAL_TEAM_LEADER_UUID',
  'REPLACE_WITH_ACTUAL_WORKER_UUID',
  CURRENT_DATE,
  'sick',
  'First incident - worker is sick'
);

-- Second incident for same worker (different reason)
INSERT INTO public.unselected_workers (
  team_leader_id,
  worker_id,
  assignment_date,
  reason,
  notes
) VALUES (
  'REPLACE_WITH_ACTUAL_TEAM_LEADER_UUID',
  'REPLACE_WITH_ACTUAL_WORKER_UUID',
  CURRENT_DATE,
  'injured_medical',
  'Second incident - worker got injured'
);
*/

-- ========================================
-- STEP 10: QUICK REFERENCE QUERIES
-- ========================================

-- Get all incidents with incident numbers
SELECT 
  'ALL INCIDENTS WITH INCIDENT NUMBERS' as section,
  uw.id,
  get_incident_number(uw.id) as incident_number,
  tl.first_name || ' ' || tl.last_name as team_leader,
  w.first_name || ' ' || w.last_name as worker,
  uw.reason,
  uw.case_status,
  uw.created_at
FROM public.unselected_workers uw
JOIN public.users tl ON uw.team_leader_id = tl.id
JOIN public.users w ON uw.worker_id = w.id
ORDER BY uw.created_at DESC;

-- Count incidents by team leader
SELECT 
  'INCIDENT COUNT BY TEAM LEADER' as section,
  tl.first_name || ' ' || tl.last_name as team_leader,
  COUNT(*) as total_incidents,
  COUNT(CASE WHEN uw.case_status = 'open' THEN 1 END) as open_incidents,
  COUNT(CASE WHEN uw.case_status = 'closed' THEN 1 END) as closed_incidents
FROM public.unselected_workers uw
JOIN public.users tl ON uw.team_leader_id = tl.id
GROUP BY tl.id, tl.first_name, tl.last_name
ORDER BY total_incidents DESC;

COMMIT;