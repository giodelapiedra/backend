-- Check if rehabilitation_plans table exists and create it
-- Run this in Supabase SQL Editor

-- Drop table if exists (for clean slate)
DROP TABLE IF EXISTS rehabilitation_plans CASCADE;

-- Create rehabilitation_plans table
CREATE TABLE rehabilitation_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships (REAL columns)
  case_id UUID NOT NULL REFERENCES cases(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  clinician_id UUID NOT NULL REFERENCES users(id),
  
  -- Plan details (optional with defaults)
  plan_name VARCHAR(200) DEFAULT 'Recovery Plan',
  plan_description TEXT DEFAULT 'Daily recovery exercises and activities',
  status VARCHAR(15) DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  
  -- Dates
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Plan data (JSONB for complex structures)
  exercises JSONB DEFAULT '[]',
  daily_completions JSONB DEFAULT '[]',
  progress_stats JSONB DEFAULT '{}',
  alerts JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_rehab_plans_case ON rehabilitation_plans(case_id);
CREATE INDEX idx_rehab_plans_worker ON rehabilitation_plans(worker_id);
CREATE INDEX idx_rehab_plans_clinician ON rehabilitation_plans(clinician_id);
CREATE INDEX idx_rehab_plans_status ON rehabilitation_plans(status);

-- Enable Row Level Security
ALTER TABLE rehabilitation_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Clinicians can view plans they created
CREATE POLICY "Clinicians can view their plans" ON rehabilitation_plans
  FOR SELECT
  USING (clinician_id = auth.uid());

-- Clinicians can insert plans
CREATE POLICY "Clinicians can create plans" ON rehabilitation_plans
  FOR INSERT
  WITH CHECK (clinician_id = auth.uid());

-- Clinicians can update their plans
CREATE POLICY "Clinicians can update their plans" ON rehabilitation_plans
  FOR UPDATE
  USING (clinician_id = auth.uid());

-- Workers can view their own plans
CREATE POLICY "Workers can view their plans" ON rehabilitation_plans
  FOR SELECT
  USING (worker_id = auth.uid());

-- Workers can update their own plans (for progress tracking)
CREATE POLICY "Workers can update their plans" ON rehabilitation_plans
  FOR UPDATE
  USING (worker_id = auth.uid());

-- Case managers can view all plans
CREATE POLICY "Case managers can view plans" ON rehabilitation_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'case_manager'
    )
  );

COMMENT ON TABLE rehabilitation_plans IS 'Stores rehabilitation plans created by clinicians for workers';

