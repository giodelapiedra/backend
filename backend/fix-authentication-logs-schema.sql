-- Fix authentication_logs table schema
-- Add missing columns for proper authentication logging

-- Add missing columns to existing authentication_logs table
ALTER TABLE authentication_logs 
ADD COLUMN IF NOT EXISTS action TEXT CHECK (action IN ('login', 'logout', 'password_reset', 'account_locked', 'account_unlocked')),
ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS location JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS failure_reason TEXT CHECK (failure_reason IN ('invalid_credentials', 'account_deactivated', 'account_locked', 'invalid_token', 'session_expired')),
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS additional_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add the missing NOT NULL constraints for required fields
-- (We'll make them NOT NULL after filling with defaults, but for now keep as optional)

-- Update existing records to have default action = 'login' and success = true
UPDATE authentication_logs 
SET 
  action = 'login',
  success = true,
  ip_address = 'unknown',
  user_agent = 'unknown'
WHERE action IS NULL OR action = '';image.png

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_authentication_logs_action ON authentication_logs(action);
CREATE INDEX IF NOT EXISTS idx_authentication_logs_success ON authentication_logs(success);
CREATE INDEX IF NOT EXISTS idx_authentication_logs_created_at ON authentication_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authentication_logs_user_id_created_at ON authentication_logs(user_id, created_at DESC);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_authentication_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_authentication_logs_updated_at ON authentication_logs;
CREATE TRIGGER trigger_update_authentication_logs_updated_at
  BEFORE UPDATE ON authentication_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_authentication_logs_updated_at();

-- Alternative manual logging function (simpler version)
CREATE OR REPLACE FUNCTION log_auth_event_simple(
  p_user_id UUID,
  p_user_email TEXT,
  p_user_name TEXT,
  p_user_role TEXT,
  p_ip_address TEXT DEFAULT 'unknown',
  p_user_agent TEXT DEFAULT 'unknown',
  p_action TEXT DEFAULT 'login'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO authentication_logs (
    user_id,
    user_email,
    user_name,
    user_role,
    action,
    ip_address,
    user_agent,
    success,
    created_at
  ) VALUES (
    p_user_id,
    p_user_email,
    p_user_name,
    p_user_role,
    p_action,
    p_ip_address,
    p_user_agent,
    true,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_auth_event_simple TO authenticated, service_role;

-- Test the function
DO $$
BEGIN
  PERFORM log_auth_event_simple(
    '00000000-0000-0000-0000-000000000000', -- test user id
    'test@example.com',
    'Test User',
    'worker',
    '127.0.0.1',
    'Test Browser',
    'login'
  );
  
  RAISE NOTICE 'Authentication logs schema fix completed successfully!';
END $$;
