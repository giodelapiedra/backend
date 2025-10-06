-- Fix Missing team_leader_id Column
-- This script adds the missing team_leader_id column to the users table

-- ========================================
-- SECTION 1: CHECK CURRENT TABLE STRUCTURE
-- ========================================

-- 1.1 Check if team_leader_id column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'team_leader_id'
        ) 
        THEN '✅ team_leader_id column EXISTS'
        ELSE '❌ team_leader_id column MISSING'
    END as team_leader_id_status;

-- 1.2 Show current users table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ========================================
-- SECTION 2: ADD MISSING COLUMN
-- ========================================

-- 2.1 Add team_leader_id column if it doesn't exist
DO $$
BEGIN
    -- Check if team_leader_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'team_leader_id'
    ) THEN
        -- Add the team_leader_id column
        ALTER TABLE users 
        ADD COLUMN team_leader_id UUID REFERENCES users(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ team_leader_id column added to users table';
    ELSE
        RAISE NOTICE '✅ team_leader_id column already exists in users table';
    END IF;
END $$;

-- 2.2 Add index for better performance
CREATE INDEX IF NOT EXISTS idx_users_team_leader_id ON users(team_leader_id);

-- 2.3 Add comment to document the column
COMMENT ON COLUMN users.team_leader_id IS 'ID of the team leader who manages this user. Used for workers to link to their team leader.';

-- ========================================
-- SECTION 3: VERIFY COLUMN ADDITION
-- ========================================

-- 3.1 Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'team_leader_id';

-- 3.2 Check foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'users'
    AND kcu.column_name = 'team_leader_id';

-- ========================================
-- SECTION 4: POPULATE TEAM LEADER ASSIGNMENTS
-- ========================================

-- 4.1 Check current team assignments
SELECT 
    'CURRENT TEAM ASSIGNMENTS' as section,
    u.id,
    u.first_name,
    u.last_name,
    u.role,
    u.team,
    u.team_leader_id,
    u.managed_teams,
    u.is_active
FROM users u
WHERE u.role IN ('team_leader', 'worker')
ORDER BY u.role, u.team;

-- 4.2 Assign team leaders to workers based on team matching
UPDATE users 
SET team_leader_id = (
    SELECT tl.id 
    FROM users tl 
    WHERE tl.role = 'team_leader' 
    AND tl.is_active = true
    AND (
        users.team = tl.team 
        OR users.team = ANY(tl.managed_teams)
    )
    LIMIT 1
)
WHERE role = 'worker' 
AND team_leader_id IS NULL
AND team IS NOT NULL;

-- 4.3 Verify team assignments
SELECT 
    'AFTER TEAM ASSIGNMENT' as section,
    COUNT(*) as total_workers,
    COUNT(team_leader_id) as workers_with_team_leaders,
    COUNT(*) - COUNT(team_leader_id) as workers_without_team_leaders,
    ROUND(COUNT(team_leader_id) * 100.0 / COUNT(*), 2) as coverage_percentage
FROM users 
WHERE role = 'worker' 
AND is_active = true;

-- ========================================
-- SECTION 5: TEST NOTIFICATION SYSTEM
-- ========================================

-- 5.1 Test notification creation
DO $$
DECLARE
    team_leader_id UUID;
    worker_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get a team leader with managed teams
    SELECT id INTO team_leader_id
    FROM users 
    WHERE role = 'team_leader'
    AND managed_teams IS NOT NULL
    AND array_length(managed_teams, 1) > 0
    AND is_active = true
    LIMIT 1;
    
    -- Get a worker from their team
    SELECT u.id INTO worker_id
    FROM users u
    WHERE u.role = 'worker'
    AND u.is_active = true
    AND u.team_leader_id = team_leader_id
    LIMIT 1;
    
    -- Insert test notification
    IF team_leader_id IS NOT NULL AND worker_id IS NOT NULL THEN
        INSERT INTO notifications (
            recipient_id,
            sender_id,
            type,
            title,
            message,
            priority,
            is_read,
            action_url,
            metadata
        ) VALUES (
            team_leader_id,
            worker_id,
            'work_readiness_submitted',
            'TEST: Work Readiness Notification Test',
            'This is a test notification to verify the notification system is working properly.',
            'medium',
            false,
            '/team-leader',
            jsonb_build_object(
                'worker_id', worker_id,
                'test', true,
                'timestamp', now()
            )
        ) RETURNING id INTO test_notification_id;
        
        RAISE NOTICE '✅ Test notification created with ID: %', test_notification_id;
        RAISE NOTICE '✅ Sent from worker % to team leader %', worker_id, team_leader_id;
    ELSE
        RAISE NOTICE '❌ Could not find team leader (%) or worker (%) for test', team_leader_id, worker_id;
    END IF;
END $$;

-- 5.2 Check if test notification was created
SELECT 
    'TEST NOTIFICATION RESULT' as section,
    n.id,
    n.recipient_id,
    n.sender_id,
    n.type,
    n.title,
    n.message,
    n.priority,
    n.is_read,
    n.created_at,
    tl.first_name as team_leader_name,
    tl.email as team_leader_email,
    sender.first_name as sender_name,
    sender.email as sender_email
FROM notifications n
LEFT JOIN users tl ON n.recipient_id = tl.id
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE n.title LIKE 'TEST:%'
ORDER BY n.created_at DESC
LIMIT 5;

-- ========================================
-- SECTION 6: FINAL VERIFICATION
-- ========================================

-- 6.1 Final team assignment summary
SELECT 
    'FINAL TEAM ASSIGNMENT SUMMARY' as section,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email,
    tl.team as team_leader_team,
    tl.managed_teams,
    COUNT(w.id) as workers_managed,
    ARRAY_AGG(w.first_name || ' ' || w.last_name) as worker_names
FROM users tl
LEFT JOIN users w ON w.team_leader_id = tl.id AND w.role = 'worker' AND w.is_active = true
WHERE tl.role = 'team_leader' 
AND tl.is_active = true
GROUP BY tl.id, tl.first_name, tl.last_name, tl.email, tl.team, tl.managed_teams
ORDER BY workers_managed DESC;

-- 6.2 System health check
SELECT 
    'SYSTEM HEALTH CHECK' as section,
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE role = 'team_leader' AND is_active = true) > 0 
        THEN '✅ Team leaders exist'
        ELSE '❌ No active team leaders'
    END as team_leaders_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE role = 'worker' AND is_active = true) > 0 
        THEN '✅ Workers exist'
        ELSE '❌ No active workers'
    END as workers_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE role = 'worker' AND team_leader_id IS NOT NULL AND is_active = true) > 0 
        THEN '✅ Workers have team leaders'
        ELSE '❌ Workers missing team leaders'
    END as team_assignment_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM notifications WHERE type = 'work_readiness_submitted') > 0 
        THEN '✅ Work readiness notifications exist'
        ELSE '⚠️ No work readiness notifications found'
    END as notification_status;


