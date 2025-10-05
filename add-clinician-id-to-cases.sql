-- Add clinician_id column to cases table
-- This column will store the ID of the clinician assigned to each case

-- Add the clinician_id column to the cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add the priority column to the cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Create indexes for better performance when querying by clinician_id and priority
CREATE INDEX IF NOT EXISTS idx_cases_clinician_id ON cases(clinician_id);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);

-- Add comments to document the columns
COMMENT ON COLUMN cases.clinician_id IS 'ID of the clinician assigned to this case. NULL if no clinician is assigned yet.';
COMMENT ON COLUMN cases.priority IS 'Priority level of the case: low, medium, high, or urgent.';

-- Update the updated_at timestamp when clinician_id changes
CREATE OR REPLACE FUNCTION update_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at when clinician_id changes
DROP TRIGGER IF EXISTS trigger_update_cases_updated_at ON cases;
CREATE TRIGGER trigger_update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_cases_updated_at();

-- Grant permissions
GRANT ALL ON cases TO authenticated;
GRANT ALL ON cases TO service_role;

-- Show the updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY ordinal_position;
