-- Create notification when rehabilitation plan is completed
-- This trigger automatically notifies the clinician when a worker completes their rehabilitation plan
-- Run this in Supabase SQL Editor

-- Create function to handle rehabilitation plan completion notifications
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
            metadata,
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
            jsonb_build_object(
                'plan_id', NEW.id,
                'plan_name', COALESCE(NEW.plan_name, 'Recovery Plan'),
                'case_number', COALESCE(case_data.case_number, 'Unknown'),
                'worker_name', COALESCE(worker_data.first_name, 'Worker') || ' ' || COALESCE(worker_data.last_name, ''),
                'task_type', 'rehabilitation_plan'
            ),
            false
        );
        
        -- Log the notification
        RAISE NOTICE '✅ Notification sent to clinician % for completed rehabilitation plan %', NEW.clinician_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on rehabilitation_plans table
DROP TRIGGER IF EXISTS trigger_notify_clinician_on_rehab_plan_completion ON rehabilitation_plans;
CREATE TRIGGER trigger_notify_clinician_on_rehab_plan_completion
    AFTER UPDATE ON rehabilitation_plans
    FOR EACH ROW
    EXECUTE FUNCTION notify_clinician_on_rehab_plan_completion();

-- Test the trigger by checking current state
SELECT 
    c.id as case_id,
    c.case_number,
    c.status as case_status,
    rp.id as rehab_plan_id,
    rp.plan_name,
    rp.status as rehab_status,
    rp.clinician_id,
    rp.worker_id
FROM cases c
LEFT JOIN rehabilitation_plans rp ON c.id = rp.case_id
WHERE c.clinician_id IS NOT NULL
ORDER BY c.created_at DESC
LIMIT 10;

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_notify_clinician_on_rehab_plan_completion';
