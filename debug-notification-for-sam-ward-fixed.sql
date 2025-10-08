-- =============================================
-- DEBUG: Check Sam Ward's Notifications
-- =============================================

-- 1. Find Sam Ward's user ID
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    team
FROM users
WHERE email = 'samward@gmail.com';

-- 2. Check if Sam Ward has any notifications
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.is_read,
    n.created_at,
    sender.first_name || ' ' || sender.last_name as sender_name,
    sender.role as sender_role
FROM notifications n
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE n.recipient_id = (
    SELECT id FROM users WHERE email = 'samward@gmail.com'
)
ORDER BY n.created_at DESC;

-- 3. Check if Sam Ward has any work readiness assignments
SELECT 
    a.id,
    a.assigned_date,
    a.due_time,
    a.status,
    a.notes,
    a.notification_sent,
    a.notification_sent_at,
    a.created_at,
    tl.first_name || ' ' || tl.last_name as team_leader_name,
    tl.email as team_leader_email
FROM work_readiness_assignments a
LEFT JOIN users tl ON a.team_leader_id = tl.id
WHERE a.worker_id = (
    SELECT id FROM users WHERE email = 'samward@gmail.com'
)
ORDER BY a.created_at DESC;

-- 4. MANUALLY CREATE NOTIFICATION if missing
-- Replace {WORKER_ID} and {TEAM_LEADER_ID} with actual IDs from queries above

-- Get IDs first
DO $$
DECLARE
    v_worker_id UUID;
    v_team_leader_id UUID;
    v_assignment_id UUID;
    v_due_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get Sam Ward's ID
    SELECT id INTO v_worker_id
    FROM users
    WHERE email = 'samward@gmail.com';
    
    -- Get latest assignment for Sam Ward
    SELECT 
        a.id,
        a.team_leader_id,
        a.due_time
    INTO 
        v_assignment_id,
        v_team_leader_id,
        v_due_time
    FROM work_readiness_assignments a
    WHERE a.worker_id = v_worker_id
    ORDER BY a.created_at DESC
    LIMIT 1;
    
    -- Check if notification exists for this assignment
    IF NOT EXISTS (
        SELECT 1 
        FROM notifications 
        WHERE recipient_id = v_worker_id 
        AND metadata->>'assignment_id' = v_assignment_id::TEXT
    ) THEN
        -- Create notification
        INSERT INTO notifications (
            recipient_id,
            sender_id,
            type,
            title,
            message,
            priority,
            metadata
        ) VALUES (
            v_worker_id,
            v_team_leader_id,
            'work_readiness_assignment',
            'New Work Readiness Assignment',
            'You have been assigned to complete a work readiness assessment. Due within 24 hours (' || v_due_time::TEXT || ').',
            'high',
            jsonb_build_object(
                'assignment_id', v_assignment_id,
                'due_time', v_due_time,
                'entity_type', 'work_readiness_assignments',
                'entity_id', v_assignment_id
            )
        );
        
        -- Update assignment to mark notification as sent
        UPDATE work_readiness_assignments
        SET 
            notification_sent = true,
            notification_sent_at = NOW()
        WHERE id = v_assignment_id;
        
        RAISE NOTICE '✅ Notification created for Sam Ward!';
    ELSE
        RAISE NOTICE '⚠️ Notification already exists for this assignment';
    END IF;
END $$;

-- 5. Verify notification was created
SELECT 
    'Notification Check' as check_type,
    COUNT(*) as notification_count
FROM notifications
WHERE recipient_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
AND type = 'work_readiness_assignment';

-- 6. Check RLS policies on notifications table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 7. If still not showing, temporarily disable RLS for testing
-- UNCOMMENT BELOW TO TEST (BE CAREFUL!)
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 8. Check if notifications page is querying correctly
-- This is what the frontend should be fetching
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.is_read,
    n.created_at,
    n.metadata->>'entity_type' as related_entity_type,
    n.metadata->>'entity_id' as related_entity_id,
    sender.first_name || ' ' || sender.last_name as sender_name
FROM notifications n
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE n.recipient_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
AND n.is_read = false
ORDER BY n.created_at DESC;

-- 9. Summary
SELECT 
    'Summary' as report,
    (SELECT COUNT(*) FROM work_readiness_assignments WHERE worker_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')) as total_assignments,
    (SELECT COUNT(*) FROM notifications WHERE recipient_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')) as total_notifications,
    (SELECT COUNT(*) FROM notifications WHERE recipient_id = (SELECT id FROM users WHERE email = 'samward@gmail.com') AND is_read = false) as unread_notifications;
