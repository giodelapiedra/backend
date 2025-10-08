-- Simple Work Readiness Assignments Table
-- Run this in Supabase SQL Editor

-- Drop existing table if any
DROP TABLE IF EXISTS public.work_readiness_assignments CASCADE;

-- Create the assignments table
CREATE TABLE public.work_readiness_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_leader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    team TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    work_readiness_id UUID REFERENCES public.work_readiness(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_team_leader FOREIGN KEY (team_leader_id) REFERENCES public.users(id),
    CONSTRAINT fk_worker FOREIGN KEY (worker_id) REFERENCES public.users(id)
);

-- Create indexes
CREATE INDEX idx_work_readiness_assignments_team_leader ON public.work_readiness_assignments(team_leader_id);
CREATE INDEX idx_work_readiness_assignments_worker ON public.work_readiness_assignments(worker_id);
CREATE INDEX idx_work_readiness_assignments_date ON public.work_readiness_assignments(assigned_date);
CREATE INDEX idx_work_readiness_assignments_status ON public.work_readiness_assignments(status);

-- Enable RLS
ALTER TABLE public.work_readiness_assignments ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "Enable all for service role" ON public.work_readiness_assignments
    FOR ALL USING (true);

-- Success message
SELECT 'Table created successfully!' as message;
