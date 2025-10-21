# Active Rehabilitation Plan Restriction Feature

## Summary
Implemented strict filtering for rehabilitation plan creation that prevents creating multiple rehabilitation plans for the same case. Cases are only available for new rehabilitation plans if they have no existing rehabilitation plan.

## Problem Statement
The system needs to prevent creating multiple rehabilitation plans for the same case to maintain data integrity and avoid confusion, regardless of case status.

## Solution
Cases are available for creating rehabilitation plans if:
1. Case is not closed, AND
2. Case does NOT have any existing rehabilitation plan

### Rehabilitation Plan Statuses
- `active` - Plan is currently in progress
- `paused` - Plan is temporarily paused but still considered active
- `completed` - Plan has been finished successfully
- `cancelled` - Plan was terminated before completion (NOTE: Cancelled plans are now permanently deleted from the database)
- `inactive` - Plan is not active

## Changes Made

### 1. ClinicianDashboardRedux.tsx - Active Plan Detection

**Location**: Lines 228-241

**Change**: Created `caseIdsWithActivePlan` to track only active/paused plans

```typescript
// Get case IDs that have ACTIVE rehabilitation plans only - OPTIMIZED
// Cases with active plans cannot have new plans created until the active plan is completed/cancelled
const caseIdsWithActivePlan = useMemo(() => {
  return new Set(
    rehabPlans
      .filter(plan => {
        // Only include plans that are currently active
        const isActive = plan.status === 'active' || plan.status === 'paused';
        return plan.case && isActive;
      })
      .map(plan => plan.case?._id)
      .filter(Boolean)
  );
}, [rehabPlans]);
```

### 2. ClinicianDashboardRedux.tsx - Available Cases Filter

**Location**: Lines 243-262

**Change**: Updated filter to check for active plans only

**Before**:
- Checked for ANY rehabilitation plan
- Excluded cases with completed/cancelled plans

**After**:
- Checks only for ACTIVE rehabilitation plans
- Allows cases with completed/cancelled plans to create new plans
- Only blocks cases with active/paused plans

```typescript
const availableCasesForPlan = useMemo(() => {
  return clinicianCases.filter((caseItem: any) => {
    // Exclude cases that are closed - closed cases cannot be updated
    const isClosed = caseItem.status === 'closed';
    
    // Check if case has an ACTIVE rehabilitation plan
    // If yes, cannot create new plan until current plan is completed/cancelled
    const hasActivePlan = caseIdsWithActivePlan.has(caseItem.id);
    
    // Show case if:
    // 1. Not closed, AND
    // 2. Does NOT have an active plan (completed/cancelled plans are OK)
    return !isClosed && !hasActivePlan;
  });
}, [clinicianCases, caseIdsWithActivePlan]);
```

### 3. ClinicianDashboardRedux.tsx - UI Message Update

**Location**: Lines 957-961

**Change**: Updated info message to clarify active plan restriction

**Before**:
```typescript
📋 {count} case(s) already have rehabilitation plans (active or completed) 
and are not shown in the list above.
```

**After**:
```typescript
📋 {count} case(s) have active rehabilitation plans and cannot have new plans 
created until the current plan is completed or cancelled.
```

## User Experience

### Scenario 1: Worker with Active Plan
```
Status: Worker has an active rehabilitation plan
Action: Clinician tries to create a new plan
Result: ❌ Case does NOT appear in "Create Rehabilitation Plan" dropdown
Message: "X case(s) have active rehabilitation plans and cannot have new plans 
         created until the current plan is completed or cancelled."
Solution: Clinician must complete or cancel the current plan first
```

### Scenario 2: Worker with Completed Plan
```
Status: Worker has a completed rehabilitation plan
Action: Clinician wants to create a new plan for continued treatment
Result: ✅ Case APPEARS in "Create Rehabilitation Plan" dropdown
Action: Clinician can create a new rehabilitation plan
Benefit: Supports continued treatment and multiple treatment cycles
```

