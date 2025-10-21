-- Quick Fix: Remove Database Constraint Preventing Multiple Incidents
-- This will immediately fix the issue where same worker incidents update instead of creating new ones

-- ========================================
-- STEP 1: DROP THE PROBLEMATIC CONSTRAINT
-- ========================================

-- Drop the constraint that prevents multiple incidents per worker
ALTER TABLE public.unselected_workers 
DROP CONSTRAINT IF EXISTS unselected_workers_unique_daily_incident;

-- ========================================
-- STEP 2: VERIFY CONSTRAINT IS REMOVED
-- ========================================

-- Check that the constraint is gone
SELECT 
  'CONSTRAINT CHECK' as section,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'unselected_workers'
AND constraint_type = 'UNIQUE';

-- ========================================
-- STEP 3: TEST MULTIPLE INCIDENTS
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
    
    RAISE NOTICE 'First incident created: %', case_uuid;
    
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
    
    RAISE NOTICE 'Second incident created: %', case_uuid;
    
    RAISE NOTICE 'SUCCESS: Multiple incidents per worker now work!';
    
  ELSE
    RAISE NOTICE 'No team leader or worker found for testing';
  END IF;
END $$;

-- ========================================
-- STEP 4: SHOW RESULTS
-- ========================================

-- Show all incidents for the test worker
SELECT 
  'MULTIPLE INCIDENTS TEST RESULTS' as section,
  uw.id,
  uw.team_leader_id,
  uw.worker_id,
  uw.reason,
  uw.notes,
  uw.case_status,
  uw.created_at
FROM public.unselected_workers uw
WHERE uw.team_leader_id = (
  SELECT id FROM public.users 
  WHERE email = 'admin_team_leader@test.com'
  AND role = 'team_leader'
)
ORDER BY uw.created_at DESC;

COMMIT;
