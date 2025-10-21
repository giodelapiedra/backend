-- Check what readiness_level values are actually being saved
-- This will help us understand the data format

-- Step 1: Show all unique readiness_level values
SELECT 
  readiness_level,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM work_readiness) * 100, 2) as percentage
FROM work_readiness
GROUP BY readiness_level
ORDER BY count DESC;

-- Step 2: Show recent submissions with readiness_level
SELECT 
  id,
  worker_id,
  readiness_level,
  fatigue_level,
  mood,
  pain_discomfort,
  submitted_at,
  team,
  team_leader_id
FROM work_readiness
ORDER BY submitted_at DESC
LIMIT 20;

-- Step 3: Check if the values match what the chart expects
SELECT 
  'Expected by Chart' as type,
  'fit_for_work OR fit' as expected_value,
  COUNT(*) FILTER (WHERE readiness_level IN ('fit', 'fit_for_work')) as actual_count
FROM work_readiness
UNION ALL
SELECT 
  'Expected by Chart',
  'minor_concerns_fit_for_work OR minor',
  COUNT(*) FILTER (WHERE readiness_level IN ('minor', 'minor_concerns', 'minor_concerns_fit_for_work'))
FROM work_readiness
UNION ALL
SELECT 
  'Expected by Chart',
  'not_fit_for_work OR not_fit',
  COUNT(*) FILTER (WHERE readiness_level IN ('not_fit', 'not_fit_for_work'))
FROM work_readiness;

-- Step 4: Show breakdown by date for last 7 days
SELECT 
  DATE(submitted_at) as date,
  COUNT(*) FILTER (WHERE readiness_level IN ('fit', 'fit_for_work')) as fit_count,
  COUNT(*) FILTER (WHERE readiness_level IN ('minor', 'minor_concerns', 'minor_concerns_fit_for_work')) as minor_count,
  COUNT(*) FILTER (WHERE readiness_level IN ('not_fit', 'not_fit_for_work')) as not_fit_count,
  COUNT(*) as total
FROM work_readiness
WHERE submitted_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(submitted_at)
ORDER BY date DESC;

-- Step 5: Check the worker's submission that showed NULL
SELECT 
  wr.id,
  wr.worker_id,
  w.email as worker_email,
  w.first_name || ' ' || w.last_name as worker_name,
  w.team,
  w.team_leader_id as worker_assigned_team_leader,
  wr.team_leader_id as wr_team_leader_id,
  wr.team as wr_team,
  wr.readiness_level,
  wr.fatigue_level,
  wr.submitted_at
FROM work_readiness wr
LEFT JOIN users w ON w.id = wr.worker_id
WHERE wr.worker_id = '51f1499-2624-49f2-b53c-1553e6e8c9b2'
ORDER BY wr.submitted_at DESC
LIMIT 5;

