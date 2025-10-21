-- DIAGNOSTIC QUERIES TO FIND THE ISSUE
-- Let's check what's actually happening with your data

-- 1. Check all cases and their status
SELECT 
    'Cases Status Check:' as message,
    status,
    COUNT(*) as count
FROM public.cases 
GROUP BY status
ORDER BY status;

-- 2. Check all incidents and their case_id relationships
SELECT 
    'Incidents Case ID Check:' as message,
    COUNT(*) as total_incidents,
    COUNT(case_id) as incidents_with_case_id,
    COUNT(CASE WHEN case_id IS NULL THEN 1 END) as incidents_without_case_id
FROM public.incidents;

-- 3. Check incidents linked to cases
SELECT 
    'Incidents Linked to Cases:' as message,
    i.id as incident_id,
    i.case_id,
    i.return_to_work,
    c.status as case_status,
    c.id as case_id_from_cases_table
FROM public.incidents i
LEFT JOIN public.cases c ON i.case_id = c.id
ORDER BY i.created_at DESC;

-- 4. Check if there are cases with closed status
SELECT 
    'Cases with Closed Status:' as message,
    id,
    case_number,
    status,
    worker_id,
    created_at
FROM public.cases 
WHERE status = 'closed'
ORDER BY created_at DESC;

-- 5. Check incidents that should be updated
SELECT 
    'Incidents that should be updated:' as message,
    i.id as incident_id,
    i.case_id,
    i.return_to_work as current_return_to_work,
    c.status as case_status,
    c.case_number
FROM public.incidents i
JOIN public.cases c ON i.case_id = c.id
WHERE c.status IN ('return_to_work', 'closed')
ORDER BY i.created_at DESC;

-- 6. Check if incidents have NULL case_id
SELECT 
    'Incidents with NULL case_id:' as message,
    id,
    case_id,
    return_to_work,
    created_at
FROM public.incidents 
WHERE case_id IS NULL;

-- 7. Check if there are incidents without proper case linking
SELECT 
    'Incidents without proper case linking:' as message,
    i.id as incident_id,
    i.case_id,
    i.return_to_work,
    CASE 
        WHEN i.case_id IS NULL THEN 'No case_id'
        WHEN c.id IS NULL THEN 'case_id does not exist in cases table'
        ELSE 'Properly linked'
    END as linking_status
FROM public.incidents i
LEFT JOIN public.cases c ON i.case_id = c.id
ORDER BY i.created_at DESC;
