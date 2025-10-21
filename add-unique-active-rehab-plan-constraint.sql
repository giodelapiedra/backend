-- ================================================================
-- CRITICAL FIX: Add unique constraint for active rehabilitation plans
-- ================================================================
-- This prevents multiple active rehab plans per case (race condition fix)
-- Ensures data integrity at the database level
-- Date: 2025-01-18
-- ================================================================

-- Step 1: Check for existing duplicate active plans before adding constraint
SELECT 
  case_id, 
  COUNT(*) as active_plans_count,
  ARRAY_AGG(id) as plan_ids
FROM rehabilitation_plans
WHERE status = 'active'
GROUP BY case_id
HAVING COUNT(*) > 1;

-- Step 2: If duplicates exist, you need to manually resolve them first
-- Example: Keep the most recent plan and mark others as 'cancelled'
-- UPDATE rehabilitation_plans 
-- SET status = 'cancelled', end_date = CURRENT_DATE
-- WHERE id IN (/* ids of duplicate plans to cancel */);

-- Step 3: Add unique partial index (allows multiple non-active plans per case)
-- This is better than a unique constraint because it only applies to active plans
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_plan_per_case 
ON rehabilitation_plans (case_id) 
WHERE status = 'active';

-- Step 4: Verify the constraint
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'rehabilitation_plans' 
AND indexname = 'unique_active_plan_per_case';

-- ================================================================
-- TESTING: Verify constraint works
-- ================================================================
-- Try to insert duplicate active plan (should fail):
-- INSERT INTO rehabilitation_plans (case_id, worker_id, clinician_id, status, plan_name)
-- VALUES ('existing-case-id', 'worker-id', 'clinician-id', 'active', 'Test Plan');
-- Expected: ERROR: duplicate key value violates unique constraint

-- ================================================================
-- ROLLBACK (if needed):
-- DROP INDEX IF EXISTS unique_active_plan_per_case;
-- ================================================================

COMMENT ON INDEX unique_active_plan_per_case IS 
'Ensures only one active rehabilitation plan exists per case at any time. Prevents race conditions when multiple clinicians try to create plans simultaneously.';

