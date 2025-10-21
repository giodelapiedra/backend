-- Check relationship between admin_team_leader@test.com and samward@gmail.com
-- This will show why chart shows (0)

-- STEP 1: Check Team Leader Details
SELECT 
  'TEAM LEADER INFO' as type,
  id,
  email,
  first_name,
  last_name,
  team,
  managed_teams,
  is_active
FROM users
WHERE email = 'admin_team_leader@test.com';

-- STEP 2: Check Worker Details
SELECT 
  'WORKER INFO' as type,
  id,
  email,
  first_name,
  last_name,
  team,
  team_leader_id,
  is_active
FROM users
WHERE email = 'samward@gmail.com';

-- STEP 3: Check if worker's team is in team leader's managed_teams
WITH team_leader AS (
  SELECT 
    id as tl_id,
    managed_teams,
    team
  FROM users 
  WHERE email = 'admin_team_leader@test.com'
),
worker AS (
  SELECT 
    id as w_id,
    team as w_team
  FROM users 
  WHERE email = 'samward@gmail.com'
)
SELECT 
  'RELATIONSHIP CHECK' as check_type,
  tl.tl_id as team_leader_id,
  tl.managed_teams,
  tl.team as tl_own_team,
  w.w_team as worker_team,
  CASE 
    WHEN w.w_team = ANY(tl.managed_teams) THEN '✅ Worker team IS IN managed_teams'
    WHEN w.w_team = tl.team THEN '✅ Worker team MATCHES team leader own team'
    ELSE '❌ NO RELATIONSHIP - Worker team NOT managed by this team leader'
  END as relationship_status
FROM team_leader tl
CROSS JOIN worker w;

-- STEP 4: Check Sam Ward's work readiness submissions
SELECT 
  'SAM WARD SUBMISSIONS' as type,
  wr.id,
  wr.worker_id,
  wr.team_leader_id,
  wr.team,
  wr.readiness_level,
  wr.submitted_at,
  (NOW() - wr.submitted_at) as age
FROM work_readiness wr
JOIN users u ON u.id = wr.worker_id
WHERE u.email = 'samward@gmail.com'
ORDER BY wr.submitted_at DESC
LIMIT 10;

-- STEP 5: Check if submissions are within last 7 days
SELECT 
  'RECENT SUBMISSIONS (Last 7 Days)' as type,
  COUNT(*) as count,
  MIN(submitted_at) as oldest,
  MAX(submitted_at) as latest
FROM work_readiness wr
JOIN users u ON u.id = wr.worker_id
WHERE u.email = 'samward@gmail.com'
  AND wr.submitted_at >= NOW() - INTERVAL '7 days';

-- STEP 6: FIX - If worker team is NOT in managed_teams, add it
-- Uncomment and run this if relationship check shows ❌

/*
-- Get current managed_teams
WITH current_data AS (
  SELECT 
    id,
    managed_teams,
    (SELECT team FROM users WHERE email = 'samward@gmail.com') as worker_team
  FROM users
  WHERE email = 'admin_team_leader@test.com'
)
UPDATE users u
SET managed_teams = ARRAY_APPEND(
  COALESCE(u.managed_teams, ARRAY[]::text[]),
  cd.worker_team
)
FROM current_data cd
WHERE u.id = cd.id
  AND NOT (cd.worker_team = ANY(COALESCE(u.managed_teams, ARRAY[]::text[])));

-- Verify the update
SELECT 
  'AFTER UPDATE' as status,
  id,
  email,
  managed_teams
FROM users
WHERE email = 'admin_team_leader@test.com';
*/

-- STEP 7: Alternative - Assign worker directly to team leader
/*
UPDATE users
SET team_leader_id = (
  SELECT id FROM users WHERE email = 'admin_team_leader@test.com'
)
WHERE email = 'samward@gmail.com';

-- Verify
SELECT 
  'AFTER DIRECT ASSIGNMENT' as status,
  id,
  email,
  team,
  team_leader_id
FROM users
WHERE email = 'samward@gmail.com';
*/

