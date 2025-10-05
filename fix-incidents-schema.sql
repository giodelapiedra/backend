-- Fix incidents table schema to match expected structure
-- Add missing columns and update existing ones

-- First, let's check what columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'incidents' 
-- ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add incident_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'incident_number') THEN
        ALTER TABLE incidents ADD COLUMN incident_number VARCHAR(50) UNIQUE;
    END IF;
    
    -- Add incident_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'incident_date') THEN
        ALTER TABLE incidents ADD COLUMN incident_date TIMESTAMPTZ;
    END IF;
    
    -- Add worker_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'worker_id') THEN
        ALTER TABLE incidents ADD COLUMN worker_id UUID REFERENCES users(id);
    END IF;
    
    -- Add employer_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'employer_id') THEN
        ALTER TABLE incidents ADD COLUMN employer_id UUID REFERENCES users(id);
    END IF;
    
    -- Add report_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'report_date') THEN
        ALTER TABLE incidents ADD COLUMN report_date TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'status') THEN
        ALTER TABLE incidents ADD COLUMN status VARCHAR(15) DEFAULT 'reported' 
            CHECK (status IN ('reported', 'investigating', 'investigated', 'closed'));
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'updated_at') THEN
        ALTER TABLE incidents ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Update existing records with default values
UPDATE incidents 
SET 
    incident_date = COALESCE(incident_date, created_at),
    report_date = COALESCE(report_date, created_at),
    status = COALESCE(status, 'reported'),
    updated_at = COALESCE(updated_at, created_at)
WHERE incident_date IS NULL OR report_date IS NULL OR status IS NULL OR updated_at IS NULL;

-- Generate incident numbers for existing records that don't have them
UPDATE incidents 
SET incident_number = 'INC-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 6, '0')
WHERE incident_number IS NULL;

-- Set worker_id and employer_id to reported_by for existing records (temporary fix)
UPDATE incidents 
SET 
    worker_id = reported_by,
    employer_id = reported_by
WHERE worker_id IS NULL OR employer_id IS NULL;

-- Add constraints and indexes
ALTER TABLE incidents ALTER COLUMN incident_date SET NOT NULL;
ALTER TABLE incidents ALTER COLUMN worker_id SET NOT NULL;
ALTER TABLE incidents ALTER COLUMN employer_id SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_incidents_worker_id ON incidents(worker_id);
CREATE INDEX IF NOT EXISTS idx_incidents_employer_id ON incidents(employer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_incidents_updated_at ON incidents;
CREATE TRIGGER trigger_update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_incidents_updated_at();

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'incidents' 
ORDER BY ordinal_position;




























