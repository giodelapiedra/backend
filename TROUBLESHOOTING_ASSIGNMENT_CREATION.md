# Troubleshooting: Assignment Creation Failed

## ✅ Fixed Import Error
Changed `<CheckCircle />` to `<CheckCircleIcon />` - **DONE!**

## 🔍 Database Issue: "Failed to create assignments"

### Possible Causes:

1. **Table doesn't exist**
2. **Backend not running**
3. **RLS policies too strict**
4. **Missing foreign key references**

---

## 🚀 Solution Steps

### Step 1: Create Database Table (SIMPLE VERSION)

Run this in **Supabase SQL Editor**:

```sql
-- File: create-work-readiness-assignments-simple.sql
-- Copy the entire file content and run it
```

This creates a simpler table with relaxed RLS policies.

### Step 2: Verify Table Exists

Run in Supabase SQL Editor:
```sql
SELECT * FROM work_readiness_assignments LIMIT 1;
```

Expected: Empty result (no error)

### Step 3: Check Backend Server

```powershell
# In terminal
cd C:\Users\GIO\project\backend
node server.js
```

Should see:
```
KPI API Server running on port 5001
```

### Step 4: Test Backend Endpoint

Open browser console and run:
```javascript
// Test if backend is reachable
fetch('http://localhost:5001/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

Expected:
```json
{
  "status": "ok",
  "message": "KPI API is running"
}
```

### Step 5: Check Browser Console

When you try to create assignment:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Look for Network tab → Failed requests

### Step 6: Check Network Tab

1. Open DevTools → Network tab
2. Try to create assignment
3. Look for request to `/api/work-readiness-assignments`
4. Click on it
5. Check:
   - **Status Code**: Should be 201 (success) or 4xx/5xx (error)
   - **Response**: Error message
   - **Headers**: Authorization header present?

---

## 🔍 Common Errors & Solutions

### Error: "ERR_CONNECTION_REFUSED"
**Problem:** Backend not running

**Solution:**
```powershell
cd backend
node server.js
```

### Error: "Authentication required"
**Problem:** No auth token or invalid token

**Solution:**
```javascript
// Check if you're logged in
const { data: { session } } = await authClient.auth.getSession();
console.log('Logged in:', !!session);
console.log('Token:', session?.access_token);
```

If no session, log out and log in again.

### Error: "Some workers do not belong to your team"
**Problem:** Trying to assign to workers from different team

**Solution:**
- Only select workers from YOUR team
- Check `user.team` matches worker's team

### Error: "relation 'work_readiness_assignments' does not exist"
**Problem:** Table not created

**Solution:**
Run `create-work-readiness-assignments-simple.sql` in Supabase

### Error: "duplicate key value violates unique constraint"
**Problem:** Assignment already exists for that worker on that date

**Solution:**
- Choose different date
- Or cancel existing assignment first

### Error: "permission denied for table work_readiness_assignments"
**Problem:** RLS policies blocking access

**Solution:**
Run this to temporarily disable RLS (for testing):
```sql
ALTER TABLE work_readiness_assignments DISABLE ROW LEVEL SECURITY;
```

---

## 🧪 Manual Test

### Test 1: Direct Database Insert

Run in Supabase SQL Editor:
```sql
-- Get a team leader ID
SELECT id, email, role, team FROM users WHERE role = 'team_leader' LIMIT 1;

-- Get a worker ID from same team
SELECT id, email, role, team FROM users WHERE role = 'worker' LIMIT 1;

-- Try to insert manually (replace IDs)
INSERT INTO work_readiness_assignments (
    team_leader_id,
    worker_id,
    assigned_date,
    team,
    status
) VALUES (
    'team-leader-id-here',
    'worker-id-here',
    CURRENT_DATE,
    'Team Alpha',
    'pending'
);

-- Check if inserted
SELECT * FROM work_readiness_assignments ORDER BY created_at DESC LIMIT 1;
```

If this works → Backend issue
If this fails → Database/RLS issue

### Test 2: Backend API Test

```bash
# Get your token from browser console first
# Then test with curl or Postman

curl -X POST http://localhost:5001/api/work-readiness-assignments \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "workerIds": ["worker-id-here"],
    "assignedDate": "2025-10-07",
    "team": "Team Alpha",
    "notes": "Test",
    "dueTime": "09:00"
  }'
```

---

## 📋 Checklist

Before creating assignment, verify:

- [ ] Backend server is running (port 5001)
- [ ] Database table exists
- [ ] You're logged in as team leader
- [ ] You have team members in your team
- [ ] Selected workers belong to YOUR team
- [ ] Date is valid (today or future)
- [ ] Browser console shows no errors

---

## 🆘 Still Not Working?

### Get Detailed Error Info:

1. **Backend Terminal**
   - Look for error messages
   - Check stack traces

2. **Browser Console**
   - Look for red error messages
   - Check Network tab for failed requests

3. **Supabase Logs**
   - Go to Supabase Dashboard
   - Database → Logs
   - Look for errors

### Send Me This Info:

1. Backend terminal output
2. Browser console errors
3. Network tab response
4. Supabase table structure:
```sql
\d work_readiness_assignments
```

---

## ✅ Quick Fix (If All Else Fails)

### Option 1: Use Direct Supabase (No Backend)

Temporarily bypass backend and use direct Supabase:

```typescript
// In WorkReadinessAssignmentManager.tsx
// Comment out BackendAssignmentAPI
// Use SupabaseAPI instead

const response = await SupabaseAPI.createWorkReadinessAssignments(
  teamLeaderId,
  selectedWorkers,
  new Date(assignedDate),
  team,
  notes,
  dueTime
);
```

### Option 2: Simplify RLS

```sql
-- Disable RLS temporarily for testing
ALTER TABLE work_readiness_assignments DISABLE ROW LEVEL SECURITY;

-- Or create simple policy
DROP POLICY IF EXISTS "Enable all for service role" ON work_readiness_assignments;
CREATE POLICY "Enable all for service role" ON work_readiness_assignments
    FOR ALL USING (true);
```

---

## 📝 Summary

**Most Common Issue:** Backend not running

**Quick Fix:**
```powershell
cd backend
node server.js
```

Then refresh page and try again!

**If still failing, run:**
1. `create-work-readiness-assignments-simple.sql`
2. Start backend server
3. Check browser console for specific error
4. Share the error message with me

🎯 **Let me know the specific error message and I'll help you fix it!**