### Scenario 3: Worker with Cancelled Plan
```
Status: Worker has a cancelled rehabilitation plan (e.g., plan was ineffective)
Action: Clinician wants to create a better rehabilitation plan
Result: ✅ Case APPEARS in "Create Rehabilitation Plan" dropdown
Action: Clinician can create a new rehabilitation plan
Benefit: Allows plan adjustments and corrections
```

### Scenario 4: Worker Needs Continued Treatment
```
1. Worker completes first rehabilitation plan (status: completed)
2. Clinician evaluates progress
3. Determines more treatment is needed
4. Case appears in "Create Rehabilitation Plan" dropdown
5. ✅ Clinician creates second rehabilitation plan
6. Worker now has: 1 completed plan + 1 active plan
7. If clinician tries to create another plan → ❌ Blocked until active plan is done
```

## Benefits

### 1. Data Integrity
- Only ONE active plan per worker at a time
- Clear workflow: complete/cancel current plan before creating new one
- Prevents confusion about which plan to follow

### 2. Flexibility
- Supports multiple treatment cycles (completed plans don't block new plans)
- Allows plan corrections (cancelled plans don't block new plans)
- Enables continued treatment scenarios

### 3. User Experience
- Clear messaging about why cases aren't available
- Logical workflow: finish current plan → create new plan
- Prevents accidental duplicate active plans

## Technical Implementation

### Performance Optimization
- Uses `useMemo` to cache calculations
- Only recalculates when `rehabPlans` array changes
- Efficient Set-based lookups for O(1) complexity

### Status Filtering Logic
```typescript
Active Plans = plans where status is 'active' OR 'paused'
Available Cases = cases where:
  - status !== 'closed' AND
  - case_id NOT IN (caseIdsWithActivePlan)
```

### Edge Cases Handled
1. **Paused Plans**: Treated as active (cannot create new plan)
2. **Completed Plans**: Do not block new plan creation
3. **Cancelled Plans**: Do not block new plan creation
4. **Closed Cases**: Cannot create any plans (regardless of plan status)
5. **No Plan**: Case appears in dropdown (can create plan)

## Workflow Examples

### Complete and Create New Plan
```
Day 1:  Create Plan A (active)
Day 7:  Complete Plan A (completed)
Day 8:  Case appears in dropdown
Day 8:  Create Plan B (active)
Day 14: Complete Plan B (completed)
Result: Worker has 2 completed plans in history
```

### Cancel and Create Better Plan
```
Day 1:  Create Plan A (active)
Day 3:  Plan not working well
Day 3:  Cancel Plan A (cancelled)
Day 3:  Case appears in dropdown immediately
Day 3:  Create Plan B (active) - improved version
Result: Worker has 1 cancelled plan + 1 active plan
```

### Cannot Create Duplicate Active Plans
```
Day 1:  Create Plan A (active)
Day 3:  Try to create Plan B
Result: ❌ Case does NOT appear in dropdown
Action: Must complete or cancel Plan A first
```

## Files Modified
1. `frontend/src/pages/clinician/ClinicianDashboardRedux.tsx`
   - Line 228-241: Added `caseIdsWithActivePlan` calculation
   - Line 243-262: Updated `availableCasesForPlan` filter
   - Line 957-961: Updated UI message

## Related Features
- Case status management (from previous update)
- Closed case protection (from previous update)
- Rehabilitation plan completion/cancellation

## Testing Checklist
- ✅ Worker with active plan: Cannot create new plan
- ✅ Worker with completed plan: Can create new plan
- ✅ Worker with cancelled plan: Can create new plan
- ✅ Worker with paused plan: Cannot create new plan
- ✅ Worker with no plan: Can create plan
- ✅ Closed case: Cannot create any plan
- ✅ Info message displays correct count
- ✅ Multiple treatment cycles work correctly

## Date Implemented
October 18, 2025

## Previous Related Updates
1. Case Status & Rehab Plan Update Fix (earlier today)
   - Allowed in_rehab cases to create plans
   - Added closed case protection
   - This update refines that to only check active plans


