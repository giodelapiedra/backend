-- Reset Progress Data for Existing Rehabilitation Plans
-- Run this in Supabase SQL Editor

-- 1. Check current rehabilitation plans and their progress
SELECT 
    rp.id,
    rp.plan_name,
    rp.status,
    rp.duration,
    rp.daily_completions,
    rp.progress_stats,
    rp.created_at,
    c.case_number,
    w.first_name as worker_name
FROM rehabilitation_plans rp
LEFT JOIN cases c ON rp.case_id = c.id
LEFT JOIN users w ON rp.worker_id = w.id
WHERE w.email = 'samward@gmail.com'
ORDER BY rp.created_at DESC;

-- 2. Reset progress data for samward's rehabilitation plans
UPDATE rehabilitation_plans 
SET 
    daily_completions = '[]'::jsonb,
    progress_stats = jsonb_build_object(
        'totalDays', duration,
        'completedDays', 0,
        'skippedDays', 0,
        'consecutiveCompletedDays', 0,
        'consecutiveSkippedDays', 0
    ),
    updated_at = NOW()
WHERE worker_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
AND status = 'active';

-- 3. Check if the update worked
SELECT 
    rp.id,
    rp.plan_name,
    rp.status,
    rp.duration,
    rp.daily_completions,
    rp.progress_stats,
    rp.updated_at,
    c.case_number,
    w.first_name as worker_name
FROM rehabilitation_plans rp
LEFT JOIN cases c ON rp.case_id = c.id
LEFT JOIN users w ON rp.worker_id = w.id
WHERE w.email = 'samward@gmail.com'
ORDER BY rp.created_at DESC;

-- 4. Test creating a notification with correct day count
INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read
) VALUES (
    (SELECT id FROM users WHERE role = 'clinician' LIMIT 1),
    (SELECT id FROM users WHERE email = 'samward@gmail.com' LIMIT 1),
    'rehab_plan_daily_completed',
    'Daily Rehabilitation Plan Completed - RESET',
    'Samward has completed Day 1 of their rehabilitation plan "Recovery Plan" for case CASE-2025-1760977954380. Progress: 1/7 days completed.',
    'medium',
    false
);

-- 5. Check recent notifications
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
WHERE n.type = 'rehab_plan_daily_completed'
ORDER BY n.created_at DESC
LIMIT 5;
