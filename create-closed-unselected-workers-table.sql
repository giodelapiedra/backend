-- Create table for storing closed unselected worker cases
-- This table will store historical records of closed cases

CREATE TABLE IF NOT EXISTS closed_unselected_workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_case_id UUID NOT NULL, -- Reference to the original case
    team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_date DATE NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('sick', 'on_leave_rdo', 'transferred', 'injured_medical', 'not_rostered')),
    notes TEXT,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_by UUID REFERENCES users(id), -- Who closed the case
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_closed_unselected_workers_team_leader ON closed_unselected_workers(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_closed_unselected_workers_worker ON closed_unselected_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_closed_unselected_workers_reason ON closed_unselected_workers(reason);
CREATE INDEX IF NOT EXISTS idx_closed_unselected_workers_date ON closed_unselected_workers(assignment_date);
CREATE INDEX IF NOT EXISTS idx_closed_unselected_workers_closed_at ON closed_unselected_workers(closed_at);
CREATE INDEX IF NOT EXISTS idx_closed_unselected_workers_original_case ON closed_unselected_workers(original_case_id);

-- Add RLS policies
ALTER TABLE closed_unselected_workers ENABLE ROW LEVEL SECURITY;

-- Policy for team leaders to see their own closed cases
CREATE POLICY "Team leaders can view their closed unselected workers" ON closed_unselected_workers
    FOR SELECT USING (team_leader_id = auth.uid());

-- Policy for team leaders to insert their closed unselected workers
CREATE POLICY "Team leaders can insert their closed unselected workers" ON closed_unselected_workers
    FOR INSERT WITH CHECK (team_leader_id = auth.uid());

-- Policy for admins to see all closed unselected workers
CREATE POLICY "Admins can view all closed unselected workers" ON closed_unselected_workers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_closed_unselected_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_closed_unselected_workers_updated_at ON closed_unselected_workers;

-- Create the trigger
CREATE TRIGGER trigger_update_closed_unselected_workers_updated_at
    BEFORE UPDATE ON closed_unselected_workers
    FOR EACH ROW
    EXECUTE FUNCTION update_closed_unselected_workers_updated_at();

-- Add comments for documentation
COMMENT ON TABLE closed_unselected_workers IS 'Historical records of closed unselected worker cases';
COMMENT ON COLUMN closed_unselected_workers.original_case_id IS 'Reference to the original case in unselected_workers table';
COMMENT ON COLUMN closed_unselected_workers.reason IS 'Reason for not selecting worker: sick, on_leave_rdo, transferred, injured_medical, not_rostered';
COMMENT ON COLUMN closed_unselected_workers.assignment_date IS 'Date when the original assignment was created';
COMMENT ON COLUMN closed_unselected_workers.notes IS 'Additional notes or details about why the worker was not selected';
COMMENT ON COLUMN closed_unselected_workers.closed_at IS 'When the case was closed';
COMMENT ON COLUMN closed_unselected_workers.closed_by IS 'User who closed the case';

-- Verify the table was created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'closed_unselected_workers'
ORDER BY ordinal_position;
