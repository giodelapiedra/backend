# Work Readiness Assignment System

## Overview
Ang bagong Work Readiness Assignment System ay nagbibigay ng mas organized at controlled na paraan para sa Team Leaders na mag-assign ng work readiness submissions sa kanilang team members.

## Key Features

### Para sa Team Leaders:
1. **Assignment Management**
   - Mag-assign ng work readiness tasks sa specific workers
   - Set ng assigned date at due time
   - Add notes or special instructions
   - View at track ang status ng lahat ng assignments
   - Cancel assignments kung kinakailangan

2. **Monitoring & Tracking**
   - Real-time status tracking (Pending, Completed, Overdue, Cancelled)
   - Filter assignments by date at status
   - View completion rates at statistics
   - Automatic marking ng overdue assignments

3. **Bulk Assignment**
   - Assign multiple workers at the same time
   - Set same due date/time para sa lahat
   - Add common notes para sa batch assignments

### Para sa Workers:
1. **Assignment Notifications**
   - Makikita ang assigned work readiness tasks
   - Clear na due date at time
   - Notes from team leader
   - Status tracking ng submissions

2. **Easy Submission**
   - Direct link to work readiness form
   - Automatic marking as completed after submission
   - View assignment history

## Database Schema

### work_readiness_assignments Table
```sql
- id: UUID (Primary Key)
- team_leader_id: UUID (Foreign Key to users)
- worker_id: UUID (Foreign Key to users)
- assigned_date: DATE
- due_time: TIME
- team: TEXT
- status: TEXT (pending, completed, overdue, cancelled)
- notes: TEXT (optional)
- reminder_sent: BOOLEAN
- completed_at: TIMESTAMP
- work_readiness_id: UUID (Foreign Key to work_readiness)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## API Methods

### SupabaseAPI Methods:

1. **createWorkReadinessAssignments**
   ```typescript
   await SupabaseAPI.createWorkReadinessAssignments(
     teamLeaderId: string,
     workerIds: string[],
     assignedDate: Date,
     team: string,
     notes?: string,
     dueTime?: string
   );
   ```

2. **getWorkReadinessAssignments**
   ```typescript
   await SupabaseAPI.getWorkReadinessAssignments(
     teamLeaderId: string,
     date?: Date,
     status?: string
   );
   ```

3. **getWorkerAssignments**
   ```typescript
   await SupabaseAPI.getWorkerAssignments(
     workerId: string,
     date?: Date,
     status?: string
   );
   ```

4. **getTodayAssignment**
   ```typescript
   await SupabaseAPI.getTodayAssignment(workerId: string);
   ```

5. **updateAssignmentStatus**
   ```typescript
   await SupabaseAPI.updateAssignmentStatus(
     assignmentId: string,
     status: string,
     notes?: string,
     workReadinessId?: string
   );
   ```

6. **cancelAssignment**
   ```typescript
   await SupabaseAPI.cancelAssignment(assignmentId: string);
   ```

7. **markOverdueAssignments**
   ```typescript
   await SupabaseAPI.markOverdueAssignments();
   ```

8. **getAssignmentStats**
   ```typescript
   await SupabaseAPI.getAssignmentStats(
     teamLeaderId: string,
     startDate?: Date,
     endDate?: Date
   );
   ```

## Setup Instructions

### 1. Create Database Table
Run the SQL script sa Supabase SQL Editor:
```bash
create-work-readiness-assignments-table.sql
```

### 2. Import Component
```typescript
import WorkReadinessAssignmentManager from '../components/WorkReadinessAssignmentManager';
```

### 3. Use in Team Leader Dashboard
```typescript
<WorkReadinessAssignmentManager 
  teamLeaderId={user.id} 
  team={user.team} 
/>
```

## Usage Flow

### Team Leader Workflow:
1. Open Assignment Manager
2. Click "Create Assignment" button
3. Select date at time
4. Add optional notes
5. Select workers to assign
6. Click "Create Assignments"
7. Monitor status ng assignments
8. Cancel kung kinakailangan

### Worker Workflow:
1. View assigned tasks sa dashboard
2. Click on assignment to see details
3. Submit work readiness form
4. Assignment automatically marked as completed

## Status Definitions

- **Pending**: Assignment created, waiting for submission
- **Completed**: Worker submitted work readiness
- **Overdue**: Past due date, not yet submitted
- **Cancelled**: Assignment cancelled by team leader

## Benefits

1. **Better Control**: Team leader decides kung sino ang mag-submit
2. **Accountability**: Clear tracking kung sino ang nag-submit at hindi
3. **Compliance**: Easier to ensure lahat ng required workers ay nag-submit
4. **Organization**: Structured approach sa work readiness monitoring
5. **Reporting**: Better data para sa analytics at compliance reports

## Future Enhancements

1. **Automatic Reminders**: Send notifications before due time
2. **Recurring Assignments**: Set daily/weekly automatic assignments
3. **Bulk Actions**: Cancel or modify multiple assignments at once
4. **Assignment Templates**: Save common assignment patterns
5. **Mobile Notifications**: Push notifications para sa workers
6. **Integration**: Link with attendance or shift scheduling systems

## Support

For questions or issues, contact your system administrator or refer to the main documentation.
