-- QUICK FIX: Update ALL NULL team_leader_id and team fields in work_readiness
-- This will backfill existing records with proper team_leader_id and team

-- Step 1: Check how many records need updating
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN team_leader_id IS NULL THEN 1 END) as null_team_leader_id,
  COUNT(CASE WHEN team IS NULL THEN 1 END) as null_team,
  MIN(submitted_at) as oldest_submission,
  MAX(submitted_at) as latest_submission
FROM work_readiness;

-- Step 2: BACKUP - Create a backup table (OPTIONAL but RECOMMENDED)
-- Uncomment if you want to create a backup first
/*
CREATE TABLE work_readiness_backup_before_fix AS 
SELECT * FROM work_readiness WHERE team_leader_id IS NULL OR team IS NULL;
*/

-- Step 3: Update team field from worker's team (EASIEST FIX)
UPDATE work_readiness wr
SET 
  team = w.team,
  updated_at = NOW()
FROM users w
WHERE wr.worker_id = w.id
  AND wr.team IS NULL
  AND w.team IS NOT NULL;

-- Check progress after Step 3
SELECT COUNT(*) as still_null_team FROM work_readiness WHERE team IS NULL;

-- Step 4: Update team_leader_id using managed_teams (PRIMARY METHOD)
UPDATE work_readiness wr
SET 
  team_leader_id = subquery.team_leader_id,
  updated_at = NOW()
FROM (
  SELECT 
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

-- Check progress after Step 4
SELECT COUNT(*) as still_null_team_leader_id FROM work_readiness WHERE team_leader_id IS NULL;

-- Step 5: Update remaining records using team field (FALLBACK METHOD)
UPDATE work_readiness wr
SET 
  team_leader_id = subquery.team_leader_id,
  updated_at = NOW()
FROM (
  SELECT 
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

-- Step 6: Final verification - Check results
SELECT 
  'AFTER UPDATE' as status,
  COUNT(*) as total_records,
  COUNT(team_leader_id) as with_team_leader_id,
  COUNT(team) as with_team,
  COUNT(*) - COUNT(team_leader_id) as still_null_team_leader_id,
  COUNT(*) - COUNT(team) as still_null_team,
  ROUND(COUNT(team_leader_id)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as team_leader_populated_percent,
  ROUND(COUNT(team)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as team_populated_percent
FROM work_readiness;

-- Step 7: Show records that are STILL NULL (workers without teams)
SELECT 
  wr.id as work_readiness_id,
  wr.worker_id,
  w.email as worker_email,
  w.first_name || ' ' || w.last_name as worker_name,
  w.team as worker_team,
  w.role as worker_role,
  wr.team_leader_id,
  wr.team,
  wr.submitted_at
FROM work_readiness wr
LEFT JOIN users w ON w.id = wr.worker_id
WHERE wr.team_leader_id IS NULL OR wr.team IS NULL
ORDER BY wr.submitted_at DESC
LIMIT 20;

-- Step 8: Check the specific record from your screenshot
-- Note: Use the worker_id to find all submissions from that worker
SELECT 
  wr.id,
  wr.worker_id,
  w.first_name || ' ' || w.last_name as worker_name,
  w.team as worker_team,
  wr.team_leader_id,
  tl.first_name || ' ' || tl.last_name as team_leader_name,
  wr.team,
  wr.readiness_level,
  wr.fatigue_level,
  wr.pain_discomfort,
  wr.submitted_at
FROM work_readiness wr
LEFT JOIN users w ON w.id = wr.worker_id
LEFT JOIN users tl ON tl.id = wr.team_leader_id
WHERE wr.worker_id = '76b45232-4861-4219-aa20-50925c4f0c2c'  -- worker_id from screenshot
ORDER BY wr.submitted_at DESC
LIMIT 10;

-- Step 9: Summary by team
SELECT 
  COALESCE(wr.team, 'NULL TEAM') as team,
  COUNT(*) as total_submissions,
  COUNT(wr.team_leader_id) as with_team_leader_id,
  COUNT(*) - COUNT(wr.team_leader_id) as without_team_leader_id,
  COUNT(DISTINCT wr.worker_id) as unique_workers,
  COUNT(DISTINCT wr.team_leader_id) as unique_team_leaders,
  MIN(wr.submitted_at) as first_submission,
  MAX(wr.submitted_at) as latest_submission
FROM work_readiness wr
GROUP BY COALESCE(wr.team, 'NULL TEAM')
ORDER BY total_submissions DESC;

