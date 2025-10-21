# Case Status & Rehabilitation Plan Update Fix

## Summary
Implemented fixes to allow clinicians to create new rehabilitation plans when a case is updated back to "in_rehab" status, and prevent status updates for closed cases.

## Changes Made

### 1. ClinicianDashboardRedux.tsx
**Location**: `frontend/src/pages/clinician/ClinicianDashboardRedux.tsx` (lines 238-257)

**Change**: Updated the `availableCasesForPlan` filter logic

**Before**:
- Excluded cases with 'closed' OR 'return_to_work' status
- Excluded cases that already have any rehabilitation plan

**After**:
- Only excludes cases with 'closed' status
- Allows 'in_rehab' status cases to always appear, even if they have an existing plan
- For other statuses, still excludes cases with existing plans

**Rationale**: 
When a clinician updates a case back to "in_rehab" status (e.g., for continued treatment), they should be able to create a new rehabilitation plan even if one already exists. This supports ongoing treatment scenarios.

```typescript
const availableCasesForPlan = useMemo(() => {
  return clinicianCases.filter((caseItem: any) => {
    // Exclude cases that are closed - closed cases cannot be updated
    const isClosed = caseItem.status === 'closed';
    
    // Allow 'in_rehab' status cases to always appear (even with existing plan)
    const isInRehab = caseItem.status === 'in_rehab';
    
    // For non-in_rehab cases, exclude if they have an existing plan
    const hasExistingPlan = caseIdsWithAnyPlan.has(caseItem.id);
    
    // Show case if:
    // 1. Not closed, AND
    // 2. Either in_rehab status OR doesn't have an existing plan
    return !isClosed && (isInRehab || !hasExistingPlan);
  });
}, [clinicianCases, caseIdsWithAnyPlan]);
```

### 2. CaseDetails.tsx
**Location**: `frontend/src/pages/CaseDetails.tsx` (lines 986-992)

**Change**: Updated `canUpdateStatus` to prevent status updates for closed cases

**Before**:
- Only checked user role (case_manager or clinician)

**After**:
- Checks user role AND case status
- Returns false if case status is 'closed'

**Rationale**:
Once a case is closed, it should not be possible to change its status. This maintains data integrity and prevents accidental reopening of closed cases.

```typescript
const canUpdateStatus = useMemo(() => {
  // Cannot update status if case is closed
  if (caseData?.status === 'closed') {
    return false;
  }
  return user?.role === 'case_manager' || user?.role === 'clinician';
}, [user?.role, caseData?.status]);
```

**Additional UI Enhancement**:
- Added Tooltip to "Update Status" button showing why it's disabled when case is closed
- The button now shows a disabled state with appropriate styling when case is closed

## User Experience Improvements

### For Clinicians:
1. **Create Rehabilitation Plan Section**:
   - Cases with "in_rehab" status will now appear in the "Create Rehabilitation Plan" section
   - This allows clinicians to create new plans for cases requiring continued treatment
   - Closed cases will NOT appear (maintaining proper workflow)

2. **Status Update Controls**:
   - "Update Status" button is disabled (grayed out) when viewing closed cases
   - Tooltip explains why the action is unavailable
   - "Return to Work" button only appears for in_rehab cases (and not for closed cases)

### For Case Managers:
- Same restrictions apply for status updates on closed cases
- Prevents accidental reopening or modification of closed cases

## Workflow Example

### Scenario: Continued Treatment
1. Case Manager creates a case (status: "new")
2. Clinician assesses and creates initial rehab plan (status: "in_rehab")
3. Worker completes rehab plan
4. Clinician evaluates and determines more treatment needed
5. Clinician updates case status back to "in_rehab"
6. **NEW**: Case now appears in "Create Rehabilitation Plan" section again
7. Clinician creates a new rehabilitation plan for continued treatment

### Scenario: Closed Case Protection
1. Case is marked as "closed" (worker fully recovered)
2. **NEW**: "Update Status" button is disabled
3. Tooltip explains: "Cannot update status - case is closed"
4. Users cannot accidentally reopen or modify the closed case
5. Case data remains protected and unchangeable

## Technical Details

### Dependencies Updated:
- Uses existing `useMemo` hooks for performance optimization
- No new dependencies added
- Leverages existing state management

### Performance Considerations:
- Filter logic is memoized and only recalculates when dependencies change
- No additional API calls required
- UI updates are instant based on existing data

## Testing Recommendations

1. **Test Case Reappearance**:
   - Create a case and rehab plan
   - Complete the rehab plan
   - Update case status to "in_rehab"
   - Verify case appears in "Create Rehabilitation Plan" section

2. **Test Closed Case Protection**:
   - Close a case
   - Verify "Update Status" button is disabled
   - Verify tooltip message appears
   - Verify "Return to Work" button doesn't appear

3. **Test Normal Workflow**:
   - Verify new cases still appear correctly
   - Verify cases with plans don't appear unless status is "in_rehab"
   - Verify status updates work normally for non-closed cases

## Files Modified
1. `frontend/src/pages/clinician/ClinicianDashboardRedux.tsx`
2. `frontend/src/pages/CaseDetails.tsx`

## Date Implemented
October 18, 2025


