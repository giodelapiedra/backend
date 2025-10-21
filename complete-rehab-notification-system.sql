-- Complete Rehabilitation Plan Notification System
-- Run this in Supabase SQL Editor

-- 1. First, remove the constraint to allow notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS check_notification_type;

-- 2. Test creating assignment notification for samward@gmail.com
INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read
) VALUES (
    (SELECT id FROM users WHERE email = 'samward@gmail.com' LIMIT 1),
    (SELECT id FROM users WHERE role = 'clinician' LIMIT 1),
    'rehab_plan_assigned',
    'New Rehabilitation Plan Assigned',
    'Your clinician has assigned you a new rehabilitation plan. Please review and start your exercises.',
    'high',
    false
);

-- 3. Create trigger function for completion notifications
CREATE OR REPLACE FUNCTION notify_clinician_on_rehab_plan_completion()
RETURNS TRIGGER AS $$
DECLARE
    case_data RECORD;
    worker_data RECORD;
    clinician_data RECORD;
BEGIN
    -- Check if the rehabilitation plan status changed to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Get case information
        SELECT 
            c.case_number,
            c.clinician_id
        INTO case_data
        FROM cases c
        WHERE c.id = NEW.case_id;
        
        -- Get worker information
        SELECT 
            u.first_name,
            u.last_name
        INTO worker_data
        FROM users u
        WHERE u.id = NEW.worker_id;
        
        -- Get clinician information
        SELECT 
            u.first_name,
            u.last_name
        INTO clinician_data
        FROM users u
        WHERE u.id = NEW.clinician_id;
        
        -- Create notification for the clinician
        INSERT INTO notifications (
            recipient_id,
            sender_id,
            type,
            title,
            message,
            priority,
            is_read
        ) VALUES (
            NEW.clinician_id,
            NEW.worker_id,
            'rehab_plan_completed',
            'Rehabilitation Plan Completed',
            COALESCE(worker_data.first_name, 'Worker') || ' ' || COALESCE(worker_data.last_name, '') || 
            ' has completed their rehabilitation plan "' || COALESCE(NEW.plan_name, 'Recovery Plan') || 
            '" for case ' || COALESCE(case_data.case_number, 'Unknown') || 
            '. Please review their progress and consider next steps.',
            'medium',
            false
        );
        
        -- Log the notification
        RAISE NOTICE '✅ Notification sent to clinician % for completed rehabilitation plan %', NEW.clinician_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on rehabilitation_plans table
DROP TRIGGER IF EXISTS trigger_notify_clinician_on_rehab_plan_completion ON rehabilitation_plans;
CREATE TRIGGER trigger_notify_clinician_on_rehab_plan_completion
    AFTER UPDATE ON rehabilitation_plans
    FOR EACH ROW
    EXECUTE FUNCTION notify_clinician_on_rehab_plan_completion();

-- 5. Test the trigger by updating a rehabilitation plan to completed
-- First, let's see what rehabilitation plans exist
SELECT 
    rp.id,
    rp.plan_name,
    rp.status,
    rp.clinician_id,
    rp.worker_id,
    c.case_number,
    w.first_name as worker_name,
    cl.first_name as clinician_name
FROM rehabilitation_plans rp
LEFT JOIN cases c ON rp.case_id = c.id
LEFT JOIN users w ON rp.worker_id = w.id
LEFT JOIN users cl ON rp.clinician_id = cl.id
ORDER BY rp.created_at DESC
LIMIT 5;

-- 6. Test updating a rehabilitation plan to completed (replace with actual plan ID)
-- UPDATE rehabilitation_plans 
-- SET status = 'completed', updated_at = NOW()
-- WHERE id = 'your-plan-id-here';

-- 7. Check if notifications were created
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.created_at,
    r.email as recipient_email,
    s.email as sender_email
FROM notifications n
LEFT JOIN users r ON n.recipient_id = r.id
LEFT JOIN users s ON n.sender_id = s.id
WHERE n.type IN ('rehab_plan_assigned', 'rehab_plan_completed')
ORDER BY n.created_at DESC;

-- 8. Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_clinician_on_rehab_plan_completion';
