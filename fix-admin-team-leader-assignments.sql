-- Fix admin_team_leader@test.com - Assign team and workers
-- This script will assign the admin team leader to a team and assign workers to them

-- ========================================
-- STEP 1: CHECK CURRENT STATE
-- ========================================

-- Check the admin team leader
SELECT 
    'ADMIN TEAM LEADER' as section,
    id,
    first_name,
    last_name,
    email,
    role,
    team,
    managed_teams,
    is_active
FROM public.users 
WHERE email = 'admin_team_leader@test.com';

-- Check available workers
SELECT 
    'AVAILABLE WORKERS' as section,
    id,
    first_name,
    last_name,
    email,
    team,
    team_leader_id,
    is_active
FROM public.users 
WHERE role = 'worker'
AND is_active = true
ORDER BY team, first_name;

-- ========================================
-- STEP 2: ASSIGN TEAM TO ADMIN TEAM LEADER
-- ========================================

-- Assign admin team leader to 'admin' team
UPDATE public.users 
SET team = 'admin'
WHERE email = 'admin_team_leader@test.com'
AND role = 'team_leader';

-- Set managed teams for admin team leader
UPDATE public.users 
SET managed_teams = ARRAY['admin', 'default', 'team1', 'team2']
WHERE email = 'admin_team_leader@test.com'
AND role = 'team_leader';

-- ========================================
-- STEP 3: ASSIGN WORKERS TO ADMIN TEAM LEADER
-- ========================================

-- Assign all workers without team leaders to admin team leader
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

-- Assign workers from 'admin' team to admin team leader
UPDATE public.users 
SET team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
WHERE role = 'worker' 
AND team = 'admin'
AND is_active = true;

-- Assign workers from 'default' team to admin team leader
UPDATE public.users 
SET team_leader_id = (
    SELECT id 
    FROM public.users 
    WHERE email = 'admin_team_leader@test.com'
    AND role = 'team_leader'
)
WHERE role = 'worker' 
AND team = 'default'
AND is_active = true;

-- ========================================
-- STEP 4: VERIFY ASSIGNMENTS
-- ========================================

-- Check admin team leader after update
SELECT 
    'ADMIN TEAM LEADER AFTER UPDATE' as section,
    id,
    first_name,
    last_name,
    email,
    role,
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
-- STEP 5: CREATE SAMPLE WORKERS IF NONE EXIST
-- ========================================

-- Check if we have any workers at all
SELECT 
    'TOTAL WORKERS CHECK' as section,
    COUNT(*) as total_workers
FROM public.users 
WHERE role = 'worker'
AND is_active = true;

-- If no workers exist, create some sample workers
INSERT INTO public.users (
    id,
    first_name,
    last_name,
    email,
    role,
    team,
    team_leader_id,
    is_active,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'John',
    'Doe',
    'john.doe@test.com',
    'worker',
    'admin',
    (SELECT id FROM public.users WHERE email = 'admin_team_leader@test.com' AND role = 'team_leader'),
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE role = 'worker' AND is_active = true
);

INSERT INTO public.users (
    id,
    first_name,
    last_name,
    email,
    role,
    team,
    team_leader_id,
    is_active,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'Jane',
    'Smith',
    'jane.smith@test.com',
    'worker',
    'admin',
    (SELECT id FROM public.users WHERE email = 'admin_team_leader@test.com' AND role = 'team_leader'),
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE role = 'worker' AND is_active = true
);

INSERT INTO public.users (
    id,
    first_name,
    last_name,
    email,
    role,
    team,
    team_leader_id,
    is_active,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'Mike',
    'Johnson',
    'mike.johnson@test.com',
    'worker',
    'default',
    (SELECT id FROM public.users WHERE email = 'admin_team_leader@test.com' AND role = 'team_leader'),
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE role = 'worker' AND is_active = true
);

-- ========================================
-- STEP 6: FINAL VERIFICATION
-- ========================================

-- Final check - show all workers assigned to admin team leader
SELECT 
    'FINAL VERIFICATION' as section,
    w.first_name || ' ' || w.last_name as worker_name,
    w.email as worker_email,
    w.team as worker_team,
    w.is_active,
    tl.email as team_leader_email
FROM public.users w
JOIN public.users tl ON w.team_leader_id = tl.id
WHERE tl.email = 'admin_team_leader@test.com'
AND w.role = 'worker'
ORDER BY w.team, w.first_name;
