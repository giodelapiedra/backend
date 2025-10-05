-- =============================================
-- SUPABASE MIGRATION SCHEMA
-- Occupational Rehabilitation System
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'worker' 
    CHECK (role IN ('admin', 'worker', 'employer', 'site_supervisor', 'clinician', 'case_manager', 'gp_insurer', 'team_leader')),
  phone VARCHAR(20),
  
  -- Address information (JSONB for flexibility)
  address JSONB DEFAULT '{}',
  
  -- Team information
  team VARCHAR(100),
  team_leader_id UUID REFERENCES users(id),
  default_team VARCHAR(100),
  managed_teams TEXT[],
  package VARCHAR(20) DEFAULT 'package1' CHECK (package IN ('package1', 'package2', 'package3')),
  
  -- Employment
  employer_id UUID REFERENCES users(id),
  
  -- Clinician specific
  specialty VARCHAR(100),
  license_number VARCHAR(50),
  is_available BOOLEAN DEFAULT true,
  availability_reason TEXT,
  last_availability_update TIMESTAMPTZ,
  
  -- Status and security
  is_active BOOLEAN DEFAULT true,
  login_attempts INTEGER DEFAULT 0,
  lock_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  
  -- Profile and contacts (JSONB for complex data)
  profile_image TEXT,
  emergency_contact JSONB DEFAULT '{}',
  medical_info JSONB DEFAULT '{}',
  
  -- Security fields
  reset_password_token TEXT,
  reset_password_expires TIMESTAMPTZ,
  email_verification_token TEXT,
  email_verified BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  two_factor_enabled BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. CASES TABLE
-- =============================================
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Relationships
  worker_id UUID NOT NULL REFERENCES users(id),
  employer_id UUID NOT NULL REFERENCES users(id),
  case_manager_id UUID NOT NULL REFERENCES users(id),
  clinician_id UUID REFERENCES users(id),
  incident_id UUID NOT NULL REFERENCES incidents(id),
  
  -- Status and priority
  status VARCHAR(20) DEFAULT 'new' 
    CHECK (status IN ('new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed')),
  priority VARCHAR(10) DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Injury details (JSONB for complex structure)
  injury_details JSONB NOT NULL DEFAULT '{}',
  work_restrictions JSONB DEFAULT '{}',
  
  -- Dates
  expected_return_date DATE,
  actual_return_date DATE,
  closed_date TIMESTAMPTZ,
  closed_by_id UUID REFERENCES users(id),
  
  -- Notes and documents (JSONB arrays)
  notes JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  status_history JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. INCIDENTS TABLE
