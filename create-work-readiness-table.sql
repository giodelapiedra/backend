-- Complete work_readiness table creation
-- Run this in your Supabase SQL editor

-- Drop the existing table if it exists (this will remove all data)
DROP TABLE IF EXISTS public.work_readiness CASCADE;

-- Create the work_readiness table with correct structure
CREATE TABLE public.work_readiness (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    team_leader_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    team TEXT,
    fatigue_level INTEGER NOT NULL CHECK (fatigue_level >= 1 AND fatigue_level <= 5),
    pain_discomfort TEXT NOT NULL CHECK (pain_discomfort IN ('yes', 'no')),
    readiness_level TEXT NOT NULL CHECK (readiness_level IN ('fit', 'minor', 'not_fit')),
    mood TEXT NOT NULL CHECK (mood IN ('excellent', 'good', 'okay', 'poor', 'terrible')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'pending', 'reviewed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_readiness_worker_id ON public.work_readiness(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_team_leader_id ON public.work_readiness(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_work_readiness_submitted_at ON public.work_readiness(submitted_at);
CREATE INDEX IF NOT EXISTS idx_work_readiness_status ON public.work_readiness(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.work_readiness ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Workers can view and insert their own work readiness data
CREATE POLICY "Workers can view own work readiness" ON public.work_readiness
    FOR SELECT USING (auth.uid() = worker_id);

CREATE POLICY "Workers can insert own work readiness" ON public.work_readiness
    FOR INSERT WITH CHECK (auth.uid() = worker_id);

-- Team leaders can view work readiness data for their team members
CREATE POLICY "Team leaders can view team work readiness" ON public.work_readiness
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'team_leader'
            AND work_readiness.team_leader_id = users.id
        )
    );

-- Admins can view all work readiness data
CREATE POLICY "Admins can view all work readiness" ON public.work_readiness
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'work_readiness' 
AND table_schema = 'public'
ORDER BY ordinal_position;
