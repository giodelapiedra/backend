# Rehabilitation Plan Status Update - Troubleshooting Guide

## Problem
The rehabilitation plan status is still showing "completed" and not updating when case status changes to `triaged`, `assessed`, or `in_rehab`.

## Possible Causes

### 1. **Trigger Not Created**
The database trigger might not have been executed yet.

**Solution**: Run the SQL script in Supabase SQL Editor:
```sql
-- Execute: simplified-rehab-plan-status-trigger.sql
```

### 2. **Case Status Not Actually Updated**
The case status might not have been changed to the active states.

**Check**: Run this query to verify case status:
```sql
SELECT 
    c.id,
    c.case_number,
    c.status as case_status,
    c.updated_at,
    rp.id as rehab_plan_id,
    rp.status as rehab_status
FROM cases c
JOIN rehabilitation_plans rp ON c.id = rp.case_id
WHERE rp.status = 'completed'
ORDER BY c.updated_at DESC;
```

### 3. **Trigger Not Firing**
The trigger might exist but not be firing.

**Check**: Run this query to verify trigger exists:
```sql
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_rehab_plan_on_case_status_change';
```

### 4. **Manual Test**
Test the trigger manually:

1. **Find a case with completed rehabilitation plan**:
```sql
SELECT 
    c.id as case_id,
    c.case_number,
    c.status as case_status,
    rp.id as rehab_plan_id,
    rp.status as rehab_status
FROM cases c
JOIN rehabilitation_plans rp ON c.id = rp.case_id
WHERE rp.status = 'completed'
LIMIT 1;
```

2. **Update the case status** (replace `your-case-id` with actual ID):
```sql
UPDATE cases 
SET status = 'triaged', updated_at = NOW()
WHERE id = 'your-case-id-here';
```

3. **Check if rehabilitation plan status updated**:
```sql
SELECT 
    rp.id,
    rp.status,
    rp.updated_at
FROM rehabilitation_plans rp
WHERE rp.case_id = 'your-case-id-here';
```

## Step-by-Step Solution

### Step 1: Run the Simplified Trigger
Execute the `simplified-rehab-plan-status-trigger.sql` script in Supabase SQL Editor.

### Step 2: Verify Trigger Creation
Run the verification query to ensure the trigger was created.

### Step 3: Test the Trigger
Use the manual test queries above to verify the trigger works.

### Step 4: Update Case Status
In your application, update a case status to `triaged`, `assessed`, or `in_rehab`.

### Step 5: Check Results
Verify that the rehabilitation plan status has been updated to `active`.

## Expected Behavior

When you update a case status to:
- `triaged` → Rehabilitation plan status should become `active`
- `assessed` → Rehabilitation plan status should become `active`  
- `in_rehab` → Rehabilitation plan status should become `active`
- `return_to_work` → Rehabilitation plan status should become `completed`
- `closed` → Rehabilitation plan status should become `completed`

## Debugging Queries

### Check Current State
```sql
SELECT 
    c.id as case_id,
    c.case_number,
    c.status as case_status,
    rp.id as rehab_plan_id,
    rp.status as rehab_status,
    rp.updated_at as rehab_updated_at
FROM cases c
LEFT JOIN rehabilitation_plans rp ON c.id = rp.case_id
WHERE c.clinician_id IS NOT NULL
ORDER BY c.updated_at DESC
LIMIT 10;
```

### Check Trigger Logs
Look for NOTICE messages in the Supabase logs when updating case status.

### Force Update (Emergency)
If the trigger still doesn't work, you can manually update the rehabilitation plan:
```sql
UPDATE rehabilitation_plans 
SET status = 'active', updated_at = NOW()
WHERE case_id = 'your-case-id-here';
```
