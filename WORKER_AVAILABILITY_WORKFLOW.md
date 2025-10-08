# Worker Availability Workflow

## Overview
Complete workflow showing how workers become available for assignment again after their unselected cases are closed.

## Workflow Steps

### **Step 1: Worker Unselected**
- **Action**: Team leader creates assignment but doesn't select a worker
- **Result**: Worker appears in "Unselected Workers" with reason (Sick, On leave, etc.)
- **Status**: Case status = "Open"
- **Availability**: Worker is **NOT available** for new assignments

### **Step 2: Case Management**
- **Location**: "Unselected Workers" tab
- **Display**: Worker shows with "Close Case" button
- **Status**: Case status = "Open" (red chip)
- **Availability**: Worker is **NOT available** for new assignments

### **Step 3: Case Closure**
- **Action**: Click "Close Case" button
- **Confirmation**: "Close case for [Worker Name]? Reason: [Reason]"
- **Result**: Worker is removed from "Unselected Workers" list
- **Status**: Case is closed and removed from system
- **Availability**: Worker is **NOW AVAILABLE** for new assignments

### **Step 4: Worker Available for Assignment**
- **Location**: "Create Work Readiness Assignment" dialog
- **Display**: Worker appears in "Select Team Members" section
- **Status**: No longer blocked by unselected case
- **Availability**: Worker can be selected for new assignments

## Technical Implementation

### **Filtering Logic:**
```javascript
const getAvailableTeamMembers = () => {
  // Filter out workers with pending assignments
  const assignedWorkerIds = assignments
    .filter(assignment => 
      assignment.assigned_date === assignedDate && 
      assignment.status === 'pending'
    )
    .map(assignment => assignment.worker_id);

  // Filter out workers with open unselected cases
  const unselectedWorkerIds = unselectedWorkers
    .filter(unselected => 
      unselected.assignment_date === assignedDate && 
      unselected.case_status !== 'closed'  // Only open cases block selection
    )
    .map(unselected => unselected.worker_id);

  return teamMembers.filter(member => 
    !assignedWorkerIds.includes(member.id) && 
    !unselectedWorkerIds.includes(member.id)
  );
};
```

### **Case Closure Logic:**
```javascript
const handleCloseCase = async (unselectedWorkerId: string) => {
  // Remove worker from unselectedWorkers list completely
  const updatedUnselectedWorkers = unselectedWorkers.filter(worker => 
    worker.id !== unselectedWorkerId
  );
  setUnselectedWorkers(updatedUnselectedWorkers);
  
  // Worker is now available for assignment
};
```

## User Experience

### **Before Case Closure:**
❌ **Worker appears in "Unselected Workers" tab**  
❌ **Worker does NOT appear in "Select Team Members"**  
❌ **Worker is blocked from assignment selection**  
❌ **Case status shows "Open" (red chip)**  

### **After Case Closure:**
✅ **Worker disappears from "Unselected Workers" tab**  
✅ **Worker appears in "Select Team Members"**  
✅ **Worker can be selected for new assignments**  
✅ **No blocking - case is completely resolved**  

## Example Scenarios

### **Scenario 1: Worker Sick**
1. **Day 1**: Worker marked as "Sick" - case created
2. **Day 2**: Try to assign same worker - blocked from selection
3. **Day 3**: Worker returns, close case - worker available again
4. **Day 4**: Worker can be selected for new assignments

### **Scenario 2: Worker on Leave**
1. **Assignment Day**: Worker marked as "On leave / RDO"
2. **Next Assignment**: Worker not available for selection
3. **Leave Ends**: Close case - worker available for future assignments
4. **Future Assignments**: Worker can be selected normally

### **Scenario 3: Transferred Worker**
1. **Assignment Day**: Worker marked as "Transferred"
2. **Future Assignments**: Worker blocked until case closed
3. **Transfer Confirmed**: Close case - worker available again
4. **New Assignments**: Worker can be selected if still in team

## Visual Indicators

### **Unselected Workers Tab:**
- **Open Cases**: Red "Open" chip + "Close Case" button
- **Closed Cases**: Removed from list completely
- **Tab Count**: Only shows open cases

### **Assignment Dialog:**
- **Available Workers**: Can be selected (checkbox enabled)
- **Blocked Workers**: Shown in "Workers with Open Cases" section
- **Clear Messaging**: Explains why workers are not available

### **Case Closure:**
- **Button**: Green "Close Case" button
- **Confirmation**: Shows worker name and reason
- **Success**: "✅ Case closed successfully! [Worker] is now available for assignment."

## Benefits

✅ **Clear Workflow**: Step-by-step process from unselected to available  
✅ **Immediate Availability**: Workers become available instantly after case closure  
✅ **No Confusion**: Clear visual indicators of worker status  
✅ **Efficient Process**: One-click case closure  
✅ **Audit Trail**: Complete history of why workers were unselected  
✅ **Flexible Management**: Cases can be closed when issues are resolved  

## Summary

**Yes, when you close a case, the worker becomes available for selection again in the "Create Work Readiness Assignment" dialog!** 🎯

The system automatically:
1. **Removes** the worker from "Unselected Workers" list
2. **Makes** the worker available in "Select Team Members"
3. **Updates** all counts and displays
4. **Shows** success message confirming availability

The workflow is now complete and user-friendly! ✨






