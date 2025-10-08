-- Create table for tracking unselected workers with reasons
CREATE TABLE IF NOT EXISTS unselected_workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_date DATE NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('sick', 'on_leave_rdo', 'transferred', 'injured_medical', 'not_rostered')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unselected_workers_team_leader_date ON unselected_workers(team_leader_id, assignment_date);
CREATE INDEX IF NOT EXISTS idx_unselected_workers_worker_date ON unselected_workers(worker_id, assignment_date);
CREATE INDEX IF NOT EXISTS idx_unselected_workers_reason ON unselected_workers(reason);

-- Add RLS policies
ALTER TABLE unselected_workers ENABLE ROW LEVEL SECURITY;

-- Policy for team leaders to see their own unselected workers
CREATE POLICY "Team leaders can view their unselected workers" ON unselected_workers
    FOR SELECT USING (team_leader_id = auth.uid());

-- Policy for team leaders to insert their unselected workers
CREATE POLICY "Team leaders can insert unselected workers" ON unselected_workers
    FOR INSERT WITH CHECK (team_leader_id = auth.uid());

-- Policy for team leaders to update their unselected workers
CREATE POLICY "Team leaders can update their unselected workers" ON unselected_workers
    FOR UPDATE USING (team_leader_id = auth.uid());

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

CREATE TRIGGER trigger_update_unselected_workers_updated_at
    BEFORE UPDATE ON unselected_workers
    FOR EACH ROW
    EXECUTE FUNCTION update_unselected_workers_updated_at();

-- Add comments for documentation
COMMENT ON TABLE unselected_workers IS 'Tracks workers who were not selected for work readiness assignments with reasons';
COMMENT ON COLUMN unselected_workers.reason IS 'Reason for not selecting worker: sick, on_leave_rdo, transferred, injured_medical, not_rostered';
COMMENT ON COLUMN unselected_workers.assignment_date IS 'Date when the assignment was created (for tracking purposes)';
