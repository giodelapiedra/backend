-- Add clinician_id column to cases table if it doesn't exist
-- This script will safely add the column without affecting existing data

-- First, check if the column already exists
DO $$
BEGIN
    -- Check if clinician_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cases' 
        AND column_name = 'clinician_id'
    ) THEN
        -- Add the clinician_id column
        ALTER TABLE cases 
        ADD COLUMN clinician_id UUID REFERENCES users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'clinician_id column added to cases table';
    ELSE
        RAISE NOTICE 'clinician_id column already exists in cases table';
    END IF;
    
    -- Check if priority column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cases' 
        AND column_name = 'priority'
    ) THEN
        -- Add the priority column
        ALTER TABLE cases 
        ADD COLUMN priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
        
        RAISE NOTICE 'priority column added to cases table';
    ELSE
        RAISE NOTICE 'priority column already exists in cases table';
    END IF;
    
    -- Check if updated_at column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cases' 
        AND column_name = 'updated_at'
    ) THEN
        -- Add the updated_at column
        ALTER TABLE cases 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        RAISE NOTICE 'updated_at column added to cases table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in cases table';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_clinician_id ON cases(clinician_id);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);

-- Add comments to document the columns
COMMENT ON COLUMN cases.clinician_id IS 'ID of the clinician assigned to this case. NULL if no clinician is assigned yet.';
COMMENT ON COLUMN cases.priority IS 'Priority level of the case: low, medium, high, or urgent.';

-- Create or replace function to update updated_at timestamp
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

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name IN ('clinician_id', 'priority')
ORDER BY column_name;

-- Show the updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY ordinal_position;
