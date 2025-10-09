-- =============================================
-- SHIFT MANAGEMENT SYSTEM FOR TEAM LEADERS
-- =============================================
-- This system allows site supervisors to assign different shifts
-- (midnight, morning, afternoon, evening) to team leaders

-- =============================================
-- 1. SHIFT TYPES TABLE
-- =============================================
CREATE TABLE shift_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  color VARCHAR(7) DEFAULT '#1976d2', -- Hex color for UI
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default shift types
INSERT INTO shift_types (name, description, start_time, end_time, color) VALUES
('Midnight Shift', '12:00 AM - 8:00 AM', '00:00:00', '08:00:00', '#1a237e'),
('Morning Shift', '6:00 AM - 2:00 PM', '06:00:00', '14:00:00', '#2e7d32'),
('Afternoon Shift', '2:00 PM - 10:00 PM', '14:00:00', '22:00:00', '#f57c00'),
('Evening Shift', '10:00 PM - 6:00 AM', '22:00:00', '06:00:00', '#5d4037'),
('Day Shift', '8:00 AM - 5:00 PM', '08:00:00', '17:00:00', '#1976d2'),
('Night Shift', '8:00 PM - 5:00 AM', '20:00:00', '05:00:00', '#424242');

-- =============================================
-- 2. TEAM LEADER SHIFT ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE team_leader_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_type_id UUID NOT NULL REFERENCES shift_types(id) ON DELETE CASCADE,
  assigned_by_id UUID NOT NULL REFERENCES users(id), -- Site supervisor who assigned
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL means ongoing
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint to ensure one active shift per team leader at a time
-- Using a unique partial index instead of EXCLUDE constraint
CREATE UNIQUE INDEX unique_active_shift_per_leader 
ON team_leader_shifts (team_leader_id) 
WHERE is_active = true;

-- =============================================
-- 3. SHIFT SCHEDULE TEMPLATES TABLE
-- =============================================
CREATE TABLE shift_schedule_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by_id UUID NOT NULL REFERENCES users(id),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. SHIFT SCHEDULE TEMPLATE ITEMS TABLE
-- =============================================
CREATE TABLE shift_schedule_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES shift_schedule_templates(id) ON DELETE CASCADE,
  shift_type_id UUID NOT NULL REFERENCES shift_types(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique shift per day in template
  UNIQUE(template_id, day_of_week)
);

-- =============================================
-- 5. INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_team_leader_shifts_team_leader_id ON team_leader_shifts(team_leader_id);
CREATE INDEX idx_team_leader_shifts_effective_date ON team_leader_shifts(effective_date);
CREATE INDEX idx_team_leader_shifts_active ON team_leader_shifts(is_active);
CREATE INDEX idx_team_leader_shifts_assigned_by ON team_leader_shifts(assigned_by_id);
CREATE INDEX idx_shift_types_active ON shift_types(is_active);
CREATE INDEX idx_shift_schedule_templates_active ON shift_schedule_templates(is_active);

-- =============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_leader_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedule_template_items ENABLE ROW LEVEL SECURITY;

-- Shift types - readable by all authenticated users
CREATE POLICY "Shift types are viewable by authenticated users" ON shift_types
  FOR SELECT USING (auth.role() = 'authenticated');

-- Team leader shifts - site supervisors can manage, team leaders can view their own
CREATE POLICY "Site supervisors can manage team leader shifts" ON team_leader_shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'site_supervisor'
    )
  );

CREATE POLICY "Team leaders can view their own shifts" ON team_leader_shifts
  FOR SELECT USING (
    team_leader_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'site_supervisor'
    )
  );

-- Shift schedule templates - site supervisors can manage
CREATE POLICY "Site supervisors can manage shift templates" ON shift_schedule_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'site_supervisor'
    )
  );

CREATE POLICY "Authenticated users can view shift templates" ON shift_schedule_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Shift schedule template items - same as templates
CREATE POLICY "Site supervisors can manage template items" ON shift_schedule_template_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'site_supervisor'
    )
  );

CREATE POLICY "Authenticated users can view template items" ON shift_schedule_template_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================
-- 7. HELPFUL FUNCTIONS
-- =============================================

-- Function to get current shift for a team leader
CREATE OR REPLACE FUNCTION get_current_shift(team_leader_uuid UUID)
RETURNS TABLE (
  shift_id UUID,
  shift_name VARCHAR(50),
  start_time TIME,
  end_time TIME,
  color VARCHAR(7),
  effective_date DATE,
  end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tls.id,
    st.name,
    st.start_time,
    st.end_time,
    st.color,
    tls.effective_date,
    tls.end_date
  FROM team_leader_shifts tls
  JOIN shift_types st ON tls.shift_type_id = st.id
  WHERE tls.team_leader_id = team_leader_uuid
    AND tls.is_active = true
    AND tls.effective_date <= CURRENT_DATE
    AND (tls.end_date IS NULL OR tls.end_date >= CURRENT_DATE)
  ORDER BY tls.effective_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign shift to team leader
CREATE OR REPLACE FUNCTION assign_shift_to_team_leader(
  team_leader_uuid UUID,
  shift_type_uuid UUID,
  assigned_by_uuid UUID,
  effective_date_param DATE DEFAULT CURRENT_DATE,
  end_date_param DATE DEFAULT NULL,
  notes_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_shift_id UUID;
BEGIN
  -- Deactivate any existing active shifts for this team leader
  UPDATE team_leader_shifts 
  SET is_active = false, updated_at = NOW()
  WHERE team_leader_id = team_leader_uuid 
    AND is_active = true;
  
  -- Insert new shift assignment
  INSERT INTO team_leader_shifts (
    team_leader_id,
    shift_type_id,
    assigned_by_id,
    effective_date,
    end_date,
    notes
  ) VALUES (
    team_leader_uuid,
    shift_type_uuid,
    assigned_by_uuid,
    effective_date_param,
    end_date_param,
    notes_param
  ) RETURNING id INTO new_shift_id;
  
  RETURN new_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON TABLE shift_types IS 'Defines different types of shifts (midnight, morning, etc.)';
COMMENT ON TABLE team_leader_shifts IS 'Assigns specific shifts to team leaders with effective dates';
COMMENT ON TABLE shift_schedule_templates IS 'Reusable shift schedule templates';
COMMENT ON TABLE shift_schedule_template_items IS 'Individual shift assignments within a template';

COMMENT ON FUNCTION get_current_shift(UUID) IS 'Returns the current active shift for a team leader';
COMMENT ON FUNCTION assign_shift_to_team_leader(UUID, UUID, UUID, DATE, DATE, TEXT) IS 'Assigns a shift to a team leader and deactivates previous shifts';

-- =============================================
-- 9. VERIFICATION QUERIES
-- =============================================

-- Check if tables were created successfully
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('shift_types', 'team_leader_shifts', 'shift_schedule_templates', 'shift_schedule_template_items')
ORDER BY table_name;

-- Check if shift types were inserted
SELECT id, name, start_time, end_time, color FROM shift_types ORDER BY start_time;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('shift_types', 'team_leader_shifts', 'shift_schedule_templates', 'shift_schedule_template_items')
ORDER BY tablename, policyname;
