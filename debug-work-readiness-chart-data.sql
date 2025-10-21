-- Debug Work Readiness Chart Data
-- Run this to check if work readiness data exists for a team leader

-- Step 1: Get team leader info and their team
SELECT 
  id,
  email,
  first_name,
  last_name,
  team,
  managed_teams
FROM users 
WHERE role = 'team_leader' 
AND email = 'admin_team_leader@test.com'; -- Change this to your team leader email

-- Step 2: Get team members under this team leader
WITH team_leader AS (
  SELECT 
    id,
    team,
    managed_teams
  FROM users 
  WHERE role = 'team_leader' 
  AND email = 'admin_team_leader@test.com' -- Change this to your team leader email
),
all_teams AS (
  SELECT UNNEST(
    ARRAY[team] || COALESCE(managed_teams, ARRAY[]::text[])
  ) AS team_name
  FROM team_leader
)
SELECT 
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.team
FROM users u
WHERE u.role = 'worker'
AND u.team IN (SELECT team_name FROM all_teams);

-- Step 3: Get work readiness submissions for these workers (last 7 days)
WITH team_leader AS (
  SELECT 
    id,
    team,
    managed_teams
  FROM users 
  WHERE role = 'team_leader' 
  AND email = 'admin_team_leader@test.com' -- Change this to your team leader email
),
all_teams AS (
  SELECT UNNEST(
    ARRAY[team] || COALESCE(managed_teams, ARRAY[]::text[])
  ) AS team_name
  FROM team_leader
),
team_workers AS (
  SELECT u.id
  FROM users u
  WHERE u.role = 'worker'
  AND u.team IN (SELECT team_name FROM all_teams)
)
SELECT 
  wr.id,
  wr.worker_id,
  u.first_name || ' ' || u.last_name AS worker_name,
  wr.readiness_level,
  wr.submitted_at,
  DATE(wr.submitted_at) AS submission_date,
  wr.team_leader_id
FROM work_readiness wr
JOIN users u ON u.id = wr.worker_id
WHERE wr.worker_id IN (SELECT id FROM team_workers)
AND wr.submitted_at >= NOW() - INTERVAL '7 days'
ORDER BY wr.submitted_at DESC;

-- Step 4: Count by date and readiness level (last 7 days)
WITH team_leader AS (
  SELECT 
    id,
    team,
    managed_teams
  FROM users 
  WHERE role = 'team_leader' 
  AND email = 'admin_team_leader@test.com' -- Change this to your team leader email
),
all_teams AS (
  SELECT UNNEST(
    ARRAY[team] || COALESCE(managed_teams, ARRAY[]::text[])
  ) AS team_name
  FROM team_leader
),
team_workers AS (
  SELECT u.id
  FROM users u
  WHERE u.role = 'worker'
  AND u.team IN (SELECT team_name FROM all_teams)
),
date_series AS (
  SELECT 
    DATE(NOW() - INTERVAL '1 day' * s) AS submission_date
  FROM generate_series(0, 6) s
)
SELECT 
  ds.submission_date,
  COUNT(*) FILTER (WHERE wr.readiness_level IN ('fit', 'fit_for_work')) AS fit_count,
  COUNT(*) FILTER (WHERE wr.readiness_level IN ('minor', 'minor_concerns', 'minor_concerns_fit_for_work')) AS minor_count,
  COUNT(*) FILTER (WHERE wr.readiness_level IN ('not_fit', 'not_fit_for_work')) AS not_fit_count,
  COUNT(*) AS total_count
FROM date_series ds
LEFT JOIN work_readiness wr ON DATE(wr.submitted_at) = ds.submission_date
  AND wr.worker_id IN (SELECT id FROM team_workers)
GROUP BY ds.submission_date
ORDER BY ds.submission_date;

-- Step 5: Check what readiness_level values exist in the database
SELECT 
  readiness_level,
  COUNT(*) as count
FROM work_readiness
WHERE submitted_at >= NOW() - INTERVAL '30 days'
GROUP BY readiness_level
ORDER BY count DESC;

-- Step 6: Check if team_leader_id is populated
SELECT 
  COUNT(*) as total_records,
  COUNT(team_leader_id) as records_with_team_leader_id,
  COUNT(*) - COUNT(team_leader_id) as records_without_team_leader_id
FROM work_readiness
WHERE submitted_at >= NOW() - INTERVAL '30 days';

-- Step 7: Sample data with all fields
SELECT 
  wr.id,
  wr.worker_id,
  u.first_name || ' ' || u.last_name AS worker_name,
  u.team AS worker_team,
  wr.readiness_level,
  wr.fatigue_level,
  wr.mood,
  wr.pain_discomfort,
  wr.submitted_at,
  wr.team_leader_id,
  tl.first_name || ' ' || tl.last_name AS team_leader_name
FROM work_readiness wr
LEFT JOIN users u ON u.id = wr.worker_id
LEFT JOIN users tl ON tl.id = wr.team_leader_id
WHERE wr.submitted_at >= NOW() - INTERVAL '7 days'
ORDER BY wr.submitted_at DESC
LIMIT 20;



