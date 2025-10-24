# Case Assignment Data Flow

## Kapag nag-assign ang Case Manager ng case sa Clinician, saan napupunta ang data?

### 1. **Data Storage Locations**

#### A. **localStorage (Temporary Storage)**
- **Key**: `all_case_assignments`
- **Location**: Browser localStorage
- **Purpose**: Temporary storage until `clinician_id` column is added to database
- **Data Structure**:
```json
[
  {
    "caseId": "case-uuid",
    "caseNumber": "CASE-2025-123456",
    "clinicianId": "clinician-uuid", 
    "caseManagerId": "case-manager-uuid",
    "caseManagerName": "John Doe",
    "workerName": "Jane Smith",
    "assignedAt": "2025-01-16T10:30:00.000Z",
    "notes": "Assignment notes"
  }
]
```

#### B. **Individual Assignment Keys**
- **Key**: `case_assignment_{caseId}`
- **Location**: Browser localStorage
- **Purpose**: Quick lookup for specific case assignments

#### C. **Notifications Table (Database)**
- **Table**: `notifications`
- **Purpose**: Send notification to clinician
- **Data**: Notification about case assignment

### 2. **Data Flow Process**

#### Step 1: Case Manager Assigns Case
```typescript
// CaseManagerDashboardRedux.tsx
const handleAssignClinician = async () => {
  // 1. Get case and clinician details
  const selectedCase = cases.find(c => c.id === assignmentForm.case);
  const selectedClinician = clinicians.find(c => c.id === assignmentForm.clinician);
  
  // 2. Show confirmation dialog
  const confirmed = window.confirm(`Are you sure...`);
  
  // 3. Call assignment service
  await CaseAssignmentService.assignCaseToClinician({
    caseId: assignmentForm.case,
    clinicianId: assignmentForm.clinician,
    caseManagerId: user.id,
    notes: assignmentForm.notes
  });
  
  // 4. Trigger refresh for clinician
  await CaseAssignmentService.forceRefreshClinicianData(assignmentForm.clinician);
}
```

#### Step 2: Assignment Service Processes Data
```typescript
// CaseAssignmentService.assignCaseToClinician()
static async assignCaseToClinician(assignmentData) {
  // 1. Fetch case details from database
  const { data: caseData } = await dataClient
    .from('cases')
    .select('*')
    .eq('id', assignmentData.caseId)
    .single();
    
  // 2. Fetch worker details
  const { data: workerData } = await dataClient
    .from('users')
    .select('first_name, last_name')
    .eq('id', caseData.worker_id)
    .single();
    
  // 3. Fetch case manager details
  const { data: caseManagerData } = await dataClient
    .from('users')
    .select('first_name, last_name')
    .eq('id', assignmentData.caseManagerId)
    .single();
    
  // 4. Send notification to clinician
  await NotificationService.sendCaseAssignmentNotification(
    assignmentData.clinicianId,
    assignmentData.caseManagerId,
    assignmentData.caseId,
    caseData.case_number,
    `${workerData.first_name} ${workerData.last_name}`
  );
  
  // 5. Store assignment in localStorage
  const assignmentInfo = {
    caseId: assignmentData.caseId,
    caseNumber: caseData.case_number,
    clinicianId: assignmentData.clinicianId,
    caseManagerId: assignmentData.caseManagerId,
    caseManagerName: `${caseManagerData.first_name} ${caseManagerData.last_name}`,
    workerName: `${workerData.first_name} ${workerData.last_name}`,
    assignedAt: new Date().toISOString(),
    notes: assignmentData.notes
  };
  
  // Store in localStorage
  localStorage.setItem(`case_assignment_${assignmentData.caseId}`, JSON.stringify(assignmentInfo));
  
  // Add to all assignments list
  const allAssignments = JSON.parse(localStorage.getItem('all_case_assignments') || '[]');
  allAssignments.push(assignmentInfo);
  localStorage.setItem('all_case_assignments', JSON.stringify(allAssignments));
}
```

#### Step 3: Clinician Dashboard Retrieves Data
```typescript
// ClinicianDashboard.tsx
const fetchClinicianData = async () => {
  // 1. Get assigned cases from localStorage
  const assignedCases = await CaseAssignmentService.getClinicianCases(user.id);
  
  // 2. Display cases in dashboard
  setCases(assignedCases);
}

// CaseAssignmentService.getClinicianCases()
static async getClinicianCases(clinicianId) {
  // 1. Get all assignments from localStorage
  const allAssignments = JSON.parse(localStorage.getItem('all_case_assignments') || '[]');
  
  // 2. Filter assignments for this clinician
  const clinicianAssignments = allAssignments.filter(assignment => 
    assignment.clinicianId === clinicianId
  );
  
  // 3. Fetch full case details from database
  const casesWithDetails = await Promise.all(
    clinicianAssignments.map(async (assignment) => {
      const { data: caseData } = await dataClient
        .from('cases')
        .select('*')
        .eq('id', assignment.caseId)
        .single();
        
      // 4. Fetch worker and incident details
      const { data: workerData } = await dataClient
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', caseData.worker_id)
        .single();
        
      const { data: incidentData } = await dataClient
        .from('incidents')
        .select('incident_number, description, severity')
        .eq('id', caseData.incident_id)
        .single();
        
      // 5. Return enriched case data
      return {
        ...caseData,
        worker: workerData,
        incident: incidentData,
        assignmentInfo: assignment
      };
    })
  );
  
  return casesWithDetails;
}
```

### 3. **Data Visibility**

#### A. **Case Manager Dashboard**
- Sees all cases they manage
- Can assign cases to clinicians
- Gets success confirmation

#### B. **Clinician Dashboard**
- Sees only assigned cases
- Cases appear in:
  - Main dashboard
  - Analytics page
  - Activity monitor
  - Cases page

#### C. **Notifications Page**
- Clinician receives notification about assignment
- Notification includes case details and assignment info

### 4. **Current Limitations**

#### A. **Database Schema**
- `clinician_id` column doesn't exist in `cases` table yet
- Using localStorage as temporary solution
- Need to run `add-clinician-id-to-cases.sql` migration

#### B. **Data Persistence**
- Data stored in browser localStorage
- Lost if browser data is cleared
- Not shared across devices

### 5. **Future Database Integration**

#### A. **After Migration**
```sql
-- Add clinician_id column to cases table
ALTER TABLE cases ADD COLUMN clinician_id UUID REFERENCES users(id);
ALTER TABLE cases ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
```

#### B. **Updated Data Flow**
```typescript
// After migration, assignments will be stored in database
const { data, error } = await dataClient
  .from('cases')
  .update({ 
    clinician_id: assignmentData.clinicianId,
    priority: assignmentData.priority || 'medium'
  })
  .eq('id', assignmentData.caseId);
```

### 6. **Debug Information**

#### A. **Check localStorage**
```javascript
// In browser console
console.log('All assignments:', JSON.parse(localStorage.getItem('all_case_assignments') || '[]'));
console.log('Individual assignment:', localStorage.getItem('case_assignment_{caseId}'));
```

#### B. **Check Database**
```sql
-- Check notifications
SELECT * FROM notifications WHERE recipient_id = 'clinician-uuid';

-- Check cases (after migration)
SELECT * FROM cases WHERE clinician_id = 'clinician-uuid';
```

## Summary

**Current State**: Data is stored in browser localStorage and notifications table
**Future State**: Data will be stored in database `cases` table with `clinician_id` column
**Visibility**: Clinician sees assigned cases in dashboard, analytics, and cases page
**Notifications**: Clinician receives notification about new case assignment




