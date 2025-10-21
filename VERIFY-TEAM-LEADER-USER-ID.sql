-- Verify Team Leader User ID
-- Check what ID should be used in the chart query

-- 1. Get the team leader's actual user ID
SELECT 
    '1. TEAM LEADER INFO' as step,
    id as team_leader_user_id,
    email,
    first_name || ' ' || last_name as name,
    role,
    team
FROM users 
WHERE email = 'admin_team_leader@test.com';

-- 2. Check work_readiness records and their team_leader_id
SELECT 
    '2. WORK READINESS RECORDS' as step,
    wr.id,
    wr.team_leader_id as team_leader_id_in_work_readiness,
    wr.readiness_level,
    wr.submitted_at,
    tl.email as team_leader_email,
    w.email as worker_email
FROM work_readiness wr
LEFT JOIN users tl ON tl.id = wr.team_leader_id
LEFT JOIN users w ON w.id = wr.worker_id
WHERE wr.submitted_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY wr.submitted_at DESC;

-- 3. Check if IDs match
SELECT 
    '3. ID COMPARISON' as step,
    (SELECT id FROM users WHERE email = 'admin_team_leader@test.com') as expected_team_leader_id,
    wr.team_leader_id as actual_team_leader_id_in_record,
    CASE 
        WHEN wr.team_leader_id = (SELECT id FROM users WHERE email = 'admin_team_leader@test.com') 
        THEN '✅ MATCH - Chart should work!'
        ELSE '❌ MISMATCH - This is the problem!'
    END as status
FROM work_readiness wr
WHERE wr.submitted_at >= CURRENT_DATE
LIMIT 1;

-- 4. What the frontend query should be
SELECT 
    '4. FRONTEND SHOULD QUERY LIKE THIS:' as info,
    (SELECT id FROM users WHERE email = 'admin_team_leader@test.com') as use_this_team_leader_id;

