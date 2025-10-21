# Unselected Workers Case Management System

## Overview
Implemented a case management system for unselected workers to prevent them from being selected again until their case is properly closed. This ensures accountability and proper tracking of worker availability.

## Features Added

### 1. **Case Status Tracking**
- **Open**: New unselected worker case (default)
- **In Progress**: Case is being handled
- **Closed**: Case resolved, worker available for assignment again

### 2. **Assignment Prevention Logic**
- **Filtered Selection**: Workers with open unselected cases cannot be selected for new assignments
- **Date-Specific**: Cases are tracked per assignment date
- **Automatic Filtering**: System automatically excludes workers with open cases

### 3. **Case Management Interface**

#### **Unselected Workers Table Enhanced:**
- **Case Status Column**: Shows current status with color-coded chips
- **Close Case Action**: Button to close cases and make workers available
- **Status Colors**:
  - 🔴 **Open**: Red (error)
  - 🟡 **In Progress**: Orange (warning)  
  - 🟢 **Closed**: Green (success)

#### **Assignment Dialog Enhanced:**
- **Already Assigned Section**: Shows workers with pending assignments
- **Open Cases Section**: Shows workers with open unselected cases
- **Clear Messaging**: Explains why workers are not available

### 4. **Case Closure Process**
- **Confirmation Dialog**: "Are you sure you want to close this case?"
- **Success Message**: "Case closed successfully. Worker is now available for assignment."
- **Immediate Update**: Worker becomes available for selection after case closure

## Workflow

### **When Creating Assignments:**
1. **Select Date** - System checks for existing assignments and open cases
2. **View Available Workers** - Only workers without assignments or open cases
3. **See Blocked Workers** - Clear indication of why workers are unavailable
4. **Close Cases** - Use "Close Case" button to resolve issues

### **Case Management:**
1. **Worker Unselected** - Case automatically created with "Open" status
2. **Case Tracking** - Monitor case status in Unselected Workers tab
3. **Case Resolution** - Close case when issue is resolved
4. **Worker Available** - Worker can be selected for new assignments

## Technical Implementation

### **Data Structure:**
```typescript
interface UnselectedWorker {
  id: string;
  worker_id: string;
  assignment_date: string;
  reason: 'sick' | 'on_leave_rdo' | 'transferred' | 'injured_medical' | 'not_rostered';
  notes?: string;
  case_status?: 'open' | 'in_progress' | 'closed'; // New field
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}
```

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
      unselected.case_status !== 'closed'
    )
    .map(unselected => unselected.worker_id);

  return teamMembers.filter(member => 
    !assignedWorkerIds.includes(member.id) && 
    !unselectedWorkerIds.includes(member.id)
  );
};
```

## Benefits

### **Accountability:**
✅ **Prevents Re-selection** - Workers with open cases cannot be selected again  
✅ **Case Tracking** - Clear status of each unselected worker case  
✅ **Audit Trail** - History of why workers were unselected and when cases were closed  

### **Workflow Management:**
✅ **Clear Visibility** - See which workers are blocked and why  
✅ **Easy Case Closure** - One-click case resolution  
✅ **Automatic Updates** - Workers become available immediately after case closure  

### **User Experience:**
✅ **Intuitive Interface** - Clear visual indicators for case status  
✅ **Helpful Messaging** - Explains why workers are not available  
✅ **Efficient Process** - Streamlined case management workflow  

## Usage Examples

### **Scenario 1: Worker Sick**
1. **Day 1**: Worker marked as "Sick" - case status "Open"
2. **Day 2**: Try to assign same worker - blocked from selection
3. **Day 3**: Worker returns, close case - worker available again

### **Scenario 2: Worker on Leave**
1. **Assignment Day**: Worker marked as "On leave / RDO" - case status "Open"
2. **Next Assignment**: Worker not available for selection
3. **Leave Ends**: Close case - worker available for future assignments

### **Scenario 3: Transferred Worker**
1. **Assignment Day**: Worker marked as "Transferred" - case status "Open"
2. **Future Assignments**: Worker blocked until case closed
3. **Case Resolution**: Close case when transfer is confirmed

## Color Coding
- 🔴 **Open Cases**: Red - requires attention
- 🟡 **In Progress**: Orange - being handled
- 🟢 **Closed Cases**: Green - resolved, worker available

This system ensures proper accountability and prevents workers from being accidentally selected when they have unresolved issues! 🎯


















