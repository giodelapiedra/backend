# Rehabilitation Plan Creation - Strict Single Plan Rule

## Summary
Fixed the rehabilitation plan creation filtering to strictly prevent creating multiple rehabilitation plans for the same case, regardless of case status. This ensures data integrity and prevents confusion.

## Problem
Previously, cases with active status (`triaged`, `assessed`, `in_rehab`) could create new rehabilitation plans even if they already had existing plans. This could lead to multiple rehabilitation plans per case, causing confusion and data integrity issues.

## Solution
Implemented strict filtering that only allows cases without ANY existing rehabilitation plan to appear in the "Create Rehabilitation Plan" section.

## Changes Made

### 1. Frontend Changes

#### ClinicianDashboardRedux.tsx
- **Updated `availableCasesForPlan` filtering logic** (lines 275-292):
  - Removed the active status override logic
  - Now strictly filters out cases with ANY existing rehabilitation plan
  - Simplified condition: `!isClosed && !hasAnyPlan`

- **Updated alert messages**:
  - Warning message: "All your assigned cases already have rehabilitation plans. Please complete or cancel existing plans before creating new ones."
  - Info alert: "X case(s) have existing rehabilitation plans and cannot have new plans created until the current plan is completed or cancelled."

### 2. Documentation Updates

#### ACTIVE_REHABILITATION_PLAN_RESTRICTION.md
- **Updated summary** to reflect strict single plan rule
- **Updated problem statement** to focus on preventing multiple plans regardless of status
- **Updated solution** to explain the strict filtering criteria

## Technical Details

### Before (Old Logic)
```typescript
// Allowed cases with active status to create new plans even with existing plans
const hasActiveStatus = ['triaged', 'assessed', 'in_rehab'].includes(caseItem.status);
return !isClosed && (!hasAnyPlan || hasActiveStatus);
```

### After (New Logic)
```typescript
// Strictly prevents multiple plans per case
return !isClosed && !hasAnyPlan;
```

## Case Availability Rules

| Case Status | Has Existing Plan | Available for New Plan? | Reason |
|-------------|-------------------|------------------------|---------|
| `new` | No | ✅ Yes | No existing plan |
| `new` | Yes | ❌ No | Has existing plan |
| `triaged` | No | ✅ Yes | No existing plan |
| `triaged` | Yes | ❌ No | Has existing plan |
| `assessed` | No | ✅ Yes | No existing plan |
| `assessed` | Yes | ❌ No | Has existing plan |
| `in_rehab` | No | ✅ Yes | No existing plan |
| `in_rehab` | Yes | ❌ No | Has existing plan |
| `return_to_work` | No | ✅ Yes | No existing plan |
| `return_to_work` | Yes | ❌ No | Has existing plan |
| `closed` | Any | ❌ No | Closed cases cannot be modified |

## Benefits

1. **Data Integrity**: Prevents multiple rehabilitation plans per case
2. **User Clarity**: Clear indication that existing plans must be completed/cancelled first
3. **Consistency**: Uniform behavior regardless of case status
4. **Prevention**: Stops potential confusion about which plan is current
5. **Workflow Control**: Forces proper plan lifecycle management

## User Experience Impact

- **Before**: Cases with active status could create new plans even with existing plans
- **After**: Only cases without ANY rehabilitation plan can create new plans
- **Message**: Clear warning when no cases are available for plan creation
- **Action Required**: Users must complete or cancel existing plans before creating new ones

## Database Trigger Integration

The database trigger for updating rehabilitation plan status when case status changes is still useful for:
- Maintaining data consistency between case status and plan status
- Automatic status updates when case status changes
- Audit trail of status changes

However, it doesn't affect the ability to create new plans - that's controlled by the frontend filtering.

## Testing Checklist

- [ ] Cases with no existing plan appear in "Create Rehabilitation Plan"
- [ ] Cases with existing plan + `triaged` status don't appear
- [ ] Cases with existing plan + `assessed` status don't appear  
- [ ] Cases with existing plan + `in_rehab` status don't appear
- [ ] Cases with existing plan + `return_to_work` status don't appear
- [ ] Cases with existing plan + `closed` status don't appear
- [ ] Warning message shows when no cases available
- [ ] Info alert shows count of cases with existing plans
- [ ] Create button is disabled when no cases available
- [ ] Database trigger still updates plan status when case status changes
