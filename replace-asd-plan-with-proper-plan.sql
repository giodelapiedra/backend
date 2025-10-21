-- Replace the "asd" plan with proper rehabilitation plan
-- Run this in Supabase SQL Editor

-- Get samward's user ID and case ID
WITH samward_info AS (
    SELECT 
        u.id as worker_id,
        c.id as case_id,
        (SELECT id FROM users WHERE role = 'clinician' LIMIT 1) as clinician_id
    FROM users u
    LEFT JOIN cases c ON c.worker_id = u.id
    WHERE u.email = 'samward@gmail.com'
    LIMIT 1
)
-- Delete existing plans for samward
DELETE FROM rehabilitation_plans 
WHERE worker_id = (SELECT worker_id FROM samward_info);

-- Insert proper rehabilitation plan
INSERT INTO rehabilitation_plans (
    case_id,
    worker_id,
    clinician_id,
    plan_name,
    plan_description,
    status,
    exercises
)
SELECT 
    case_id,
    worker_id,
    clinician_id,
    'Spine & Hips Primer',
    '6 minutes • No equipment needed',
    'active',
    '[
        {
            "name": "Cat-Cow",
            "repetitions": "10 reps",
            "instructions": "Breathe with each move—loosen the chain before the lift",
            "videoUrl": "",
            "order": 0
        },
        {
            "name": "Child''s Pose",
            "repetitions": "Hold for 30 seconds",
            "instructions": "Relax your back and shoulders. Breathe deeply and stretch.",
            "videoUrl": "",
            "order": 1
        },
        {
            "name": "Hip Circles",
            "repetitions": "10 circles each direction",
            "instructions": "Stand with hands on hips. Make slow controlled circles.",
            "videoUrl": "",
            "order": 2
        },
        {
            "name": "Pelvic Tilts",
            "repetitions": "15 reps",
            "instructions": "Lie on back with knees bent. Gently tilt pelvis up and down.",
            "videoUrl": "",
            "order": 3
        },
        {
            "name": "Knee to Chest",
            "repetitions": "Hold 20 seconds each leg",
            "instructions": "Pull knee gently to chest. Feel the stretch in lower back.",
            "videoUrl": "",
            "order": 4
        }
    ]'::jsonb
FROM samward_info;

-- Verify the new plan
SELECT 
    rp.plan_name,
    rp.plan_description,
    jsonb_array_length(rp.exercises) as exercise_count,
    rp.exercises,
    w.email as worker_email
FROM rehabilitation_plans rp
JOIN users w ON rp.worker_id = w.id
WHERE w.email = 'samward@gmail.com';

