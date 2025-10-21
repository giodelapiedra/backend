-- ========================================
-- BACKFILL work_readiness table using worker's team_leader_id
-- This uses the DIRECT ASSIGNMENT from users.team_leader_id
-- ========================================

-- STEP 1: Check current status
SELECT 
  'BEFORE UPDATE' as status,
  COUNT(*) as total_records,
  COUNT(wr.team_leader_id) as with_team_leader_id,
  COUNT(wr.team) as with_team,
  COUNT(*) - COUNT(wr.team_leader_id) as null_team_leader_id,
  COUNT(*) - COUNT(wr.team) as null_team
FROM work_readiness wr;

-- STEP 2: Update team field from worker's team
UPDATE work_readiness wr
SET 
  team = w.team,
  updated_at = NOW()
FROM users w
WHERE wr.worker_id = w.id
  AND wr.team IS NULL
  AND w.team IS NOT NULL;

-- STEP 3: Update team_leader_id from worker's team_leader_id (DIRECT ASSIGNMENT - PRIORITY 1)
UPDATE work_readiness wr
SET 
  team_leader_id = w.team_leader_id,
  updated_at = NOW()
FROM users w
WHERE wr.worker_id = w.id
  AND wr.team_leader_id IS NULL
  AND w.team_leader_id IS NOT NULL;

-- STEP 4: For remaining NULL, lookup via managed_teams (PRIORITY 2)
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

-- STEP 5: For remaining NULL, lookup via team field (PRIORITY 3 - FALLBACK)
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

-- STEP 6: Show results
SELECT 
  'AFTER UPDATE' as status,
  COUNT(*) as total_records,
  COUNT(wr.team_leader_id) as with_team_leader_id,
  COUNT(wr.team) as with_team,
  COUNT(*) - COUNT(wr.team_leader_id) as still_null_team_leader_id,
  COUNT(*) - COUNT(wr.team) as still_null_team,
  ROUND(COUNT(wr.team_leader_id)::numeric / NULLIF(COUNT(*), 0) * 100, 2) || '%' as team_leader_percent,
  ROUND(COUNT(wr.team)::numeric / NULLIF(COUNT(*), 0) * 100, 2) || '%' as team_percent
FROM work_readiness wr;

-- STEP 7: Show updated records (sample)
SELECT 
  '✅ UPDATED RECORDS' as status,
  wr.id,
  wr.worker_id,
  w.first_name || ' ' || w.last_name as worker_name,
  wr.team as wr_team,
  w.team as worker_team,
  wr.team_leader_id as wr_team_leader_id,
  w.team_leader_id as worker_team_leader_id,
  tl.first_name || ' ' || tl.last_name as team_leader_name,
  wr.submitted_at
FROM work_readiness wr
JOIN users w ON w.id = wr.worker_id
LEFT JOIN users tl ON tl.id = wr.team_leader_id
WHERE wr.team_leader_id IS NOT NULL
  AND wr.team IS NOT NULL
ORDER BY wr.submitted_at DESC
LIMIT 20;

-- STEP 8: Show records STILL NULL (workers without team or team_leader_id)
SELECT 
  '⚠️ STILL NULL' as warning,
  wr.id as work_readiness_id,
  wr.worker_id,
  w.email as worker_email,
  w.first_name || ' ' || w.last_name as worker_name,
  w.team as worker_team,
  w.team_leader_id as worker_team_leader_id,
  wr.team as wr_team,
  wr.team_leader_id as wr_team_leader_id,
  wr.submitted_at
FROM work_readiness wr
LEFT JOIN users w ON w.id = wr.worker_id
WHERE wr.team_leader_id IS NULL OR wr.team IS NULL
ORDER BY wr.submitted_at DESC
LIMIT 20;

-- STEP 9: Summary by method used
SELECT 
  'BY METHOD' as summary_type,
  CASE
    WHEN wr.team_leader_id = w.team_leader_id THEN '1. Direct Assignment (worker.team_leader_id)'
    WHEN wr.team_leader_id IN (
      SELECT id FROM users 
      WHERE role = 'team_leader' 
        AND managed_teams @> ARRAY[w.team]::text[]
    ) THEN '2. Managed Teams Lookup'
    WHEN wr.team_leader_id IN (
      SELECT id FROM users 
      WHERE role = 'team_leader' 
        AND team = w.team
    ) THEN '3. Team Field Lookup (Fallback)'
    ELSE '4. Unknown Method'
  END as method_used,
  COUNT(*) as record_count,
  ROUND(COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM work_readiness WHERE team_leader_id IS NOT NULL), 0) * 100, 2) || '%' as percentage
FROM work_readiness wr
JOIN users w ON w.id = wr.worker_id
WHERE wr.team_leader_id IS NOT NULL
GROUP BY method_used
ORDER BY record_count DESC;

