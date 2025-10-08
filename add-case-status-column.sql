-- Add case_status column to unselected_workers table
ALTER TABLE unselected_workers 
ADD COLUMN IF NOT EXISTS case_status VARCHAR(20) DEFAULT 'open' 
CHECK (case_status IN ('open', 'in_progress', 'closed'));

-- Update existing records to have 'open' status
UPDATE unselected_workers 
SET case_status = 'open' 
WHERE case_status IS NULL;

-- Create index for case_status
CREATE INDEX IF NOT EXISTS idx_unselected_workers_case_status ON unselected_workers(case_status);

-- Add comment for documentation
COMMENT ON COLUMN unselected_workers.case_status IS 'Status of the unselected worker case: open, in_progress, closed';
