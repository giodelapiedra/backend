# Return to Work Status Implementation

## Overview
Added return to work status tracking to the incidents system to provide better visibility into worker recovery and return to work status.

## Database Changes

### 1. Added `return_to_work` Column to Incidents Table
```sql
ALTER TABLE public.incidents 
ADD COLUMN return_to_work boolean DEFAULT false;
```

### 2. Created Indexes for Performance
```sql
-- Index for filtering by return_to_work status
CREATE INDEX IF NOT EXISTS idx_incidents_return_to_work 
ON public.incidents (return_to_work);

-- Composite index for worker_id and return_to_work
CREATE INDEX IF NOT EXISTS idx_incidents_worker_return_to_work 
ON public.incidents (worker_id, return_to_work);
```

### 3. Automatic Status Update Trigger
Created a trigger function that automatically updates the incident's `return_to_work` status when the related case status changes:

- **When case status changes to 'return_to_work' or 'closed'**: Sets `return_to_work = true`
- **When case status changes from 'return_to_work' or 'closed' to something else**: Sets `return_to_work = false`

## Frontend Changes

### 1. Updated Incident Interface
Added new fields to the `Incident` interface:
```typescript
interface Incident {
  // ... existing fields
  return_to_work?: boolean;
  case_id?: string;
}
```

### 2. Enhanced Dashboard Statistics
Added new statistics to track return to work status:
- `returnedToWork`: Count of incidents where worker has returned to work
- `onRestrictedDuty`: Count of incidents where worker is still on restricted duty

### 3. Updated Incidents Table
- Added "Return to Work" column showing status with color-coded chips
- Green "Returned" chip for workers who have returned to work
- Orange "Restricted" chip for workers still on restricted duty

### 4. Enhanced Incident Details Dialog
- Added dedicated "Work Status" section with visual indicators
- Shows clear status with appropriate icons and colors
- Displays related case ID when available

### 5. New Dashboard Cards
Replaced compliance rate card with two new cards:
- **Returned to Work**: Shows count of workers who have returned to work
- **On Restricted Duty**: Shows count of workers still on restricted duty

## Benefits

### 1. Better Visibility
- Site supervisors can quickly see which workers have returned to work
- Clear visual indicators for work status
- Real-time updates when case status changes

### 2. Improved Workflow
- Automatic status updates reduce manual work
- Consistent data between cases and incidents
- Better tracking of recovery progress

### 3. Enhanced Reporting
- Dashboard statistics provide quick overview
- Better data for compliance reporting
- Clear audit trail of return to work status

## Usage

### For Site Supervisors
1. View incidents table to see return to work status
2. Check dashboard cards for quick statistics
3. Click on incident details to see full work status information

### For System Administrators
1. Run the migration script to add the new column
2. The trigger will automatically handle status updates
3. Existing incidents will be updated based on their case status

## Technical Notes

### Database Migration
Run the `add-return-to-work-status-to-incidents.sql` script to:
- Add the new column
- Create performance indexes
- Set up automatic triggers
- Update existing data

### Frontend Updates
The Site Supervisor Dashboard now includes:
- Return to work status in incidents table
- New dashboard statistics cards
- Enhanced incident details dialog
- Real-time status updates

### Data Flow
1. Team clinician closes case with "return_to_work" status
2. Database trigger automatically updates incident's `return_to_work` field
3. Frontend displays updated status in real-time
4. Dashboard statistics reflect current status

## Future Enhancements
- Add return to work date tracking
- Implement return to work notifications
- Add return to work analytics and reporting
- Create return to work workflow management

