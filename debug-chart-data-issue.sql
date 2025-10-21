-- Debug why chart shows (0) even though database has data
-- Run this to understand the data flow

-- STEP 1: Check if work_readiness table has data with team_leader_id
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN team_leader_id IS NOT NULL THEN 1 END) as with_team_leader,
  COUNT(CASE WHEN team_leader_id IS NULL THEN 1 END) as without_team_leader,
  MIN(submitted_at) as oldest_submission,
  MAX(submitted_at) as latest_submission
FROM work_readiness;

-- STEP 2: Check what readiness_level values exist
SELECT 
  readiness_level,
  COUNT(*) as count
FROM work_readiness
WHERE submitted_at >= NOW() - INTERVAL '7 days'
GROUP BY readiness_level
ORDER BY count DESC;

-- STEP 3: Check for a specific team leader
-- Replace 'TEAM_LEADER_EMAIL' with actual team leader email
WITH team_leader_info AS (
  SELECT 
    id as team_leader_id,
    email,
    team,
    managed_teams
  FROM users 
  WHERE role = 'team_leader'
  -- AND email = 'admin_team_leader@test.com'  -- Uncomment and change email
  LIMIT 1
),
team_workers AS (
  SELECT 
    w.id as worker_id,
    w.email as worker_email,
    w.first_name || ' ' || w.last_name as worker_name,
    w.team as worker_team
  FROM users w
  CROSS JOIN team_leader_info tl
  WHERE w.role = 'worker'
    AND (
      w.team = ANY(tl.managed_teams)
      OR w.team = tl.team
    )
)
SELECT 
  'Team Leader' as info_type,
  tl.email,
  tl.team_leader_id::text as id,
  NULL as worker_email,
  ARRAY_TO_STRING(tl.managed_teams, ', ') as managed_teams
FROM team_leader_info tl

UNION ALL

SELECT 
  'Workers in Team',
  NULL,
  COUNT(*)::text,
  STRING_AGG(worker_email, ', '),
  NULL
FROM team_workers

UNION ALL

SELECT 
  'Work Readiness (Last 7 Days)',
  NULL,
  COUNT(wr.id)::text,
  NULL,
  STRING_AGG(DISTINCT wr.readiness_level, ', ')
FROM team_workers tw
JOIN work_readiness wr ON wr.worker_id = tw.worker_id
WHERE wr.submitted_at >= NOW() - INTERVAL '7 days';

-- STEP 4: Show actual data that should appear in chart
WITH team_leader_info AS (
  SELECT 
    id as team_leader_id,
    managed_teams,
    team
  FROM users 
  WHERE role = 'team_leader'
  -- AND email = 'admin_team_leader@test.com'  -- Uncomment to test specific team leader
  LIMIT 1
),
team_workers AS (
  SELECT w.id
  FROM users w
  CROSS JOIN team_leader_info tl
  WHERE w.role = 'worker'
    AND (
      w.team = ANY(tl.managed_teams)
      OR w.team = tl.team
    )
)
SELECT 
  DATE(wr.submitted_at) as date,
  COUNT(*) FILTER (WHERE wr.readiness_level IN ('fit', 'fit_for_work')) as fit_count,
  COUNT(*) FILTER (WHERE wr.readiness_level IN ('minor', 'minor_concerns', 'minor_concerns_fit_for_work')) as minor_count,
  COUNT(*) FILTER (WHERE wr.readiness_level IN ('not_fit', 'not_fit_for_work')) as not_fit_count,
  COUNT(*) as total,
  STRING_AGG(DISTINCT wr.readiness_level, ', ') as unique_levels
FROM team_workers tw
JOIN work_readiness wr ON wr.worker_id = tw.id
WHERE wr.submitted_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(wr.submitted_at)
ORDER BY date DESC;

-- STEP 5: Check if there's a mismatch between worker.team and managed_teams
SELECT 
  'Workers WITHOUT team' as issue,
  COUNT(*) as count
FROM users
WHERE role = 'worker'
  AND (team IS NULL OR team = '')

UNION ALL

SELECT 
  'Workers WITH team but NO team leader manages them',
  COUNT(DISTINCT w.id)
FROM users w
LEFT JOIN users tl ON (
  tl.role = 'team_leader'
  AND tl.is_active = true
  AND (
    tl.managed_teams @> ARRAY[w.team]::text[]
    OR tl.team = w.team
  )
)
WHERE w.role = 'worker'
  AND w.team IS NOT NULL
  AND tl.id IS NULL;

-- STEP 6: Show sample work_readiness records (last 10)
SELECT 
  wr.id,
  wr.worker_id,
  w.email as worker_email,
  w.team as worker_team,
  wr.team as wr_team,
  wr.team_leader_id,
  wr.readiness_level,
  wr.submitted_at
FROM work_readiness wr
LEFT JOIN users w ON w.id = wr.worker_id
ORDER BY wr.submitted_at DESC
LIMIT 10;

