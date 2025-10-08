# 🎯 INCIDENT CREATION TEST PLAN

## 📋 Step 1: Check Database Structure
Run this SQL in your Supabase SQL editor:

```sql
-- Check what columns actually exist in the incidents table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'incidents' 
ORDER BY ordinal_position;
```

## 🔐 Step 2: Apply RLS Policies
Run this SQL in your Supabase SQL editor:

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant incidents" ON incidents;
DROP POLICY IF EXISTS "Users can insert incidents" ON incidents;
DROP POLICY IF EXISTS "Users can update incidents" ON incidents;

-- Policy for SELECT (viewing incidents) - MINIMAL VERSION
CREATE POLICY "Users can view relevant incidents" ON incidents
  FOR SELECT USING (
    -- Users can see incidents they reported
    reported_by = auth.uid() OR 
    -- Admins and site supervisors can see all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers and clinicians can see all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('case_manager', 'clinician'))
  );

-- Policy for INSERT (creating incidents) - MINIMAL VERSION
CREATE POLICY "Users can insert incidents" ON incidents
  FOR INSERT WITH CHECK (
    -- Users can create incidents if they are the reporter
    reported_by = auth.uid() OR
    -- Admins and site supervisors can create incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers and clinicians can create incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('case_manager', 'clinician'))
  );

-- Policy for UPDATE (updating incidents) - MINIMAL VERSION
CREATE POLICY "Users can update incidents" ON incidents
  FOR UPDATE USING (
    -- Users can update incidents they reported
    reported_by = auth.uid() OR 
    -- Admins and site supervisors can update all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'site_supervisor')) OR
    -- Case managers and clinicians can update all incidents
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('case_manager', 'clinician'))
  );
```

## 🧪 Step 3: Test Incident Creation
1. Go to your Site Supervisor Dashboard
2. Click "Report New Incident"
3. Fill out the form with this sample data:

### Sample Incident Details:
- **Description**: "Worker slipped on wet floor in warehouse area while carrying boxes"
- **Incident Type**: "Slip/Fall" (or any available option)
- **Severity**: "Near Miss" (or any available option)
- **Select Unselected Worker**: Choose a worker from the unselected workers dropdown
- **Incident Date**: Today's date
- **Location**: Any location details

### Important Notes:
- The "Select Unselected Worker" dropdown shows workers from the `unselected_workers` table
- The selected worker ID will be used as `worker_id` in the incident
- If no worker is selected, it will fallback to the supervisor's ID

## 📊 Step 4: Expected Results
You should see in the console:

```
Form submitting incident data: {
  "description": "Worker slipped on wet floor in warehouse area while carrying boxes",
  "reported_by_id": "27e765a8-d935-4010-9694-38252ce86728",
  "worker_id": "cd7aa312-5b1f-4785-855a-37ecf0a66e1d",
  "employer_id": "27e765a8-d935-4010-9694-38252ce86728",
  "incident_date": "2025-10-08T12:48:07.971Z",
  "incident_type": "slip_fall",
  "severity": "near_miss",
  "status": "reported"
}

Mapped incident data: {
  "description": "Worker slipped on wet floor in warehouse area while carrying boxes",
  "reported_by": "27e765a8-d935-4010-9694-38252ce86728"
}
All validations passed, attempting to create incident...
Incidents table accessible, current count: X
Incident created successfully: {...}
```

## ✅ Success Indicators:
- ✅ No RLS violation errors
- ✅ Incident created successfully
- ✅ Case created automatically
- ✅ Notifications sent
- ✅ Success message displayed

## ❌ If Still Getting Errors:
1. Check the database structure results from Step 1
2. Verify the RLS policies were applied successfully
3. Check browser console for detailed error messages
4. Let me know what specific error you're getting

## 🎯 Goal:
Create a working incident report that saves to the incidents table and triggers the case creation workflow.
