-- Fix Database Constraint to Allow Multiple Incidents Per Worker
-- The current constraint prevents multiple incidents for the same worker

-- ========================================
-- STEP 1: CHECK CURRENT CONSTRAINT
-- ========================================

-- Check the current constraint that's causing the issue
SELECT 
  'CURRENT CONSTRAINT ISSUE' as section,
  constraint_name,
  constraint_type,
  is_deferrable,
  initially_deferred
FROM information_schema.table_constraints 
WHERE table_name = 'unselected_workers'
AND constraint_name = 'unselected_workers_unique_daily_incident';

-- ========================================
-- STEP 2: DROP PROBLEMATIC CONSTRAINT
-- ========================================

-- Drop the constraint that prevents multiple incidents per worker
-- This constraint: unselected_workers_unique_daily_incident
-- prevents multiple incidents for the same worker on the same day
ALTER TABLE public.unselected_workers 
DROP CONSTRAINT IF EXISTS unselected_workers_unique_daily_incident;

-- ========================================
-- STEP 3: ADD NEW CONSTRAINT (OPTIONAL)
-- ========================================

-- Add a new constraint that only prevents exact duplicates
-- This allows multiple incidents per worker but prevents exact duplicates
-- Only prevents if ALL fields are identical (very rare)
ALTER TABLE public.unselected_workers 
ADD CONSTRAINT unselected_workers_unique_exact_duplicate 
UNIQUE (team_leader_id, worker_id, assignment_date, reason, notes, created_at);

-- ========================================
-- STEP 4: VERIFY CHANGES
-- ========================================

-- Check constraints after changes
SELECT 
  'UPDATED CONSTRAINTS' as section,
  constraint_name,
  constraint_type,
  is_deferrable,
  initially_deferred
FROM information_schema.table_constraints 
WHERE table_name = 'unselected_workers'
AND constraint_type = 'UNIQUE';

-- ========================================
-- STEP 5: TEST MULTIPLE INCIDENTS
-- ========================================

-- Test creating multiple incidents for the same worker
DO $$
DECLARE
  team_leader_uuid uuid;
  worker_uuid uuid;
  case_uuid uuid;
BEGIN
  -- Get admin team leader
  SELECT id INTO team_leader_uuid 
  FROM public.users 
  WHERE email = 'admin_team_leader@test.com'
  AND role = 'team_leader' 
  AND is_active = true;
  
  -- Get a worker
  SELECT id INTO worker_uuid 
  FROM public.users 
  WHERE role = 'worker' 
  AND is_active = true 
  LIMIT 1;
  
  -- Test multiple incidents for same worker
  IF team_leader_uuid IS NOT NULL AND worker_uuid IS NOT NULL THEN
    
    -- First incident: Worker is sick
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
      'Worker reported sick - first incident'
    ) RETURNING id INTO case_uuid;
    
    RAISE NOTICE 'First incident created: %', get_incident_number(case_uuid);
    
    -- Second incident: Same worker has accident (should work now!)
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
      'Worker had accident - second incident for same worker'
    ) RETURNING id INTO case_uuid;
    
    RAISE NOTICE 'Second incident created: %', get_incident_number(case_uuid);
    
    -- Third incident: Same worker transferred
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
      'transferred',
      'Worker transferred - third incident for same worker'
    ) RETURNING id INTO case_uuid;
    
    RAISE NOTICE 'Third incident created: %', get_incident_number(case_uuid);
    
    -- Fourth incident: Same worker sick again (different notes)
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
      'Worker reported sick again - fourth incident for same worker'
    ) RETURNING id INTO case_uuid;
    
    RAISE NOTICE 'Fourth incident created: %', get_incident_number(case_uuid);
    
    RAISE NOTICE 'SUCCESS: Multiple incidents per worker now work!';
    
  ELSE
    RAISE NOTICE 'No team leader or worker found for testing';
  END IF;
END $$;

-- ========================================
-- STEP 6: SHOW RESULTS
-- ========================================

-- Show all incidents for the test worker
SELECT 
  'MULTIPLE INCIDENTS PER WORKER TEST' as section,
  uw.id,
  get_incident_number(uw.id) as incident_number,
  tl.first_name || ' ' || tl.last_name as team_leader,
  w.first_name || ' ' || w.last_name as worker,
  uw.reason,
  uw.notes,
  uw.case_status,
  uw.created_at
FROM public.unselected_workers uw
JOIN public.users tl ON uw.team_leader_id = tl.id
JOIN public.users w ON uw.worker_id = w.id
WHERE tl.email = 'admin_team_leader@test.com'
ORDER BY uw.created_at DESC;

-- Count incidents per worker
SELECT 
  'INCIDENT COUNT PER WORKER' as section,
  w.first_name || ' ' || w.last_name as worker,
  COUNT(*) as total_incidents,
  COUNT(CASE WHEN uw.case_status = 'open' THEN 1 END) as open_incidents,
  COUNT(CASE WHEN uw.case_status = 'closed' THEN 1 END) as closed_incidents
FROM public.unselected_workers uw
JOIN public.users w ON uw.worker_id = w.id
GROUP BY w.id, w.first_name, w.last_name
ORDER BY total_incidents DESC;

-- ========================================
-- STEP 7: CLEAN UP TEST DATA (OPTIONAL)
-- ========================================

-- Uncomment the following lines if you want to clean up test data
/*
DELETE FROM public.unselected_workers 
WHERE team_leader_id = (
  SELECT id FROM public.users 
  WHERE email = 'admin_team_leader@test.com'
  AND role = 'team_leader'
)
AND notes LIKE '%test%' OR notes LIKE '%Test%';
*/

COMMIT;

-- ========================================
-- STEP 8: ADD TEAM COLUMN AND BACKFILL (NEW)
-- ========================================

-- Add team column for direct team-based lookups
ALTER TABLE public.unselected_workers
ADD COLUMN IF NOT EXISTS team text;

-- Backfill team from worker's team
UPDATE public.unselected_workers uw
SET team = u.team
FROM public.users u
WHERE uw.worker_id = u.id
  AND (uw.team IS NULL OR uw.team = '');

-- Index for team lookups
CREATE INDEX IF NOT EXISTS idx_unselected_workers_team
  ON public.unselected_workers USING btree (team);
