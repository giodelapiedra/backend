-- Fix Team Name Mismatch for admin_team_leader@test.com
-- This script fixes the team name inconsistency issue

-- ========================================
-- STEP 1: CHECK CURRENT STATE
-- ========================================

-- Check the admin team leader's current team and managed teams
SELECT 
    'CURRENT ADMIN TEAM LEADER STATE' as section,
    id,
    first_name,
    last_name,
    email,
    team,
    managed_teams,
    is_active
FROM public.users 
WHERE email = 'admin_team_leader@test.com';

-- Check what teams exist in the system
SELECT 
    'EXISTING TEAMS' as section,
    DISTINCT team
FROM public.users 
WHERE team IS NOT NULL
ORDER BY team;

-- Check workers and their teams
SELECT 
    'WORKERS BY TEAM' as section,
    team,
    COUNT(*) as worker_count
FROM public.users 
WHERE role = 'worker'
AND is_active = true
GROUP BY team
ORDER BY team;

-- ========================================
-- STEP 2: FIX TEAM NAME CONSISTENCY
-- ========================================

-- Option 1: If "TEAM GEO" exists, use it consistently
UPDATE public.users 
SET team = 'TEAM GEO',
    managed_teams = ARRAY['TEAM GEO']
WHERE email = 'admin_team_leader@test.com'
AND role = 'team_leader';

-- Option 2: If "TEAM GEO" doesn't exist, create it and assign workers
-- First, let's see if TEAM GEO exists
DO $$
BEGIN
    -- Check if TEAM GEO exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE team = 'TEAM GEO' LIMIT 1) THEN
        -- Create TEAM GEO by updating some workers to use this team
        UPDATE public.users 
        SET team = 'TEAM GEO'
        WHERE role = 'worker'
        AND is_active = true
        AND team IS NULL
        LIMIT 5; -- Assign first 5 workers to TEAM GEO
        
        -- If no workers were updated, create some sample workers
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE team = 'TEAM GEO' LIMIT 1) THEN
            INSERT INTO public.users (
                id, first_name, last_name, email, role, team, is_active, created_at, updated_at
            ) VALUES 
            (gen_random_uuid(), 'Worker', 'One', 'worker1@teamgeo.com', 'worker', 'TEAM GEO', true, NOW(), NOW()),
            (gen_random_uuid(), 'Worker', 'Two', 'worker2@teamgeo.com', 'worker', 'TEAM GEO', true, NOW(), NOW()),
            (gen_random_uuid(), 'Worker', 'Three', 'worker3@teamgeo.com', 'worker', 'TEAM GEO', true, NOW(), NOW());
        END IF;
    END IF;
END $$;

-- ========================================
-- STEP 3: ASSIGN WORKERS TO ADMIN TEAM LEADER
-- ========================================

-- Assign all workers from TEAM GEO to admin team leader
UPDATE public.users 
SET team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
WHERE role = 'worker' 
AND team = 'TEAM GEO'
AND is_active = true;

-- Also assign any workers without team leaders to admin team leader
UPDATE public.users 
SET team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
WHERE role = 'worker' 
AND is_active = true
AND team_leader_id IS NULL;

-- ========================================
-- STEP 4: VERIFY THE FIX
-- ========================================

-- Check admin team leader after update
SELECT 
    'ADMIN TEAM LEADER AFTER FIX' as section,
    id,
    first_name,
    last_name,
    email,
    team,
    managed_teams,
    is_active
FROM public.users 
WHERE email = 'admin_team_leader@test.com';

-- Check workers assigned to admin team leader
SELECT 
    'WORKERS ASSIGNED TO ADMIN TEAM LEADER' as section,
    w.id as worker_id,
    w.first_name || ' ' || w.last_name as worker_name,
    w.email as worker_email,
    w.team as worker_team,
    w.team_leader_id,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email
FROM public.users w
LEFT JOIN public.users tl ON w.team_leader_id = tl.id
WHERE w.team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
AND w.role = 'worker'
AND w.is_active = true
ORDER BY w.team, w.first_name;

-- Count workers assigned to admin team leader
SELECT 
    'WORKER COUNT FOR ADMIN TEAM LEADER' as section,
    COUNT(*) as total_workers_assigned
FROM public.users 
WHERE team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
AND role = 'worker'
AND is_active = true;

-- ========================================
-- STEP 5: ALTERNATIVE FIX - USE EXISTING TEAM
-- ========================================

-- If TEAM GEO doesn't work, let's use an existing team
-- Check what teams have workers
SELECT 
    'TEAMS WITH WORKERS' as section,
    team,
    COUNT(*) as worker_count
FROM public.users 
WHERE role = 'worker'
AND is_active = true
AND team IS NOT NULL
GROUP BY team
ORDER BY worker_count DESC;

-- Alternative: Assign admin team leader to the team with most workers
UPDATE public.users 
SET team = (
    SELECT team 
    FROM public.users 
    WHERE role = 'worker'
    AND is_active = true
    AND team IS NOT NULL
    GROUP BY team
    ORDER BY COUNT(*) DESC
    LIMIT 1
),
managed_teams = ARRAY[(
    SELECT team 
    FROM public.users 
    WHERE role = 'worker'
    AND is_active = true
    AND team IS NOT NULL
    GROUP BY team
    ORDER BY COUNT(*) DESC
    LIMIT 1
)]
WHERE email = 'admin_team_leader@test.com'
AND role = 'team_leader';

-- ========================================
-- STEP 6: FINAL VERIFICATION
-- ========================================

-- Final check - show all workers assigned to admin team leader
SELECT 
    'FINAL VERIFICATION - TEAM CONSISTENCY' as section,
    w.first_name || ' ' || w.last_name as worker_name,
    w.email as worker_email,
    w.team as worker_team,
    w.is_active,
    tl.email as team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams
FROM public.users w
JOIN public.users tl ON w.team_leader_id = tl.id
WHERE tl.email = 'admin_team_leader@test.com'
AND w.role = 'worker'
ORDER BY w.team, w.first_name;
