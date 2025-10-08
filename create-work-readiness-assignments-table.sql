-- Create work_readiness_assignments table
-- This table allows team leaders to assign work readiness submissions to specific workers

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.work_readiness_assignments CASCADE;

-- Create the assignments table
CREATE TABLE public.work_readiness_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_leader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_time TIME DEFAULT '09:00:00', -- Default due time is 9 AM
    team TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    work_readiness_id UUID REFERENCES public.work_readiness(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_team_leader ON public.work_readiness_assignments(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_worker ON public.work_readiness_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_date ON public.work_readiness_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_status ON public.work_readiness_assignments(status);
CREATE INDEX IF NOT EXISTS idx_work_readiness_assignments_team ON public.work_readiness_assignments(team);

-- Create unique constraint to prevent duplicate assignments for the same worker on the same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_worker_date_assignment 
ON public.work_readiness_assignments(worker_id, assigned_date) 
WHERE status != 'cancelled';

-- Enable Row Level Security (RLS)
ALTER TABLE public.work_readiness_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Team leaders can view assignments they created
CREATE POLICY "Team leaders can view own assignments" ON public.work_readiness_assignments
    FOR SELECT USING (
        auth.uid() = team_leader_id OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'site_supervisor')
        )
    );

-- Team leaders can create assignments for their team members
CREATE POLICY "Team leaders can create assignments" ON public.work_readiness_assignments
    FOR INSERT WITH CHECK (
        auth.uid() = team_leader_id OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'site_supervisor')
        )
    );

-- Team leaders can update their assignments
CREATE POLICY "Team leaders can update assignments" ON public.work_readiness_assignments
    FOR UPDATE USING (
        auth.uid() = team_leader_id OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'site_supervisor')
        )
    );

-- Team leaders can delete their assignments
CREATE POLICY "Team leaders can delete assignments" ON public.work_readiness_assignments
    FOR DELETE USING (
        auth.uid() = team_leader_id OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'site_supervisor')
        )
    );

-- Workers can view assignments assigned to them
CREATE POLICY "Workers can view own assignments" ON public.work_readiness_assignments
    FOR SELECT USING (auth.uid() = worker_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_work_readiness_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_work_readiness_assignments_updated_at 
    BEFORE UPDATE ON public.work_readiness_assignments
    FOR EACH ROW EXECUTE FUNCTION update_work_readiness_assignments_updated_at();

-- Create function to automatically mark overdue assignments
CREATE OR REPLACE FUNCTION mark_overdue_assignments()
RETURNS void AS $$
BEGIN
    UPDATE public.work_readiness_assignments
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'pending'
    AND assigned_date < CURRENT_DATE;
END;
$$ language 'plpgsql';

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'work_readiness_assignments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
SELECT 'Work readiness assignments table created successfully!' as status;
