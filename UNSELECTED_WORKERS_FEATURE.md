# Unselected Workers Feature for Work Readiness Assignments

## Overview
This feature allows team leaders to specify reasons for workers who are not selected for work readiness assignments, providing better tracking and accountability.

## Features Added

### 1. Database Schema
- **New Table**: `unselected_workers`
- **Columns**:
  - `id` (UUID, Primary Key)
  - `team_leader_id` (UUID, Foreign Key to users)
  - `worker_id` (UUID, Foreign Key to users)
  - `assignment_date` (DATE)
  - `reason` (VARCHAR, Enum: sick, on_leave_rdo, transferred, injured_medical, not_rostered)
  - `notes` (TEXT, Optional)
  - `created_at`, `updated_at` (Timestamps)

### 2. Backend API Updates
- **Enhanced `createAssignments` endpoint** to accept `unselectedWorkers` array
- **New endpoint**: `GET /api/work-readiness-assignments/unselected` to fetch unselected workers
- **Automatic saving** of unselected worker reasons when creating assignments

### 3. Frontend UI Enhancements

#### Assignment Creation Dialog
- **Worker Selection Section**: Shows all team members with checkboxes
- **Unselected Workers Section**: 
  - Automatically appears for workers not selected
  - Requires reason selection for each unselected worker
  - Optional notes field for additional details
  - Validation ensures all unselected workers have reasons

#### Reason Options
1. **Sick** - Worker is currently sick
2. **On leave / RDO** - Worker is on leave or RDO (Rostered Day Off)
3. **Transferred to another site** - Worker has been transferred
4. **Injured / Medical** - Worker is injured or has medical issues
5. **Not rostered** - Worker is not scheduled for work

#### Unselected Workers Display
- **New section** in the main assignments page
- **Table view** showing:
  - Worker name and email
  - Assignment date
  - Reason (with color-coded chips)
  - Additional notes
- **Filtered by date** to match assignment filters

## User Workflow

### For Team Leaders
1. **Navigate** to Work Readiness Assignments page
2. **Click "Create Assignment"**
3. **Select workers** for assignment (checkboxes)
4. **Specify reasons** for unselected workers (required)
5. **Add optional notes** for additional context
6. **Submit** - both assignments and unselected reasons are saved

### Validation
- At least one worker must be selected
- All unselected workers must have a reason specified
- Clear error messages guide the user

## Technical Implementation

### Database Setup
Run the SQL script: `create-unselected-workers-table.sql`

### API Endpoints
- `POST /api/work-readiness-assignments` - Enhanced to handle unselected workers
- `GET /api/work-readiness-assignments/unselected` - Fetch unselected workers

### Frontend Components
- Enhanced `WorkReadinessAssignmentManager.tsx`
- Updated `BackendAssignmentAPI.ts` utility

## Benefits
1. **Accountability**: Clear tracking of why workers weren't assigned
2. **Compliance**: Ensures all workers are accounted for
3. **Reporting**: Better insights into team availability
4. **Audit Trail**: Historical record of assignment decisions
5. **Fairness**: Transparent process for work readiness assignments

## Usage Example
```
Team has 25 members
Team leader selects 20 for assignment
System requires reasons for the 5 unselected:
- 2 workers: Sick
- 1 worker: On leave / RDO  
- 1 worker: Transferred to another site
- 1 worker: Not rostered
```

## Future Enhancements
- Export functionality for unselected workers data
- Analytics dashboard for team availability trends
- Integration with HR systems for leave tracking
- Automated notifications for workers returning from leave








