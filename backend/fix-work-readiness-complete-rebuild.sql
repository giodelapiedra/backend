-- Complete Fix for Work Readiness "progress_percentage" Error
-- Run this script in your Supabase SQL editor to completely resolve the issue

-- Step 1: Check current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'work_readiness' 
ORDER BY ordinal_position;

-- Step 2: Check for any triggers that might be causing the issue
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'work_readiness';

-- Step 3: Check for any functions that might reference progress_percentage
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%progress_percentage%';

-- Step 4: Drop and recreate the work_readiness table with correct structure
-- WARNING: This will delete all existing data in work_readiness table
DROP TABLE IF EXISTS work_readiness CASCADE;

-- Create the work_readiness table with correct structure
CREATE TABLE work_readiness (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_leader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    team TEXT,
    fatigue_level INTEGER NOT NULL CHECK (fatigue_level >= 0 AND fatigue_level <= 10),
    pain_discomfort TEXT NOT NULL CHECK (pain_discomfort IN ('yes', 'no')),
    pain_areas TEXT[],
    readiness_level TEXT NOT NULL CHECK (readiness_level IN ('fit', 'minor', 'not_fit')),
    mood TEXT NOT NULL CHECK (mood IN ('excellent', 'good', 'okay', 'poor', 'terrible')),
    notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'followed_up')),
    reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    follow_up_reason TEXT,
    follow_up_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_readiness_worker_id ON work_readiness(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_team_leader_id ON work_readiness(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_submitted_at ON work_readiness(submitted_at);
CREATE INDEX IF NOT EXISTS idx_work_readiness_status ON work_readiness(status);
CREATE INDEX IF NOT EXISTS idx_work_readiness_team ON work_readiness(team);

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE work_readiness ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
-- Workers can view and insert their own work readiness data
CREATE POLICY "Workers can view own work readiness" ON work_readiness
    FOR SELECT USING (auth.uid() = worker_id);

CREATE POLICY "Workers can insert own work readiness" ON work_readiness
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- Team leaders can view work readiness data for their team
CREATE POLICY "Team leaders can view team work readiness" ON work_readiness
    FOR SELECT USING (
        team_leader_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'site_supervisor')
        )
    );

-- Team leaders can update work readiness status
CREATE POLICY "Team leaders can update work readiness status" ON work_readiness
    FOR UPDATE USING (
        team_leader_id = auth.uid() OR
        EXISTS(
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'site_supervisor')
        )
    );

-- Step 8: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_work_readiness_updated_at 
    BEFORE UPDATE ON work_readiness
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Test the table with sample data
-- Insert a test record to verify everything works
INSERT INTO work_readiness (
    worker_id, 
    team_leader_id, 
    team, 
    fatigue_level, 
    pain_discomfort, 
    readiness_level, 
    mood,
    notes
) VALUES (
    (SELECT id FROM users WHERE role = 'worker' LIMIT 1), -- Get any worker ID
    (SELECT id FROM users WHERE role = 'team_leader' LIMIT 1), -- Get any team leader ID
    'TEST_TEAM',
    5, -- fatigue level 0-10
    'no',
    'fit',
    'good',
    'Test submission'
);

-- Step 10: Verify the test insert worked
SELECT * FROM work_readiness WHERE team = 'TEST_TEAM';

-- Step 11: Clean up test data
DELETE FROM work_readiness WHERE team = 'TEST_TEAM';

-- Step 12: Verify all policies are created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'work_readiness'
ORDER BY policyname;

-- Step 13: Final verification - check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'work_readiness' 
ORDER BY ordinal_position;

-- SUCCESS MESSAGE
SELECT 'Work readiness table has been successfully recreated and configured!' as status;




