-- Create a proper rehabilitation plan with complete exercises for samward
-- Run this in Supabase SQL Editor

-- First, get samward's IDs
DO $$
DECLARE
    v_samward_id UUID;
    v_case_id UUID;
    v_clinician_id UUID;
BEGIN
    -- Get samward's user ID
    SELECT id INTO v_samward_id FROM users WHERE email = 'samward@gmail.com';
    
    -- Get a case assigned to samward
    SELECT id INTO v_case_id FROM cases WHERE worker_id = v_samward_id LIMIT 1;
    
    -- Get a clinician ID (any clinician)
    SELECT id INTO v_clinician_id FROM users WHERE role = 'clinician' LIMIT 1;
    
    -- Delete existing plans for samward to avoid duplicates
    DELETE FROM rehabilitation_plans WHERE worker_id = v_samward_id;
    
    -- Insert a complete rehabilitation plan with proper exercises
    INSERT INTO rehabilitation_plans (
        case_id,
        worker_id,
        clinician_id,
        plan_name,
        plan_description,
        status,
        exercises
    ) VALUES (
        v_case_id,
        v_samward_id,
        v_clinician_id,
        'Spine & Hips Recovery Plan',
        'Daily recovery exercises to strengthen spine and hips',
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
                "instructions": "Relax your back and shoulders. Breathe deeply.",
                "videoUrl": "",
                "order": 1
            },
            {
                "name": "Hip Circles",
                "repetitions": "10 circles each direction",
                "instructions": "Stand with hands on hips. Make slow, controlled circles.",
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
                "name": "Knee to Chest Stretch",
                "repetitions": "Hold 20 seconds each leg",
                "instructions": "Pull knee gently to chest. Feel the stretch in lower back.",
                "videoUrl": "",
                "order": 4
            }
        ]'::jsonb
    );
    
    RAISE NOTICE 'Rehabilitation plan created successfully for samward!';
END $$;

-- Verify the created plan
SELECT 
    rp.id,
    rp.plan_name,
    rp.plan_description,
    rp.status,
    jsonb_array_length(rp.exercises) as exercise_count,
    rp.exercises,
    w.email as worker_email,
    c.email as clinician_email
FROM rehabilitation_plans rp
JOIN users w ON rp.worker_id = w.id
LEFT JOIN users c ON rp.clinician_id = c.id
WHERE w.email = 'samward@gmail.com';









