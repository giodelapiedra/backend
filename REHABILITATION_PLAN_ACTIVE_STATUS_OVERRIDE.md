# Rehabilitation Plan Creation - Active Status Override

## Summary
Updated the rehabilitation plan creation filtering logic to allow cases with active statuses (`triaged`, `assessed`, `in_rehab`) to appear in the "Create Rehabilitation Plan" section, even if they already have existing rehabilitation plans.

## Problem
Previously, cases with any existing rehabilitation plan were completely excluded from the "Create Rehabilitation Plan" section. However, when a clinician updates a case status to `triaged`, `assessed`, or `in_rehab`, the case should become available again for creating new rehabilitation plans, as these statuses indicate the case is active and may need a new plan.

## Solution
Implemented intelligent filtering that considers both case status and existing plans:
- Cases with no existing rehabilitation plans are always available (if not closed)
- Cases with existing plans become available again when their status is updated to `triaged`, `assessed`, or `in_rehab`

## Changes Made

### 1. Frontend Changes

#### ClinicianDashboardRedux.tsx
- **Updated `availableCasesForPlan` filtering logic** (lines 275-295):
  - Added check for active status: `['triaged', 'assessed', 'in_rehab']`
  - Modified condition to: `!isClosed && (!hasAnyPlan || hasActiveStatus)`
  - Updated comments to reflect new behavior

- **Updated alert messages**:
  - Warning message now explains the new criteria
  - Info alert clarifies that cases with active status can still have new plans created

### 2. Documentation Updates

#### ACTIVE_REHABILITATION_PLAN_RESTRICTION.md
- **Updated summary** to reflect intelligent filtering
- **Updated problem statement** to focus on balancing restrictions with flexibility
- **Updated solution** to explain the new criteria

## Technical Details

### Before (Old Logic)
```typescript
// Only cases without ANY rehabilitation plan were available
return !isClosed && !hasAnyPlan;
```

### After (New Logic)
```typescript
// Cases are available if they have no plan OR have active status
const hasActiveStatus = ['triaged', 'assessed', 'in_rehab'].includes(caseItem.status);
return !isClosed && (!hasAnyPlan || hasActiveStatus);
```

## Case Status Behavior

| Case Status | Has Existing Plan | Available for New Plan? | Reason |
|-------------|-------------------|------------------------|---------|
| `new` | No | ✅ Yes | No existing plan |
| `new` | Yes | ❌ No | Has existing plan, not active status |
| `triaged` | No | ✅ Yes | No existing plan |
| `triaged` | Yes | ✅ Yes | Active status override |
| `assessed` | No | ✅ Yes | No existing plan |
| `assessed` | Yes | ✅ Yes | Active status override |
| `in_rehab` | No | ✅ Yes | No existing plan |
| `in_rehab` | Yes | ✅ Yes | Active status override |
| `return_to_work` | No | ✅ Yes | No existing plan |
| `return_to_work` | Yes | ❌ No | Has existing plan, not active status |
| `closed` | Any | ❌ No | Closed cases cannot be modified |

## Benefits

1. **Flexibility**: Clinicians can create new plans for active cases
2. **Workflow Support**: Cases become available when status changes to active states
3. **Data Integrity**: Still prevents unnecessary multiple plans for inactive cases
4. **User Experience**: Clear indication of when cases are available

## User Experience Impact

- **Before**: Cases with existing plans were permanently excluded
- **After**: Cases with existing plans become available when status is updated to active states
- **Message**: Clear explanation of availability criteria

## Testing Checklist

- [ ] Cases with no existing plan appear in "Create Rehabilitation Plan"
- [ ] Cases with existing plan + `triaged` status appear in "Create Rehabilitation Plan"
- [ ] Cases with existing plan + `assessed` status appear in "Create Rehabilitation Plan"
- [ ] Cases with existing plan + `in_rehab` status appear in "Create Rehabilitation Plan"
- [ ] Cases with existing plan + `return_to_work` status don't appear
- [ ] Cases with existing plan + `closed` status don't appear
- [ ] Warning message shows correct criteria when no cases available
- [ ] Info alert explains active status override
