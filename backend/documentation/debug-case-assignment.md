# Debug Case Assignment Issue

## Problem
Case Manager assigned a case to clinician, but clinician dashboard is not receiving the data.

## Possible Causes

### 1. **Missing clinician_id Column**
- The `clinician_id` column might not exist in the `cases` table
- Assignment data is not being stored in database
- Clinician dashboard queries return empty results

### 2. **Database Migration Not Run**
- The migration script `add-clinician-id-to-cases.sql` was not executed
- Database schema is outdated

### 3. **Assignment Service Error**
- CaseAssignmentService might be failing silently
- Database update is not happening

## Debug Steps

### Step 1: Check Database Schema
Run this in Supabase SQL Editor:
```sql
-- Check if clinician_id column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'cases' 
            AND column_name = 'clinician_id'
        ) 
        THEN '✅ clinician_id column EXISTS'
        ELSE '❌ clinician_id column MISSING - NEEDS MIGRATION'
    END as clinician_id_status;
```

### Step 2: Check Current Cases Table Structure
```sql
-- Show current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'cases' 
ORDER BY ordinal_position;
```

### Step 3: Check Browser Console
1. Open browser console (F12)
2. Assign a case to clinician
3. Look for these logs:
   ```
   Case assignment stored temporarily: CASE-...
   Error updating case with clinician assignment: ...
   ```

### Step 4: Check Assignment in Database
```sql
-- Check if any cases have clinician_id assigned
SELECT 
    id,
    case_number,
    status,
    case_manager_id,
    worker_id,
    clinician_id,
    priority,
    created_at,
    updated_at
FROM cases 
WHERE clinician_id IS NOT NULL
ORDER BY updated_at DESC;
```

## Solutions

### If clinician_id Column is Missing:
1. Run the migration script:
   ```sql
   -- Add clinician_id column
   ALTER TABLE cases 
   ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES users(id) ON DELETE SET NULL;
   
   -- Add priority column
   ALTER TABLE cases 
   ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
   
   -- Create indexes
   CREATE INDEX IF NOT EXISTS idx_cases_clinician_id ON cases(clinician_id);
   CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
   ```

2. Verify the migration:
   ```sql
   -- Check if columns were added
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'cases' 
   AND column_name IN ('clinician_id', 'priority');
   ```

### If Column Exists but Assignment Fails:
1. Check browser console for errors
2. Verify clinician ID is correct
3. Check database permissions

## Expected Flow After Fix

### 1. Case Manager Assigns Case
```
Case Manager → Select Case → Select Clinician → Confirm → Database Update
```

### 2. Database Update
```sql
UPDATE cases 
SET clinician_id = 'clinician-uuid', priority = 'medium', updated_at = NOW()
WHERE id = 'case-uuid';
```

### 3. Clinician Dashboard Query
```sql
SELECT * FROM cases 
WHERE clinician_id = 'clinician-uuid'
ORDER BY created_at DESC;
```

### 4. Notification Sent
```
Notification → notifications table → Clinician receives notification
```

## Verification Steps

### 1. Check Assignment Success
- Case Manager gets success message
- No errors in browser console
- Database shows updated clinician_id

### 2. Check Clinician Dashboard
- Cases appear in dashboard
- Cases appear in analytics
- Cases appear in activity monitor
- Cases appear in cases page

### 3. Check Notifications
- Clinician receives notification
- Notification appears in notifications page

## Quick Fix Commands

### Run Migration (if needed):
```sql
\i add-clinician-id-column.sql
```

### Check Status:
```sql
\i verify-clinician-id-migration.sql
```

### Debug Assignment:
```sql
\i check-clinician-id-column.sql
```

## Next Steps
1. Run the check script to see current state
2. If missing, run the migration script
3. Test case assignment again
4. Verify clinician dashboard shows the case




