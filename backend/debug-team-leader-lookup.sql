-- Debug team leader lookup issue
-- Run this in your Supabase SQL Editor

-- 1. Check all users and their teams
SELECT 
    id,
    first_name,
    last_name,
    role,
    team,
    managed_teams,
    is_active
FROM users 
WHERE role IN ('team_leader', 'worker')
ORDER BY role, team;

-- 2. Check recent work readiness submissions
SELECT 
    id,
    worker_id,
    team_leader_id,
    team,
    readiness_level,
    submitted_at,
    created_at
FROM work_readiness 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check if there are any team leaders for specific teams
SELECT DISTINCT
    u.team,
    COUNT(CASE WHEN u.role = 'team_leader' THEN 1 END) as team_leaders,
    COUNT(CASE WHEN u.role = 'worker' THEN 1 END) as workers
FROM users u
WHERE u.team IS NOT NULL
AND u.is_active = true
GROUP BY u.team
ORDER BY u.team;

-- 4. Test team leader lookup for TEAM GEO specifically
SELECT 
    id,
    first_name,
    last_name,
    role,
    team,
    managed_teams
FROM users 
WHERE role = 'team_leader'
AND ('TEAM GEO' = ANY(managed_teams) OR team = 'TEAM GEO')
AND is_active = true;

-- 5. Check if any team leader manages TEAM GEO
SELECT 
    id,
    first_name,
    last_name,
    managed_teams
FROM users 
WHERE role = 'team_leader'
AND managed_teams IS NOT NULL
AND 'TEAM GEO' = ANY(managed_teams)
AND is_active = true;
