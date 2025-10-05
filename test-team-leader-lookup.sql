-- Quick test to verify team leader lookup logic
-- Run this in your Supabase SQL Editor

-- 1. Check if team leader manages TEAM GEO
SELECT 
    id,
    first_name,
    last_name,
    email,
    team,
    managed_teams,
    is_active
FROM users 
WHERE email = 'admin_team_leader@test.com';

-- 2. Check if 'TEAM GEO' is in the managed_teams array
SELECT 
    id,
    first_name,
    last_name,
    email,
    managed_teams,
    'TEAM GEO' = ANY(managed_teams) as manages_team_geo
FROM users 
WHERE email = 'admin_team_leader@test.com';

-- 3. Test the exact query the frontend uses
SELECT 
    id,
    first_name,
    last_name,
    managed_teams
FROM users 
WHERE role = 'team_leader'
AND is_active = true
AND 'TEAM GEO' = ANY(managed_teams)
LIMIT 1;
