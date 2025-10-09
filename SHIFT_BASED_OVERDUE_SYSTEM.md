# Shift-Based Overdue Assignment System

## 🎯 **What Was Implemented:**

### **1. Backend Overdue Logic Updates**
- **ScheduledJobRunner.js**: Updated cron job to use shift-based deadlines
- **workReadinessAssignmentController.js**: Updated manual overdue checking
- **supabaseApi.ts**: Updated frontend overdue marking

### **2. Shift-Based Overdue Logic**
- **Before**: Used hardcoded date comparison (`assigned_date < today`)
- **After**: Uses actual `due_time` from shift-based deadline calculation

## 🔧 **How It Works Now:**

### **Old Logic (Date-Based):**
```javascript
// Mark assignments as overdue if assigned_date < today
.lt('assigned_date', today)
.eq('status', 'pending')
```

### **New Logic (Shift-Based):**
```javascript
// Get all pending assignments with their due times
const { data: pendingAssignments } = await supabaseAdmin
  .from('work_readiness_assignments')
  .select('id, due_time, assigned_date, team_leader_id')
  .eq('status', 'pending');

const now = new Date();
const overdueAssignmentIds = [];

// Check each assignment against its actual due time
for (const assignment of pendingAssignments) {
  const dueTime = new Date(assignment.due_time);
  
  // If current time is past the due time, mark as overdue
  if (now > dueTime) {
    overdueAssignmentIds.push(assignment.id);
  }
}

// Mark overdue assignments
.update({ status: 'overdue' })
.in('id', overdueAssignmentIds)
```

## 🚀 **Benefits:**

### **1. Accurate Overdue Detection**
- **Midnight Shift**: Assignment due at 08:00:00 - marked overdue after 8 AM
- **Morning Shift**: Assignment due at 14:00:00 - marked overdue after 2 PM
- **Night Shift**: Assignment due at 05:00:00 next day - marked overdue after 5 AM

### **2. Real-Time Overdue Checking**
- **Cron Job**: Runs automatically to check overdue assignments
- **Manual Check**: Can be triggered manually via API
- **Real-Time**: Checks actual due times, not just dates

### **3. Detailed Logging**
```
🕐 Assignment abc123 is overdue (due: 2025-10-09T08:00:00.000Z, now: 2025-10-09T10:30:00.000Z)
✅ Marked 3 assignments as overdue (shift-based deadline check)
```

## 📋 **Example Scenarios:**

### **Scenario 1: Midnight Shift Team Leader**
- **Assignment Created**: 10/9/2025 at 2:00 AM
- **Due Time**: 10/9/2025 at 8:00 AM (end of Midnight Shift)
- **Overdue Check**: 10/9/2025 at 10:00 AM
- **Result**: ✅ Marked as overdue (2 hours past deadline)

### **Scenario 2: Morning Shift Team Leader**
- **Assignment Created**: 10/9/2025 at 8:00 AM
- **Due Time**: 10/9/2025 at 2:00 PM (end of Morning Shift)
- **Overdue Check**: 10/9/2025 at 1:00 PM
- **Result**: ❌ Still pending (1 hour before deadline)

### **Scenario 3: Night Shift Team Leader**
- **Assignment Created**: 10/9/2025 at 10:00 PM
- **Due Time**: 10/10/2025 at 5:00 AM (end of Night Shift)
- **Overdue Check**: 10/10/2025 at 6:00 AM
- **Result**: ✅ Marked as overdue (1 hour past deadline)

## 🔄 **System Integration:**

### **1. Automatic Cron Job**
- **Frequency**: Daily (configurable)
- **Time**: Early morning (e.g., 6:00 AM)
- **Function**: `markOverdueAssignments()`
- **Logging**: Detailed overdue detection logs

### **2. Manual API Endpoint**
- **Endpoint**: `POST /api/work-readiness-assignments/mark-overdue`
- **Access**: Admin only or system calls
- **Response**: Count of marked overdue assignments

### **3. Frontend Integration**
- **Function**: `SupabaseAPI.markOverdueAssignments()`
- **Usage**: Manual overdue checking from frontend
- **Logging**: Console logs for debugging

## ✅ **Updated Files:**

1. **backend/services/ScheduledJobRunner.js**
   - Updated `markOverdueAssignments()` method
   - Added shift-based deadline checking
   - Enhanced logging

2. **backend/controllers/workReadinessAssignmentController.js**
   - Updated `markOverdueAssignments` endpoint
   - Added shift-based overdue logic
   - Fixed variable naming conflicts

3. **frontend/src/utils/supabaseApi.ts**
   - Updated `markOverdueAssignments()` method
   - Added shift-based deadline checking
   - Enhanced error handling

## 🎯 **Key Features:**

- **Accurate Deadlines**: Based on actual shift end times
- **Real-Time Checking**: Compares current time with due time
- **Detailed Logging**: Shows exact overdue times
- **Idempotent**: Safe to run multiple times
- **Performance**: Efficient batch processing

**The overdue assignment system now works with shift-based deadlines!** 🎉

Workers will be marked as overdue exactly when their team leader's shift ends, not at arbitrary midnight times.
