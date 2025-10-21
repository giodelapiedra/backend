-- FIX EXISTING NULL team_leader_id and team in work_readiness table
-- Run this ONCE to populate existing records

-- Step 1: Check current status
SELECT 
  COUNT(*) as total_records,
  COUNT(team_leader_id) as with_team_leader_id,
  COUNT(team) as with_team,
  COUNT(*) - COUNT(team_leader_id) as missing_team_leader_id,
  COUNT(*) - COUNT(team) as missing_team,
  ROUND(COUNT(team_leader_id)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as team_leader_populated_percent
FROM work_readiness
WHERE submitted_at >= NOW() - INTERVAL '30 days';

-- Step 2: Preview what will be updated (TEST QUERY - SAFE TO RUN)
SELECT 
  wr.id as work_readiness_id,
  wr.worker_id,
  w.first_name || ' ' || w.last_name as worker_name,
  w.team as worker_team,
  wr.team_leader_id as current_team_leader_id,
  wr.team as current_team,
  tl.id as new_team_leader_id,
  tl.first_name || ' ' || tl.last_name as team_leader_name,
  w.team as new_team,
  wr.submitted_at
FROM work_readiness wr
JOIN users w ON w.id = wr.worker_id
LEFT JOIN users tl ON tl.role = 'team_leader' 
  AND tl.is_active = true
  AND (
    tl.managed_teams @> ARRAY[w.team]::text[]  -- Primary: managed_teams contains worker's team
    OR tl.team = w.team                         -- Fallback: team leader's team matches worker's team
  )
WHERE wr.team_leader_id IS NULL 
  OR wr.team IS NULL
  AND wr.submitted_at >= NOW() - INTERVAL '30 days'
ORDER BY wr.submitted_at DESC
LIMIT 50;

-- Step 3: UPDATE existing records with NULL team_leader_id or team
-- ⚠️ IMPORTANT: Review Step 2 results before running this!

-- Update records where team_leader can be found via managed_teams (PRIMARY METHOD)
UPDATE work_readiness wr
SET 
  team_leader_id = tl.id,
  team = w.team,
  updated_at = NOW()
FROM users w
LEFT JOIN LATERAL (
  SELECT id
  FROM users
  WHERE role = 'team_leader'
    AND is_active = true
    AND managed_teams @> ARRAY[w.team]::text[]
  LIMIT 1
) tl ON true
WHERE wr.worker_id = w.id
  AND (wr.team_leader_id IS NULL OR wr.team IS NULL)
  AND w.team IS NOT NULL
  AND tl.id IS NOT NULL;

-- Update remaining records where team_leader can be found via team field (FALLBACK METHOD)
UPDATE work_readiness wr
SET 
  team_leader_id = tl.id,
  team = w.team,
  updated_at = NOW()
FROM users w
LEFT JOIN LATERAL (
  SELECT id
  FROM users
  WHERE role = 'team_leader'
    AND is_active = true
    AND team = w.team
  LIMIT 1
) tl ON true
WHERE wr.worker_id = w.id
  AND wr.team_leader_id IS NULL
  AND w.team IS NOT NULL
  AND tl.id IS NOT NULL;

-- Update team field for records where worker has team but work_readiness.team is still NULL
UPDATE work_readiness wr
SET 
  team = w.team,
  updated_at = NOW()
FROM users w
WHERE wr.worker_id = w.id
  AND wr.team IS NULL
  AND w.team IS NOT NULL;

-- Step 4: Verify the fix
SELECT 
  COUNT(*) as total_records,
  COUNT(team_leader_id) as with_team_leader_id,
  COUNT(team) as with_team,
  COUNT(*) - COUNT(team_leader_id) as missing_team_leader_id,
  COUNT(*) - COUNT(team) as missing_team,
  ROUND(COUNT(team_leader_id)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as team_leader_populated_percent
FROM work_readiness
WHERE submitted_at >= NOW() - INTERVAL '30 days';

-- Step 5: Check specific worker from screenshot
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
WHERE wr.worker_id = '76b45232-4861-4219-aa20-50925c4f0c2c'  -- The worker_id from screenshot
ORDER BY wr.submitted_at DESC
LIMIT 10;

-- Step 6: Find workers with no team assigned (these will remain NULL)
SELECT 
  w.id,
  w.email,
  w.first_name || ' ' || w.last_name as worker_name,
  w.team,
  w.role,
  COUNT(wr.id) as work_readiness_count
FROM users w
LEFT JOIN work_readiness wr ON wr.worker_id = w.id AND wr.submitted_at >= NOW() - INTERVAL '30 days'
WHERE w.role = 'worker'
  AND (w.team IS NULL OR w.team = '')
GROUP BY w.id, w.email, w.first_name, w.last_name, w.team, w.role
HAVING COUNT(wr.id) > 0
ORDER BY work_readiness_count DESC;

-- Step 7: Summary report by team
SELECT 
  COALESCE(wr.team, w.team, 'NO TEAM') as team,
  COUNT(*) as total_submissions,
  COUNT(wr.team_leader_id) as with_team_leader,
  COUNT(*) - COUNT(wr.team_leader_id) as without_team_leader,
  COUNT(DISTINCT wr.worker_id) as unique_workers,
  COUNT(DISTINCT wr.team_leader_id) as unique_team_leaders
FROM work_readiness wr
LEFT JOIN users w ON w.id = wr.worker_id
WHERE wr.submitted_at >= NOW() - INTERVAL '30 days'
GROUP BY COALESCE(wr.team, w.team, 'NO TEAM')
ORDER BY total_submissions DESC;

-- Step 8: Check if the specific worker has a team and team leader
SELECT 
  w.id as worker_id,
  w.email,
  w.first_name || ' ' || w.last_name as worker_name,
  w.team as worker_team,
  w.role,
  tl.id as team_leader_id,
  tl.email as team_leader_email,
  tl.first_name || ' ' || tl.last_name as team_leader_name,
  tl.managed_teams
FROM users w
LEFT JOIN users tl ON tl.role = 'team_leader'
  AND tl.is_active = true
  AND (tl.managed_teams @> ARRAY[w.team]::text[] OR tl.team = w.team)
WHERE w.id = '76b45232-4861-4219-aa20-50925c4f0c2c'  -- The worker_id from screenshot
LIMIT 1;



