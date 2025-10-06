-- Create notifications table with all required columns
-- This script will create the complete notifications table

-- Drop the table if it exists (be careful with this in production)
DROP TABLE IF EXISTS notifications CASCADE;

-- Create the notifications table
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

-- Create indexes for better performance
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_related_case_id ON notifications(related_case_id);
CREATE INDEX idx_notifications_related_incident_id ON notifications(related_incident_id);

-- Add comments to document the table and columns
COMMENT ON TABLE notifications IS 'Table to store notifications for users';
COMMENT ON COLUMN notifications.recipient_id IS 'ID of the user who will receive the notification';
COMMENT ON COLUMN notifications.sender_id IS 'ID of the user who sent the notification (optional)';
COMMENT ON COLUMN notifications.type IS 'Type of notification: case_assignment, case_update, appointment_reminder, or general';
COMMENT ON COLUMN notifications.title IS 'Title of the notification';
COMMENT ON COLUMN notifications.message IS 'Message content of the notification';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, medium, high, or urgent';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read by the recipient';
COMMENT ON COLUMN notifications.related_case_id IS 'ID of the related case (if applicable)';
COMMENT ON COLUMN notifications.related_incident_id IS 'ID of the related incident (if applicable)';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

-- Verify the table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- Show the table structure
\d notifications;
