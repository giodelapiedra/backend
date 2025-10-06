-- Create authentication logging trigger for Supabase Auth
-- This will automatically log login/logout events to authentication_logs table

-- Function to handle authentication events
CREATE OR REPLACE FUNCTION handle_auth_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only handle insertions (login events)
  IF TG_OP = 'INSERT' THEN
    -- Insert authentication log for successful login
    INSERT INTO authentication_logs (
      user_id,
      user_email,
      user_name,
      user_role,
      action,
      ip_address,
      user_agent,
      success,
      session_id,
      created_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.email, NEW.raw_user_meta_data->>'email')::text,
      COALESCE(
        NEW.raw_user_meta_data->>'first_name' || ' ' || NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email::text
      ),
      COALESCE(NEW.raw_user_meta_data->>'role', 'worker')::text,
      'login',
      COALESCE(NEW.raw_user_meta_data->>'ip_address', 'unknown')::text,
      COALESCE(NEW.raw_user_meta_data->>'user_agent', 'unknown')::text,
      NEW.email_confirmed_at IS NOT NULL, -- success based on email confirmation
      NEW.id::text,
      COALESCE(NEW.created_at, NOW())
)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table for login logging
DROP TRIGGER IF EXISTS log_user_login ON auth.users;
CREATE TRIGGER log_user_login
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_event();

-- Alternative function to log authentication attempts manually
CREATE OR REPLACE FUNCTION log_authentication_attempt(
  p_user_id UUID,
  p_user_email TEXT,
  p_user_name TEXT,
  p_user_role TEXT,
  p_action TEXT,
  p_ip_address TEXT DEFAULT 'unknown',
  p_user_agent TEXT DEFAULT 'unknown',
  p_success BOOLEAN DEFAULT true,
  p_session_id TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL
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
    session_id,
    failure_reason,
    created_at
  ) VALUES (
    p_user_id,
    p_user_email,
    p_user_name,
    p_user_role,
    p_action,
    p_ip_address,
    p_user_agent,
    p_success,
    p_session_id,
    p_failure_reason,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create another approach: Alternative trigger for auth.sessions table
CREATE OR REPLACE FUNCTION handle_session_event()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Only handle insertions (login events)
  IF TG_OP = 'INSERT' AND NEW.factor_id IS NULL THEN
    -- Get user information
    SELECT 
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'first_name' || ' ' || u.raw_user_meta_data->>'last_name', u.email) as name,
      COALESCE(u.raw_user_meta_data->>'role', 'worker') as role
    INTO user_record
    FROM auth.users u
    WHERE u.id = NEW.user_id;
    
    IF user_record.id IS NOT NULL THEN
      -- Insert authentication log for successful login
      INSERT INTO authentication_logs (
        user_id,
        user_email,
        user_name,
        user_role,
        action,
        ip_address,
        user_agent,
        success,
        session_id,
        created_at
      ) VALUES (
        user_record.id,
        user_record.email,
        user_record.name,
        user_record.role,
        'login',
        COALESCE(NEW.ip, 'unknown')::text,
        COALESCE(NEW.user_agent, 'unknown')::text,
        true,
        NEW.id::text,
        COALESCE(NEW.created_at, NOW())
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.sessions table (alternative approach)
DROP TRIGGER IF EXISTS log_session_login ON auth.sessions;
CREATE TRIGGER log_session_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_session_event();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION log_authentication_attempt TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION handle_auth_event TO service_role;
GRANT EXECUTE ON FUNCTION handle_session_event TO service_role;

-- Test the function
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Test the manual logging function
  PERFORM log_authentication_attempt(
    test_user_id,
    'test@example.com',
    'Test User',
    'worker',
    'login',
    '192.168.1.1',
    'Mozilla/5.0',
    true,
    'test-session-id'
  );
  
  RAISE NOTICE 'Authentication logging trigger created successfully!';
END $$;
