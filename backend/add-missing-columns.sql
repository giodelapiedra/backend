-- Add missing columns to cases table
-- This script will add clinician_id, priority, and updated_at columns

-- Add clinician_id column if it doesn't exist
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add priority column if it doesn't exist
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Add updated_at column if it doesn't exist
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_clinician_id ON cases(clinician_id);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updated_at);

-- Add comments to document the columns
COMMENT ON COLUMN cases.clinician_id IS 'ID of the clinician assigned to this case. NULL if no clinician is assigned yet.';
COMMENT ON COLUMN cases.priority IS 'Priority level of the case: low, medium, high, or urgent.';
COMMENT ON COLUMN cases.updated_at IS 'Timestamp when the case was last updated.';

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at when case changes
DROP TRIGGER IF EXISTS trigger_update_cases_updated_at ON cases;
CREATE TRIGGER trigger_update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_cases_updated_at();

-- Grant permissions
GRANT ALL ON cases TO authenticated;
GRANT ALL ON cases TO service_role;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name IN ('clinician_id', 'priority', 'updated_at')
ORDER BY column_name;

-- Show the complete table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY ordinal_position;
