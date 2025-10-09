-- Test script to verify shift management system setup
-- Run this after executing create-shift-management-system.sql

-- 1. Check if tables were created
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('shift_types', 'team_leader_shifts', 'shift_schedule_templates', 'shift_schedule_template_items')
ORDER BY table_name;

-- 2. Check shift types data
SELECT id, name, description, start_time, end_time, color, is_active 
FROM shift_types 
ORDER BY start_time;

-- 3. Check if we have any team leaders
SELECT 
  id,
  first_name,
  last_name,
  email,
  team,
  role,
  is_active
FROM users 
WHERE role = 'team_leader' 
  AND is_active = true
ORDER BY first_name;

-- 4. Check if we have any site supervisors
SELECT 
  id,
  first_name,
  last_name,
  email,
  role,
  is_active
FROM users 
WHERE role = 'site_supervisor' 
  AND is_active = true
ORDER BY first_name;

-- 5. Test the get_current_shift function (if we have team leaders)
DO $$
DECLARE
  team_leader_id UUID;
BEGIN
  -- Get first team leader ID
  SELECT id INTO team_leader_id 
  FROM users 
  WHERE role = 'team_leader' 
    AND is_active = true 
  LIMIT 1;
  
  IF team_leader_id IS NOT NULL THEN
    -- Test the function
    PERFORM get_current_shift(team_leader_id);
    RAISE NOTICE 'get_current_shift function works correctly';
  ELSE
    RAISE NOTICE 'No team leaders found to test function';
  END IF;
END $$;

-- 6. Check unique constraint (partial index)
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'team_leader_shifts' 
  AND indexname = 'unique_active_shift_per_leader';

-- 7. Check RLS policies
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

-- 8. Test sample shift assignment (if we have team leaders and site supervisors)
DO $$
DECLARE
  team_leader_id UUID;
  site_supervisor_id UUID;
  shift_type_id UUID;
  new_shift_id UUID;
BEGIN
  -- Get first team leader ID
  SELECT id INTO team_leader_id 
  FROM users 
  WHERE role = 'team_leader' 
    AND is_active = true 
  LIMIT 1;
  
  -- Get first site supervisor ID
  SELECT id INTO site_supervisor_id 
  FROM users 
  WHERE role = 'site_supervisor' 
    AND is_active = true 
  LIMIT 1;
  
  -- Get first shift type ID
  SELECT id INTO shift_type_id 
  FROM shift_types 
  WHERE is_active = true 
  LIMIT 1;
  
  IF team_leader_id IS NOT NULL AND site_supervisor_id IS NOT NULL AND shift_type_id IS NOT NULL THEN
    -- Test assigning a shift
    SELECT assign_shift_to_team_leader(
      team_leader_id,
      shift_type_id,
      site_supervisor_id,
      CURRENT_DATE,
      NULL,
      'Test assignment'
    ) INTO new_shift_id;
    
    RAISE NOTICE 'Test shift assignment successful. New shift ID: %', new_shift_id;
    
  ELSE
    RAISE NOTICE 'Cannot test shift assignment - missing required users or shift types';
  END IF;
END $$;

-- 8b. Display the test assignment results (if any were created)
SELECT 
  tls.id,
  tls.team_leader_id,
  tls.shift_type_id,
  tls.effective_date,
  tls.end_date,
  tls.is_active,
  tls.notes,
  st.name as shift_name,
  u.first_name || ' ' || u.last_name as team_leader_name
FROM team_leader_shifts tls
JOIN shift_types st ON tls.shift_type_id = st.id
JOIN users u ON tls.team_leader_id = u.id
WHERE tls.notes = 'Test assignment'
ORDER BY tls.created_at DESC;

-- 9. Final verification - check all created data
SELECT 
  'shift_types' as table_name,
  COUNT(*) as record_count
FROM shift_types
UNION ALL
SELECT 
  'team_leader_shifts' as table_name,
  COUNT(*) as record_count
FROM team_leader_shifts
UNION ALL
SELECT 
  'shift_schedule_templates' as table_name,
  COUNT(*) as record_count
FROM shift_schedule_templates
UNION ALL
SELECT 
  'shift_schedule_template_items' as table_name,
  COUNT(*) as record_count
FROM shift_schedule_template_items;
