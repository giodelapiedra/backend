-- ========================================
-- SINGLE SCRIPT TO FIX ALL NULL team_leader_id AND team
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- Then click RUN
-- ========================================

-- STEP 1: Update team field from worker's team
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE work_readiness wr
  SET 
    team = w.team,
    updated_at = NOW()
  FROM users w
  WHERE wr.worker_id = w.id
    AND wr.team IS NULL
    AND w.team IS NOT NULL;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✅ Step 1: Updated % records with team field', rows_updated;
END $$;

-- STEP 2: Update team_leader_id via managed_teams (Primary Method)
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE work_readiness wr
  SET 
    team_leader_id = subquery.team_leader_id,
    updated_at = NOW()
  FROM (
    SELECT DISTINCT ON (wr.id)
      wr.id as wr_id,
      tl.id as team_leader_id
    FROM work_readiness wr
    JOIN users w ON w.id = wr.worker_id
    JOIN users tl ON tl.role = 'team_leader' 
      AND tl.is_active = true
      AND tl.managed_teams @> ARRAY[w.team]::text[]
    WHERE wr.team_leader_id IS NULL
      AND w.team IS NOT NULL
  ) subquery
  WHERE wr.id = subquery.wr_id;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✅ Step 2: Updated % records with team_leader_id (primary)', rows_updated;
END $$;

-- STEP 3: Update remaining team_leader_id via team field (Fallback Method)
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE work_readiness wr
  SET 
    team_leader_id = subquery.team_leader_id,
    updated_at = NOW()
  FROM (
    SELECT DISTINCT ON (wr.id)
      wr.id as wr_id,
      tl.id as team_leader_id
    FROM work_readiness wr
    JOIN users w ON w.id = wr.worker_id
    JOIN users tl ON tl.role = 'team_leader' 
      AND tl.is_active = true
      AND tl.team = w.team
    WHERE wr.team_leader_id IS NULL
      AND w.team IS NOT NULL
  ) subquery
  WHERE wr.id = subquery.wr_id;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE '✅ Step 3: Updated % records with team_leader_id (fallback)', rows_updated;
END $$;

-- STEP 4: Show results
SELECT 
  '🎉 AFTER UPDATE' as status,
  COUNT(*) as total_records,
  COUNT(team_leader_id) as with_team_leader_id,
  COUNT(team) as with_team,
  COUNT(*) - COUNT(team_leader_id) as still_null_team_leader_id,
  COUNT(*) - COUNT(team) as still_null_team,
  ROUND(COUNT(team_leader_id)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as team_leader_percent,
  ROUND(COUNT(team)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as team_percent
FROM work_readiness;

-- STEP 5: Show sample of updated records
SELECT 
  wr.id,
  wr.worker_id,
  w.first_name || ' ' || w.last_name as worker_name,
  wr.team as work_readiness_team,
  wr.team_leader_id,
  tl.first_name || ' ' || tl.last_name as team_leader_name,
  wr.readiness_level,
  wr.submitted_at
FROM work_readiness wr
LEFT JOIN users w ON w.id = wr.worker_id
LEFT JOIN users tl ON tl.id = wr.team_leader_id
ORDER BY wr.submitted_at DESC
LIMIT 10;

-- STEP 6: Show records STILL NULL (if any - these workers have no team)
SELECT 
  '⚠️ STILL NULL' as warning,
  wr.id,
  wr.worker_id,
  w.email as worker_email,
  w.first_name || ' ' || w.last_name as worker_name,
  w.team as worker_team,
  wr.team_leader_id,
  wr.team
FROM work_readiness wr
LEFT JOIN users w ON w.id = wr.worker_id
WHERE wr.team_leader_id IS NULL OR wr.team IS NULL
ORDER BY wr.submitted_at DESC
LIMIT 10;

