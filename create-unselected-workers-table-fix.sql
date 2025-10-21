-- Create table for tracking unselected workers with reasons
-- This table stores reasons why team members are not selected for work readiness assignments

CREATE TABLE IF NOT EXISTS unselected_workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('sick', 'on_leave_rdo', 'transferred', 'injured_medical', 'not_rostered')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate entries for same team leader and worker
    UNIQUE(team_leader_id, worker_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unselected_workers_team_leader ON unselected_workers(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_unselected_workers_worker ON unselected_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_unselected_workers_reason ON unselected_workers(reason);
CREATE INDEX IF NOT EXISTS idx_unselected_workers_date ON unselected_workers(assignment_date);

-- Add RLS policies
ALTER TABLE unselected_workers ENABLE ROW LEVEL SECURITY;

-- Policy for team leaders to see their own unselected workers
CREATE POLICY "Team leaders can view their unselected workers" ON unselected_workers
    FOR SELECT USING (team_leader_id = auth.uid());

-- Policy for team leaders to insert their unselected workers
CREATE POLICY "Team leaders can insert unselected workers" ON unselected_workers
    FOR INSERT WITH CHECK (team_leader_id = auth.uid());

-- Policy for team leaders to update their unselected workers
CREATE POLICY "Team leaders can update unselected workers" ON unselected_workers
    FOR UPDATE USING (team_leader_id = auth.uid());

-- Policy for team leaders to delete their unselected workers
CREATE POLICY "Team leaders can delete unselected workers" ON unselected_workers
    FOR DELETE USING (team_leader_id = auth.uid());

-- Policy for admins to see all unselected workers
CREATE POLICY "Admins can view all unselected workers" ON unselected_workers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_unselected_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_unselected_workers_updated_at ON unselected_workers;

-- Create the trigger
CREATE TRIGGER trigger_update_unselected_workers_updated_at
    BEFORE UPDATE ON unselected_workers
    FOR EACH ROW
    EXECUTE FUNCTION update_unselected_workers_updated_at();

-- Add comments for documentation
COMMENT ON TABLE unselected_workers IS 'Tracks workers who were not selected for work readiness assignments with reasons';
COMMENT ON COLUMN unselected_workers.reason IS 'Reason for not selecting worker: sick, on_leave_rdo, transferred, injured_medical, not_rostered';
COMMENT ON COLUMN unselected_workers.assignment_date IS 'Date when the assignment was created (for tracking purposes)';
COMMENT ON COLUMN unselected_workers.notes IS 'Additional notes or details about why the worker was not selected';

-- Test the table by inserting a sample record (optional)
-- INSERT INTO unselected_workers (team_leader_id, worker_id, reason, notes) 
-- VALUES (
--     (SELECT id FROM users WHERE role = 'team_leader' LIMIT 1),
--     (SELECT id FROM users WHERE role = 'worker' LIMIT 1),
--     'not_rostered',
--     'Test record - can be deleted'
-- );

-- Verify the table was created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'unselected_workers'
ORDER BY ordinal_position;



