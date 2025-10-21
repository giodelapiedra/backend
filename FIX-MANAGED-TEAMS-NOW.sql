-- QUICK FIX: Populate managed_teams for admin_team_leader@test.com

-- STEP 1: Check current status
SELECT 
  'BEFORE FIX' as status,
  email,
  team,
  managed_teams,
  ARRAY_LENGTH(managed_teams, 1) as managed_teams_count
FROM users
WHERE email = 'admin_team_leader@test.com';

-- STEP 2: Check Sam Ward's team
SELECT 
  'SAM WARD TEAM' as status,
  email,
  team,
  team_leader_id
FROM users
WHERE email = 'samward@gmail.com';

-- STEP 3: FIX - Add Sam Ward's team to admin_team_leader's managed_teams
UPDATE users
SET managed_teams = CASE
  WHEN managed_teams IS NULL THEN 
    ARRAY[(SELECT team FROM users WHERE email = 'samward@gmail.com')]
  WHEN NOT ((SELECT team FROM users WHERE email = 'samward@gmail.com') = ANY(managed_teams)) THEN 
    ARRAY_APPEND(managed_teams, (SELECT team FROM users WHERE email = 'samward@gmail.com'))
  ELSE 
    managed_teams
END
WHERE email = 'admin_team_leader@test.com';

-- STEP 4: Verify the fix
SELECT 
  'AFTER FIX' as status,
  email,
  team,
  managed_teams,
  ARRAY_LENGTH(managed_teams, 1) as managed_teams_count
FROM users
WHERE email = 'admin_team_leader@test.com';

-- STEP 5: Test the query that frontend uses
WITH team_leader_data AS (
  SELECT managed_teams, team
  FROM users
  WHERE email = 'admin_team_leader@test.com'
),
managed_teams_array AS (
  SELECT 
    managed_teams,
    team,
    CASE 
      WHEN team IS NOT NULL AND NOT (team = ANY(COALESCE(managed_teams, ARRAY[]::text[]))) 
      THEN ARRAY_APPEND(COALESCE(managed_teams, ARRAY[]::text[]), team)
      ELSE COALESCE(managed_teams, ARRAY[]::text[])
    END as final_teams
  FROM team_leader_data
)
SELECT 
  'TEAMS TO QUERY' as info,
  final_teams as teams,
  ARRAY_LENGTH(final_teams, 1) as team_count
FROM managed_teams_array;

-- STEP 6: Get workers using the same logic as frontend
WITH team_leader_data AS (
  SELECT 
    id as team_leader_id,
    managed_teams,
    team
  FROM users
  WHERE email = 'admin_team_leader@test.com'
),
final_teams AS (
  SELECT 
    team_leader_id,
    CASE 
      WHEN team IS NOT NULL AND NOT (team = ANY(COALESCE(managed_teams, ARRAY[]::text[]))) 
      THEN ARRAY_APPEND(COALESCE(managed_teams, ARRAY[]::text[]), team)
      ELSE COALESCE(managed_teams, ARRAY[]::text[])
    END as teams
  FROM team_leader_data
)
SELECT 
  'WORKERS FOUND' as info,
  w.id,
  w.email,
  w.team
FROM users w
CROSS JOIN final_teams ft
WHERE w.role = 'worker'
  AND w.team = ANY(ft.teams);

-- STEP 7: Get work readiness data using the same logic
WITH team_leader_data AS (
  SELECT 
    id as team_leader_id,
    managed_teams,
    team
  FROM users
  WHERE email = 'admin_team_leader@test.com'
),
final_teams AS (
  SELECT 
    team_leader_id,
    CASE 
      WHEN team IS NOT NULL AND NOT (team = ANY(COALESCE(managed_teams, ARRAY[]::text[]))) 
      THEN ARRAY_APPEND(COALESCE(managed_teams, ARRAY[]::text[]), team)
      ELSE COALESCE(managed_teams, ARRAY[]::text[])
    END as teams
  FROM team_leader_data
),
team_workers AS (
  SELECT w.id
  FROM users w
  CROSS JOIN final_teams ft
  WHERE w.role = 'worker'
    AND w.team = ANY(ft.teams)
)
SELECT 
  'WORK READINESS LAST 7 DAYS' as info,
  COUNT(*) as total_count,
  DATE(wr.submitted_at) as date,
  wr.readiness_level,
  w.email as worker_email
FROM work_readiness wr
JOIN team_workers tw ON tw.id = wr.worker_id
JOIN users w ON w.id = wr.worker_id
WHERE wr.submitted_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(wr.submitted_at), wr.readiness_level, w.email
ORDER BY date DESC;

