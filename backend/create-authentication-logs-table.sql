-- Create authentication_logs table for tracking user login/logout activities
CREATE TABLE IF NOT EXISTS authentication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login', 'logout', 'password_reset', 'account_locked', 'account_unlocked')),
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  location JSONB,
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT CHECK (failure_reason IN ('invalid_credentials', 'account_deactivated', 'account_locked', 'invalid_token', 'session_expired')),
  session_id TEXT,
  device_info JSONB,
  additional_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_authentication_logs_user_id ON authentication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_authentication_logs_action ON authentication_logs(action);
CREATE INDEX IF NOT EXISTS idx_authentication_logs_user_role ON authentication_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_authentication_logs_success ON authentication_logs(success);
CREATE INDEX IF NOT EXISTS idx_authentication_logs_ip_address ON authentication_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_authentication_logs_created_at ON authentication_logs(created_at DESC);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_authentication_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_authentication_logs_updated_at
  BEFORE UPDATE ON authentication_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_authentication_logs_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE authentication_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Team leaders can see logs for their team members
CREATE POLICY "Team leaders can view their team members' logs" ON authentication_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = authentication_logs.user_id 
      AND users.team IN (
        SELECT unnest(managed_teams) FROM users 
        WHERE users.id = auth.uid() AND users.role = 'team_leader'
      )
    )
  );

-- Site supervisors can see all logs
CREATE POLICY "Site supervisors can view all logs" ON authentication_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'site_supervisor'
    )
  );

-- Admins can see all logs
CREATE POLICY "Admins can view all logs" ON authentication_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Users can see their own logs
CREATE POLICY "Users can view their own logs" ON authentication_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow service role to insert logs (for backend logging)
CREATE POLICY "Service role can insert logs" ON authentication_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow service role to update logs
CREATE POLICY "Service role can update logs" ON authentication_logs
  FOR UPDATE
  USING (true);
