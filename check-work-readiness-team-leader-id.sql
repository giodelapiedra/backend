-- Check work_readiness records and their team_leader_id
-- Problem: Chart shows 0,0,0 even though worker submitted

-- 1. Get team leader info
SELECT 
    id as team_leader_id,
    email as team_leader_email,
    first_name || ' ' || last_name as team_leader_name,
    team,
    managed_teams
FROM users 
WHERE email = 'admin_team_leader@test.com';

-- 2. Get worker info
SELECT 
    id as worker_id,
    email as worker_email,
    first_name || ' ' || last_name as worker_name,
    team,
    team_leader_id
FROM users 
WHERE email = 'samward@gmail.com';

-- 3. Check work_readiness records for samward
SELECT 
    wr.id,
    wr.worker_id,
    wr.team_leader_id as wr_team_leader_id,
    wr.readiness_level,
    wr.submitted_at,
    w.email as worker_email,
    w.team as worker_team,
    w.team_leader_id as worker_assigned_team_leader_id
FROM work_readiness wr
LEFT JOIN users w ON w.id = wr.worker_id
WHERE w.email = 'samward@gmail.com'
ORDER BY wr.submitted_at DESC
LIMIT 10;

-- 4. Check if team_leader_id matches
SELECT 
    'Team Leader ID from users table' as source,
    id as team_leader_id
FROM users 
WHERE email = 'admin_team_leader@test.com'

UNION ALL

SELECT 
    'Team Leader ID in work_readiness' as source,
    DISTINCT team_leader_id
FROM work_readiness wr
JOIN users w ON w.id = wr.worker_id
WHERE w.email = 'samward@gmail.com';

-- 5. Count records by team_leader_id
SELECT 
    tl.email as team_leader_email,
    COUNT(*) as total_records
FROM work_readiness wr
LEFT JOIN users tl ON tl.id = wr.team_leader_id
WHERE wr.submitted_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY tl.email, tl.id;

