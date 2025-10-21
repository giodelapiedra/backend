# Rehabilitation Plan Creation Filtering Fix

## Summary
Fixed the "Create Rehabilitation Plan" section to properly exclude cases that already have any existing rehabilitation plan (active, completed, or cancelled) from appearing in the case selection dropdown.

## Problem
Previously, the system only filtered out cases with **active** rehabilitation plans, allowing cases with completed or cancelled plans to still appear in the "Create Rehabilitation Plan" section. This could lead to:
- Confusion about which plan is current
- Potential data integrity issues
- Multiple plans for the same case

## Solution
Updated the filtering logic to exclude cases that have **ANY** rehabilitation plan, regardless of status.

## Changes Made

### 1. Frontend Changes

#### ClinicianDashboardRedux.tsx
- **Updated `caseIdsWithAnyPlan` calculation** (lines 261-282):
  - Changed from filtering only active plans to including ALL plans regardless of status
  - Renamed variable from `caseIdsWithActivePlan` to `caseIdsWithAnyPlan` for clarity

- **Updated `availableCasesForPlan` filtering** (lines 284-302):
  - Now excludes cases with ANY existing rehabilitation plan
  - Updated comments to reflect new behavior

- **Updated alert messages**:
  - Changed warning message to reflect that ALL cases with existing plans are excluded
  - Updated info alert to mention "existing rehabilitation plans" instead of "active plans"

- **Removed redundant code**:
  - Removed unused `caseIdsWithActivePlans` variable

### 2. Documentation Updates

#### ACTIVE_REHABILITATION_PLAN_RESTRICTION.md
- **Updated summary** to reflect new behavior
- **Updated problem statement** to focus on data integrity
- **Updated solution** to mention filtering ANY rehabilitation plan

## Technical Details

### Before (Old Logic)
```typescript
// Only filtered out ACTIVE plans
const caseIdsWithActivePlan = useMemo(() => {
  return new Set(
    rehabPlans
      .filter(plan => {
        const isActive = plan.status === 'active' || plan.status === 'paused';
        return plan.case && isActive;
      })
      .map(plan => plan.case?._id)
      .filter(Boolean)
  );
}, [rehabPlans]);
```

### After (New Logic)
```typescript
// Filters out ALL plans regardless of status
const caseIdsWithAnyPlan = useMemo(() => {
  return new Set(
    rehabPlans
      .filter(plan => {
        // Include ALL plans regardless of status
        return plan.case;
      })
      .map(plan => plan.case?._id)
      .filter(Boolean)
  );
}, [rehabPlans]);
```

## Benefits

1. **Data Integrity**: Prevents multiple rehabilitation plans per case
2. **User Clarity**: Clear indication that cases with existing plans cannot have new plans created
3. **Consistency**: Uniform behavior regardless of plan status
4. **Prevention**: Stops potential confusion about which plan is current

## User Experience Impact

- **Before**: Cases with completed/cancelled plans could still appear in "Create Rehabilitation Plan"
- **After**: Only cases without ANY rehabilitation plan appear in the dropdown
- **Message**: Clear warning when no cases are available for plan creation

## Testing Checklist

- [ ] Cases with active plans don't appear in "Create Rehabilitation Plan"
- [ ] Cases with completed plans don't appear in "Create Rehabilitation Plan"  
- [ ] Cases with cancelled plans don't appear in "Create Rehabilitation Plan"
- [ ] Cases without any rehabilitation plan appear in "Create Rehabilitation Plan"
- [ ] Warning message shows when no cases are available
- [ ] Info alert shows count of cases with existing plans
- [ ] Create button is disabled when no cases are available
