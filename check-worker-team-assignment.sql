-- Check if the worker has a team assigned
-- This will help us understand why team_leader_id and team are still NULL

-- Check the specific worker from the screenshot
SELECT 
  id as worker_id,
  email,
  first_name,
  last_name,
  role,
  team,
  team_leader_id,
  is_active,
  created_at
FROM users
WHERE id = '51f1499-2624-49f2-b53c-1553e6e8c9b2';

-- If the worker has a team, find their team leader
SELECT 
  w.id as worker_id,
  w.email as worker_email,
  w.first_name || ' ' || w.last_name as worker_name,
  w.team as worker_team,
  w.team_leader_id as worker_team_leader_id,
  tl.id as found_team_leader_id,
  tl.email as team_leader_email,
  tl.first_name || ' ' || tl.last_name as team_leader_name,
  tl.managed_teams
FROM users w
LEFT JOIN users tl ON (
  tl.role = 'team_leader' 
  AND tl.is_active = true
  AND (
    tl.managed_teams @> ARRAY[w.team]::text[]  -- Primary: via managed_teams
    OR tl.team = w.team                        -- Fallback: via team field
  )
)
WHERE w.id = '51f1499-2624-49f2-b53c-1553e6e8c9b2';

-- Show ALL workers without teams
SELECT 
  id,
  email,
  first_name || ' ' || w.last_name as name,
  role,
  team,
  is_active,
  COUNT(wr.id) as work_readiness_submissions
FROM users w
LEFT JOIN work_readiness wr ON wr.worker_id = w.id
WHERE w.role = 'worker'
  AND (w.team IS NULL OR w.team = '')
GROUP BY w.id, w.email, w.first_name, w.last_name, w.role, w.team, w.is_active
ORDER BY work_readiness_submissions DESC;

-- Show all available teams and team leaders
SELECT 
  tl.id as team_leader_id,
  tl.email,
  tl.first_name || ' ' || tl.last_name as team_leader_name,
  tl.team as team_leader_own_team,
  tl.managed_teams,
  tl.is_active,
  COUNT(w.id) as workers_in_managed_teams
FROM users tl
LEFT JOIN users w ON (
  w.role = 'worker' 
  AND w.team = ANY(tl.managed_teams)
)
WHERE tl.role = 'team_leader'
GROUP BY tl.id, tl.email, tl.first_name, tl.last_name, tl.team, tl.managed_teams, tl.is_active
ORDER BY workers_in_managed_teams DESC;

-- SOLUTION: Assign worker to a team
-- Replace 'TEAM_NAME' with the actual team name
-- Replace 'WORKER_ID' with the worker's ID

/*
-- Example: Assign worker to "Team A"
UPDATE users
SET 
  team = 'Team A',
  updated_at = NOW()
WHERE id = '51f1499-2624-49f2-b53c-1553e6e8c9b2';

-- Then re-run the fix script to populate work_readiness table
*/



