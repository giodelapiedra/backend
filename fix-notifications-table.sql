-- Fix notifications table by adding missing recipient_id column
-- This script will safely add the missing column without affecting existing data

-- Check if notifications table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) THEN
        RAISE NOTICE 'Creating notifications table...';
        
        -- Create the complete notifications table
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
            type VARCHAR(50) NOT NULL CHECK (type IN ('case_assignment', 'case_update', 'appointment_reminder', 'general')),
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            related_case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
            related_incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE
        );
        
        RAISE NOTICE 'Notifications table created successfully';
    ELSE
        RAISE NOTICE 'Notifications table already exists';
        
        -- Check if recipient_id column exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'recipient_id'
        ) THEN
            RAISE NOTICE 'Adding recipient_id column...';
            
            -- Add the recipient_id column
            ALTER TABLE notifications 
            ADD COLUMN recipient_id UUID REFERENCES users(id) ON DELETE CASCADE;
            
            -- Update existing records (if any) - you may need to adjust this
            -- UPDATE notifications SET recipient_id = user_id WHERE recipient_id IS NULL;
            
            -- Make the column NOT NULL after updating existing records
            -- ALTER TABLE notifications ALTER COLUMN recipient_id SET NOT NULL;
            
            RAISE NOTICE 'recipient_id column added successfully';
        ELSE
            RAISE NOTICE 'recipient_id column already exists';
        END IF;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
