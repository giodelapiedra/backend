# Rehabilitation Plan Status Synchronization with Case Status

## Summary
Implemented automatic synchronization between case status and rehabilitation plan status using database triggers. When a clinician updates a case status to `triaged`, `assessed`, or `in_rehab`, the corresponding rehabilitation plan status is automatically updated to maintain data consistency.

## Problem
When clinicians update case status to active states (`triaged`, `assessed`, `in_rehab`), the rehabilitation plan status should also be updated accordingly to maintain data consistency and proper workflow tracking.

## Solution
Created a database trigger that automatically updates rehabilitation plan status when case status changes, ensuring both systems stay synchronized.

## Changes Made

### 1. Database Changes

#### New SQL Script: update-rehab-plan-status-on-case-status-change.sql
- **Created trigger function**: `update_rehab_plan_on_case_status_change()`
- **Created trigger**: `trigger_update_rehab_plan_on_case_status_change` on `cases` table
- **Automatic status mapping**:

| Case Status Change | Rehabilitation Plan Status Update | Condition |
|-------------------|----------------------------------|-----------|
| `triaged`, `assessed`, `in_rehab` | → `active` | If plan exists and status is `paused`, `completed`, or `cancelled` |
| `return_to_work`, `closed` | → `completed` | If plan exists and status is `active` or `paused` |
| From active states to inactive | → `paused` | If plan exists and status is `active` |

### 2. Status Mapping Logic

#### Case Status → Rehabilitation Plan Status
```sql
-- Active states: triaged, assessed, in_rehab
IF NEW.status IN ('triaged', 'assessed', 'in_rehab') THEN
    UPDATE rehabilitation_plans SET status = 'active' 
    WHERE case_id = NEW.id AND status IN ('paused', 'completed', 'cancelled');

-- Completion states: return_to_work, closed  
IF NEW.status IN ('return_to_work', 'closed') THEN
    UPDATE rehabilitation_plans SET status = 'completed', end_date = CURRENT_DATE
    WHERE case_id = NEW.id AND status IN ('active', 'paused');

-- Inactive states: new, etc.
IF OLD.status IN ('triaged', 'assessed', 'in_rehab') AND NEW.status NOT IN (...) THEN
    UPDATE rehabilitation_plans SET status = 'paused'
    WHERE case_id = NEW.id AND status = 'active';
```

## Technical Details

### Database Trigger Behavior
- **Trigger Type**: `AFTER UPDATE` on `cases` table
- **Execution**: Fires for every case status update
- **Logging**: Database notices for tracking changes
- **Performance**: Only updates plans that actually need status changes

### Data Consistency
- **Bidirectional Sync**: 
  - Case status → Rehabilitation plan status (new trigger)
  - Rehabilitation plan status → Case status (existing trigger)
- **Conflict Prevention**: Triggers handle status transitions intelligently
- **Audit Trail**: All changes are logged with timestamps

## Benefits

1. **Data Consistency**: Case and rehabilitation plan statuses stay synchronized
2. **Workflow Integrity**: Proper status progression through the system
3. **Automatic Updates**: No manual intervention required
4. **Audit Trail**: Complete tracking of status changes
5. **Performance**: Efficient database-level updates

## User Experience Impact

- **Before**: Case status and rehabilitation plan status could be out of sync
- **After**: Statuses automatically synchronize when case status changes
- **Transparency**: Users see consistent status across all views
- **Reliability**: Reduced manual errors and data inconsistencies

## Integration with Existing System

### Existing Triggers (Preserved)
- `trigger_update_case_on_rehab_completion`: Updates case status when plan is completed
- `trigger_handle_clinician_unassignment`: Pauses plans when clinician is unassigned

### New Trigger (Added)
- `trigger_update_rehab_plan_on_case_status_change`: Updates plan status when case status changes

## Testing Checklist

- [ ] Case status `triaged` → Rehabilitation plan status `active`
- [ ] Case status `assessed` → Rehabilitation plan status `active`  
- [ ] Case status `in_rehab` → Rehabilitation plan status `active`
- [ ] Case status `return_to_work` → Rehabilitation plan status `completed`
- [ ] Case status `closed` → Rehabilitation plan status `completed`
- [ ] Case status change from active to inactive → Rehabilitation plan status `paused`
- [ ] Database trigger logs show proper status updates
- [ ] Frontend auto-refresh picks up status changes
- [ ] No conflicts with existing triggers

## Migration Instructions

1. **Run the SQL script** in Supabase SQL Editor:
   ```sql
   -- Execute: update-rehab-plan-status-on-case-status-change.sql
   ```

2. **Verify trigger creation**:
   ```sql
   SELECT trigger_name, event_manipulation, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_update_rehab_plan_on_case_status_change';
   ```

3. **Test the functionality**:
   - Update a case status and verify rehabilitation plan status updates
   - Check database logs for trigger execution
   - Verify frontend displays updated statuses