-- =============================================
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_number VARCHAR(50) UNIQUE,
  
  -- Relationships
  reported_by_id UUID NOT NULL REFERENCES users(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  employer_id UUID NOT NULL REFERENCES users(id),
  
  -- Dates
  incident_date TIMESTAMPTZ NOT NULL,
  report_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Location (JSONB for structured data)
  location JSONB DEFAULT '{}',
  
  -- Incident classification
  incident_type VARCHAR(30) NOT NULL
    CHECK (incident_type IN ('slip_fall', 'struck_by', 'struck_against', 'overexertion', 'cut_laceration', 'burn', 'crush', 'other')),
  severity VARCHAR(20) NOT NULL
    CHECK (severity IN ('near_miss', 'first_aid', 'medical_treatment', 'lost_time', 'fatality')),
  
  -- Descriptions
  description TEXT NOT NULL,
  immediate_cause TEXT,
  root_cause TEXT,
  
  -- Investigation data (JSONB arrays)
  witnesses JSONB DEFAULT '[]',
  immediate_actions TEXT[],
  corrective_actions TEXT[],
  preventive_actions TEXT[],
  
  -- Media and documents
  photos JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  
  -- Status
  status VARCHAR(15) DEFAULT 'reported'
    CHECK (status IN ('reported', 'investigating', 'investigated', 'closed')),
  investigation_notes TEXT,
  closed_date TIMESTAMPTZ,
  closed_by_id UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  recipient_id UUID NOT NULL REFERENCES users(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  
  -- Notification details
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Related entity (polymorphic relationship)
  related_entity_type VARCHAR(30),
  related_entity_id UUID,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  
  -- Metadata (JSONB for flexible data)
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. ASSESSMENTS TABLE
-- =============================================
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  case_id UUID NOT NULL REFERENCES cases(id),
  clinician_id UUID NOT NULL REFERENCES users(id),
  
  -- Assessment details
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  assessment_type VARCHAR(20) NOT NULL
    CHECK (assessment_type IN ('initial', 'follow_up', 'discharge', 'return_to_work')),
  
  -- Assessment data (JSONB for complex structures)
  pain_assessment JSONB DEFAULT '{}',
  physical_examination JSONB DEFAULT '{}',
  functional_capacity JSONB DEFAULT '{}',
  work_capacity JSONB DEFAULT '{}',
  treatment_plan JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '{}',
  
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. REHABILITATION_PLANS TABLE
-- =============================================
CREATE TABLE rehabilitation_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  case_id UUID NOT NULL REFERENCES cases(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  clinician_id UUID NOT NULL REFERENCES users(id),
  
  -- Plan details
  plan_name VARCHAR(200) DEFAULT 'Recovery Plan',
  plan_description TEXT DEFAULT 'Daily recovery exercises and activities',
  status VARCHAR(15) DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  
  -- Dates
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Plan data (JSONB for complex structures)
  exercises JSONB DEFAULT '[]',
  daily_completions JSONB DEFAULT '[]',
  progress_stats JSONB DEFAULT '{}',
  alerts JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. APPOINTMENTS TABLE
-- =============================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  case_id UUID NOT NULL REFERENCES cases(id),
  clinician_id UUID NOT NULL REFERENCES users(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  
  -- Appointment details
  appointment_type VARCHAR(20) NOT NULL
    CHECK (appointment_type IN ('assessment', 'treatment', 'follow_up', 'consultation', 'telehealth')),
  scheduled_date TIMESTAMPTZ NOT NULL,
  duration INTEGER DEFAULT 60,
  
  -- Status and location
  status VARCHAR(15) DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  location VARCHAR(15) DEFAULT 'clinic'
    CHECK (location IN ('clinic', 'telehealth', 'workplace', 'home')),
  
  -- Telehealth info (JSONB for complex data)
  telehealth_info JSONB DEFAULT '{}',
  address JSONB DEFAULT '{}',
  
  -- Appointment data
  purpose TEXT,
  agenda TEXT[],
  preparation TEXT[],
  notes TEXT,
  
  -- Reminders and follow-up (JSONB)
  reminders JSONB DEFAULT '{}',
  follow_up JSONB DEFAULT '{}',
  outcome JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  
  -- Cancellation
  cancelled_by_id UUID REFERENCES users(id),
  cancellation_reason TEXT,
  cancellation_date TIMESTAMPTZ,
  rescheduled_to_id UUID REFERENCES appointments(id),
  
  -- History
  status_history JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. WORK_READINESS TABLE
-- =============================================
CREATE TABLE work_readiness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  worker_id UUID NOT NULL REFERENCES users(id),
  team_leader_id UUID NOT NULL REFERENCES users(id),
  team VARCHAR(100) NOT NULL,
  
  -- Readiness data
  fatigue_level INTEGER NOT NULL CHECK (fatigue_level BETWEEN 1 AND 5),
  pain_discomfort VARCHAR(3) NOT NULL CHECK (pain_discomfort IN ('yes', 'no')),
  pain_areas TEXT[],
  readiness_level VARCHAR(10) NOT NULL 
    CHECK (readiness_level IN ('fit', 'minor', 'not_fit')),
  mood VARCHAR(10) NOT NULL
    CHECK (mood IN ('excellent', 'good', 'okay', 'poor', 'terrible')),
  notes TEXT,
  
  -- Status and review
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(15) DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewed', 'followed_up')),
  reviewed_by_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  follow_up_reason TEXT,
  follow_up_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. CHECK_INS TABLE
-- =============================================
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  case_id UUID NOT NULL REFERENCES cases(id),
  worker_id UUID NOT NULL REFERENCES users(id),
  
  check_in_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Pain assessment (JSONB for complex structure)
  pain_level JSONB NOT NULL DEFAULT '{}',
  pain_location TEXT[],
  pain_quality TEXT,
  pain_triggers TEXT[],
  
  -- Functional status (JSONB)
  functional_status JSONB DEFAULT '{}',
  
  -- Medication and exercise compliance (JSONB)
  medication_compliance JSONB DEFAULT '{}',
  exercise_compliance JSONB DEFAULT '{}',
  
  -- Work status (JSONB)
  work_status JSONB DEFAULT '{}',
  
  -- Symptoms and activities (JSONB)
  symptoms JSONB DEFAULT '{}',
  activities JSONB DEFAULT '{}',
  
  -- Free text fields
  concerns TEXT,
  questions TEXT,
  goals TEXT,
  notes TEXT,
  
  -- Follow-up
  next_check_in DATE,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  
  -- Review
  reviewed_by_id UUID REFERENCES users(id),
  review_notes TEXT,
  review_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 10. ACTIVITY_LOGS TABLE
-- =============================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relationships
  worker_id UUID NOT NULL REFERENCES users(id),
  case_id UUID NOT NULL REFERENCES cases(id),
  clinician_id UUID NOT NULL REFERENCES users(id),
  rehabilitation_plan_id UUID REFERENCES rehabilitation_plans(id),
  
  -- Activity details
  activity_type VARCHAR(30) NOT NULL
    CHECK (activity_type IN ('exercise_completed', 'exercise_skipped', 'daily_check_in', 'pain_level_update', 'work_status_update', 'goal_achieved', 'milestone_reached', 'plan_review', 'appointment_attended', 'incident_reported')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- Activity-specific details (JSONB for flexibility)
  details JSONB DEFAULT '{}',
  
  -- Priority and status
  priority VARCHAR(10) DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(15) DEFAULT 'completed'
    CHECK (status IN ('completed', 'in_progress', 'pending', 'cancelled')),
  
  -- Review
  is_reviewed BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  clinician_notes TEXT,
  
  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 11. TEAMS TABLE
-- =============================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  team_leader_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 12. TEAM_MEMBERS TABLE
-- =============================================
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, user_id)
);

-- =============================================
-- 13. AUDIT_LOGS TABLE
-- =============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and session info
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  user_role VARCHAR(20) NOT NULL,
  
  -- Action details
  action VARCHAR(30) NOT NULL
    CHECK (action IN ('login', 'logout', 'login_failed', 'password_reset', 'account_locked', 'account_unlocked')),
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  
  -- Location (JSONB for structured data)
  location JSONB DEFAULT '{}',
  
  -- Status and failure info
  success BOOLEAN DEFAULT true,
  failure_reason VARCHAR(30)
    CHECK (failure_reason IN ('invalid_credentials', 'account_deactivated', 'account_locked', 'invalid_token', 'session_expired')),
  session_id TEXT,
  
  -- Device info (JSONB)
  device_info JSONB DEFAULT '{}',
  additional_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 14. FILE_ATTACHMENTS TABLE
-- =============================================
CREATE TABLE file_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Polymorphic relationship
  entity_type VARCHAR(30) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- File details
  original_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  -- Metadata
  uploaded_by_id UUID REFERENCES users(id),
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 15. SYSTEM_SETTINGS TABLE
-- =============================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_team ON users(team);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_employer ON users(employer_id);

-- Cases indexes
CREATE INDEX idx_cases_worker ON cases(worker_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_case_manager ON cases(case_manager_id);
CREATE INDEX idx_cases_clinician ON cases(clinician_id);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);

-- Incidents indexes
CREATE INDEX idx_incidents_worker ON incidents(worker_id);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by_id);
CREATE INDEX idx_incidents_incident_date ON incidents(incident_date DESC);
CREATE INDEX idx_incidents_status ON incidents(status);

-- Notifications indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Appointments indexes
CREATE INDEX idx_appointments_clinician_date ON appointments(clinician_id, scheduled_date);
CREATE INDEX idx_appointments_worker_date ON appointments(worker_id, scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Work readiness indexes
CREATE INDEX idx_work_readiness_worker ON work_readiness(worker_id, submitted_at DESC);
CREATE INDEX idx_work_readiness_team_leader ON work_readiness(team_leader_id, submitted_at DESC);
CREATE INDEX idx_work_readiness_team ON work_readiness(team);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_worker ON activity_logs(worker_id, created_at DESC);
CREATE INDEX idx_activity_logs_clinician ON activity_logs(clinician_id, is_reviewed, created_at DESC);
CREATE INDEX idx_activity_logs_case ON activity_logs(case_id, created_at DESC);

-- Team indexes
CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_ip ON audit_logs(ip_address);

-- File attachments indexes
CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX idx_file_attachments_uploaded_by ON file_attachments(uploaded_by_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehabilitation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be customized based on requirements)

-- Users: Users can see their own data, admins can see all
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id OR 
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id OR 
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Cases: Users can see cases they're involved in
CREATE POLICY "Users can view relevant cases" ON cases
  FOR SELECT USING (
    worker_id = auth.uid() OR 
    case_manager_id = auth.uid() OR 
    clinician_id = auth.uid() OR
    employer_id = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

-- Notifications: Users can see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Work readiness: Team leaders and workers can see relevant data
CREATE POLICY "Users can view relevant work readiness" ON work_readiness
  FOR SELECT USING (
    worker_id = auth.uid() OR 
    team_leader_id = auth.uid() OR
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor'))
  );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rehabilitation_plans_updated_at BEFORE UPDATE ON rehabilitation_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_readiness_updated_at BEFORE UPDATE ON work_readiness
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_check_ins_updated_at BEFORE UPDATE ON check_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activity_logs_updated_at BEFORE UPDATE ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_attachments_updated_at BEFORE UPDATE ON file_attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL THEN
    NEW.case_number := 'CASE-' || EXTRACT(YEAR FROM NOW()) || '-' || 
                      EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || 
                      FLOOR(RANDOM() * 1000);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_case_number_trigger BEFORE INSERT ON cases
  FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- Function to generate incident numbers
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  IF NEW.incident_number IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM 'INC-(\d+)') AS INTEGER)), 0) + 1
    INTO next_number
    FROM incidents
    WHERE incident_number ~ '^INC-\d+$';
    
    NEW.incident_number := 'INC-' || LPAD(next_number::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_incident_number_trigger BEFORE INSERT ON incidents
  FOR EACH ROW EXECUTE FUNCTION generate_incident_number();

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('app_name', '"Occupational Rehabilitation System"', 'Application name', true),
  ('app_version', '"1.0.0"', 'Application version', true),
  ('maintenance_mode', 'false', 'Maintenance mode flag', false),
  ('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)', false),
  ('allowed_file_types', '["pdf", "jpg", "jpeg", "png", "doc", "docx"]', 'Allowed file extensions', false);

-- Create default teams
INSERT INTO teams (id, name, description) VALUES
  (uuid_generate_v4(), 'TEAM ALPHA', 'Alpha Team - Morning Shift'),
  (uuid_generate_v4(), 'TEAM BETA', 'Beta Team - Afternoon Shift'),
  (uuid_generate_v4(), 'TEAM GAMMA', 'Gamma Team - Night Shift'),
  (uuid_generate_v4(), 'TEAM DELTA', 'Delta Team - Weekend Shift');

COMMIT;
