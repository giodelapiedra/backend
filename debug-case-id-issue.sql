-- Check if case_id column exists in incidents table
-- Run this in Supabase SQL editor to verify the column was added

-- Check if case_id column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'incidents' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any incidents with case_id populated
SELECT 
  id,
  incident_number,
  case_id,
  description,
  created_at
FROM incidents 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if there are any cases created
SELECT 
  id,
  case_number,
  incident_id,
  worker_id,
  case_manager_id,
  status,
  created_at
FROM cases 
ORDER BY created_at DESC 
LIMIT 10;

-- Check the relationship between incidents and cases
SELECT 
  i.id as incident_id,
  i.incident_number,
  i.case_id,
  c.id as case_id_from_cases_table,
  c.case_number,
  c.status as case_status
FROM incidents i
LEFT JOIN cases c ON i.id = c.incident_id
ORDER BY i.created_at DESC 
LIMIT 10;
