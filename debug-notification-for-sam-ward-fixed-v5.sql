-- =============================================
-- DEBUG: Check Sam Ward's Notifications
-- =============================================

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
        -- Create notification with correct type
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
            'case_assigned',  -- Using case_assigned type
            'New Work Readiness Assessment',
            'You have been assigned to complete a work readiness assessment. Due within 24 hours (' || v_due_time::TEXT || ').',
            'high',
            jsonb_build_object(
                'assignment_id', v_assignment_id,
                'due_time', v_due_time,
                'task_type', 'work_readiness'
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

-- Check if notification was created
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.is_read,
    n.created_at,
    n.metadata,
    sender.first_name || ' ' || sender.last_name as sender_name
FROM notifications n
LEFT JOIN users sender ON n.sender_id = sender.id
WHERE n.recipient_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
ORDER BY n.created_at DESC
LIMIT 5;
