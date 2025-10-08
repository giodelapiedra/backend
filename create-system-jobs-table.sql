-- Create system_jobs table for idempotency tracking
-- This table tracks scheduled jobs to prevent duplicate processing

CREATE TABLE IF NOT EXISTS system_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  processed_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_jobs_job_id ON system_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_system_jobs_created_at ON system_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_jobs_status ON system_jobs(status);

-- Enable Row Level Security (RLS)
ALTER TABLE system_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all for service role (backend)
CREATE POLICY "Enable all for service role" ON system_jobs
    FOR ALL USING (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_jobs_updated_at
    BEFORE UPDATE ON system_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_system_jobs_updated_at();

-- Add comment for documentation
COMMENT ON TABLE system_jobs IS 'Tracks scheduled system jobs for idempotency and monitoring';
COMMENT ON COLUMN system_jobs.job_id IS 'Unique identifier for the job instance (e.g., mark-overdue-2025-01-15)';
COMMENT ON COLUMN system_jobs.job_type IS 'Type of job (e.g., mark_overdue_assignments)';
COMMENT ON COLUMN system_jobs.processed_count IS 'Number of records processed by this job';

-- Success message
SELECT 'system_jobs table created successfully!' as message;
