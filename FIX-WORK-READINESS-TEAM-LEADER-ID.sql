-- FIX: Update work_readiness records to have correct team_leader_id
-- Problem: Chart shows 0,0,0 because work_readiness.team_leader_id doesn't match

-- STEP 1: Check current situation
SELECT 
    'BEFORE FIX' as status,
    wr.id,
    w.email as worker_email,
    wr.team_leader_id as current_team_leader_id,
    w.team_leader_id as worker_assigned_team_leader_id,
    CASE 
        WHEN wr.team_leader_id = w.team_leader_id THEN '✅ MATCH'
        WHEN wr.team_leader_id IS NULL THEN '❌ NULL'
        ELSE '❌ MISMATCH'
    END as status_check
FROM work_readiness wr
JOIN users w ON w.id = wr.worker_id
WHERE w.email = 'samward@gmail.com'
ORDER BY wr.submitted_at DESC
LIMIT 5;

-- STEP 2: Update all work_readiness records to use worker's team_leader_id
UPDATE work_readiness wr
SET team_leader_id = w.team_leader_id
FROM users w
WHERE wr.worker_id = w.id
  AND (wr.team_leader_id IS NULL OR wr.team_leader_id != w.team_leader_id);

-- STEP 3: Check after fix
SELECT 
    'AFTER FIX' as status,
    wr.id,
    w.email as worker_email,
    wr.team_leader_id as updated_team_leader_id,
    w.team_leader_id as worker_assigned_team_leader_id,
    CASE 
        WHEN wr.team_leader_id = w.team_leader_id THEN '✅ MATCH'
        ELSE '❌ STILL WRONG'
    END as status_check
FROM work_readiness wr
JOIN users w ON w.id = wr.worker_id
WHERE w.email = 'samward@gmail.com'
ORDER BY wr.submitted_at DESC
LIMIT 5;

-- STEP 4: Verify chart will now work
SELECT 
    tl.email as team_leader_email,
    DATE(wr.submitted_at) as submission_date,
    wr.readiness_level,
    COUNT(*) as count
FROM work_readiness wr
JOIN users tl ON tl.id = wr.team_leader_id
WHERE tl.email = 'admin_team_leader@test.com'
  AND wr.submitted_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY tl.email, DATE(wr.submitted_at), wr.readiness_level
ORDER BY submission_date DESC, readiness_level;

