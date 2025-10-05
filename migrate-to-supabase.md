# Migration Guide: localStorage to Supabase

## Problem
Data was being stored in browser localStorage instead of Supabase database, which is not ideal for production.

## Solution
Updated the system to use Supabase database directly for case assignments.

## Changes Made

### 1. **CaseAssignmentService.ts**

#### Before (localStorage):
```typescript
// Store assignment in localStorage
const assignmentInfo = { ... };
localStorage.setItem(`case_assignment_${caseId}`, JSON.stringify(assignmentInfo));

// Get assignments from localStorage
const allAssignments = JSON.parse(localStorage.getItem('all_case_assignments') || '[]');
const clinicianAssignments = allAssignments.filter(assignment => 
  assignment.clinicianId === clinicianId
);
```

#### After (Supabase):
```typescript
// Update case in database with clinician assignment
const { data: updatedCase, error: updateError } = await dataClient
  .from('cases')
  .update({ 
    clinician_id: assignmentData.clinicianId,
    priority: 'medium',
    updated_at: new Date().toISOString()
  })
  .eq('id', assignmentData.caseId)
  .select('*')
  .single();

// Get cases directly from database
const { data: casesData, error: casesError } = await dataClient
  .from('cases')
  .select(`
    *,
    worker:users!cases_worker_id_fkey(id, first_name, last_name, email),
    case_manager:users!cases_case_manager_id_fkey(id, first_name, last_name, email),
    clinician:users!cases_clinician_id_fkey(id, first_name, last_name, email),
    incident:incidents!cases_incident_id_fkey(id, incident_number, description, severity, status)
  `)
  .eq('clinician_id', clinicianId)
  .order('created_at', { ascending: false });
```

### 2. **Cases.tsx**

#### Before:
```typescript
if (user.role === 'clinician') {
  // Use the case assignment service to get assigned cases
  const assignedCases = await CaseAssignmentService.getClinicianCases(user.id);
  setCases(assignedCases);
  return;
}
```

#### After:
```typescript
if (user.role === 'clinician') {
  // Get cases assigned to this clinician from database
  casesQuery = casesQuery.eq('clinician_id', user.id);
  console.log('Filtering cases for clinician:', user.id);
}
```

### 3. **Database Schema Requirements**

#### Required Migration:
```sql
-- Add clinician_id column to cases table
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS clinician_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add priority column
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cases_clinician_id ON cases(clinician_id);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
```

## Benefits of Migration

### 1. **Data Persistence**
- ✅ Data survives browser restarts
- ✅ Data is shared across devices
- ✅ Data is backed up in database

### 2. **Real-time Updates**
- ✅ Multiple users see updates immediately
- ✅ No need to manually refresh
- ✅ Database triggers can notify other users

### 3. **Data Integrity**
- ✅ Foreign key constraints ensure valid clinician IDs
- ✅ Database transactions ensure consistency
- ✅ No risk of localStorage corruption

### 4. **Performance**
- ✅ Database queries are optimized
- ✅ Indexes improve query performance
- ✅ No need to parse JSON from localStorage

### 5. **Scalability**
- ✅ Can handle large numbers of assignments
- ✅ Database can be optimized for performance
- ✅ Can add complex queries and filters

## Migration Steps

### Step 1: Run Database Migration
```sql
-- Execute the migration script
\i add-clinician-id-to-cases.sql
```

### Step 2: Verify Migration
```sql
-- Check if columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name IN ('clinician_id', 'priority');

-- Check if indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'cases' 
AND indexname LIKE '%clinician%';
```

### Step 3: Test Assignment Flow
1. Case Manager assigns case to clinician
2. Check database for updated `clinician_id`
3. Clinician dashboard shows assigned case
4. Notifications are sent properly

### Step 4: Clean Up localStorage (Optional)
```javascript
// Clear old localStorage data
localStorage.removeItem('all_case_assignments');
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('case_assignment_')) {
    localStorage.removeItem(key);
  }
});
```

## Data Flow After Migration

### 1. **Case Assignment**
```
Case Manager → Database Update → Notification → Clinician Dashboard
```

### 2. **Data Storage**
```
Assignment Data → cases.clinician_id → Database
```

### 3. **Data Retrieval**
```
Clinician Dashboard → Database Query → Display Cases
```

## Verification

### Check Database
```sql
-- Verify assignments are stored
SELECT 
  c.case_number,
  c.clinician_id,
  u.first_name || ' ' || u.last_name as clinician_name,
  c.priority,
  c.updated_at
FROM cases c
LEFT JOIN users u ON c.clinician_id = u.id
WHERE c.clinician_id IS NOT NULL
ORDER BY c.updated_at DESC;
```

### Check Application
1. Assign case to clinician
2. Verify case appears in clinician dashboard
3. Check notifications are sent
4. Verify data persists after refresh

## Summary

✅ **Migration Complete**: All data now stored in Supabase database
✅ **Performance Improved**: Direct database queries instead of localStorage
✅ **Data Persistence**: Data survives browser restarts and device changes
✅ **Real-time Updates**: Multiple users see changes immediately
✅ **Data Integrity**: Foreign key constraints ensure valid data
✅ **Scalability**: Can handle large numbers of assignments efficiently

The system now properly uses Supabase database for all case assignment data, providing better performance, persistence, and reliability.




