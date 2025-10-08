# ✅ Complete Setup & Test Guide - Work Readiness Assignments with Notifications

## 🎯 What We Built

1. ✅ Work Readiness Assignment System
2. ✅ Automatic Notifications (24-hour due time)
3. ✅ Professional UI/UX
4. ✅ Dedicated Assignments Page
5. ✅ Backend API with proper auth
6. ✅ Real-time notifications

---

## 📋 **CHECKLIST - DO THIS IN ORDER:**

### ☑️ Step 1: Create Database Table
**Location:** Supabase Dashboard → SQL Editor

**Run this SQL:**
```sql
-- File: create-work-readiness-assignments-simple.sql
-- Copy entire file contents and run
```

**Verify:** Should see "Success" message

---

### ☑️ Step 2: Verify Table Created
**Run in SQL Editor:**
```sql
SELECT * FROM work_readiness_assignments LIMIT 1;
```

**Expected:** Empty result (no error)

---

### ☑️ Step 3: Check Backend Port Configuration
**File:** `backend/env.supabase`

**Should have:**
```
PORT=5001
```

**NOT** `PORT=5000`

---

### ☑️ Step 4: Start Backend Server
```powershell
cd C:\Users\GIO\project\backend
npm start
```

**Should see:**
```
✅ KPI API Server running on port 5001
```

**Should NOT see:** Any "relationship" errors

---

### ☑️ Step 5: Test Backend Health
**Browser:** `http://localhost:5001/health`

**Expected:**
```json
{"status":"ok","message":"KPI API is running"}
```

---

### ☑️ Step 6: Login as Team Leader
1. Go to: `http://localhost:3000/login`
2. Login with team leader credentials
3. Should see dashboard

---

### ☑️ Step 7: Go to Assignments Page
**Two ways:**
1. **Sidebar:** Click "Assignments" (3rd menu item)
2. **Direct URL:** `http://localhost:3000/team-leader/assignments`

**Should see:**
- Beautiful gradient header
- "Create Assignment" button
- Assignment list (empty at first)

---

### ☑️ Step 8: Create Assignment
1. Click **"Create Assignment"** button
2. Select **date** (today or tomorrow)
3. Select **worker(s)** from your team
4. Add **notes** (optional)
5. Click **"Assign to X Workers"** button

**Should see:**
- Success message
- Assignment appears in list
- No errors in console

---

### ☑️ Step 9: Check Backend Console
**Backend terminal should show:**
```
✅ Team leader {id} created X assignments
```

**If you see errors**, check:
- Table exists
- Backend running on port 5001
- Frontend connected to 5001 (not 5000)

---

### ☑️ Step 10: Verify Notification Created
**Run in Supabase SQL Editor:**
```sql
-- Check notification for Sam Ward
SELECT 
    n.id,
    n.title,
    n.message,
    n.priority,
    n.is_read,
    n.created_at,
    u.email as worker_email
FROM notifications n
JOIN users u ON n.recipient_id = u.id
WHERE u.email = 'samward@gmail.com'
AND n.type = 'work_readiness_assignment'
ORDER BY n.created_at DESC
LIMIT 1;
```

**Should see:**
- **Title:** "New Work Readiness Assignment"
- **Priority:** "high"
- **Message:** "You have been assigned..."
- **is_read:** false

**If NO notification found:**
- Check backend console for errors
- Run `debug-notification-for-sam-ward.sql`
- Check RLS policies

---

### ☑️ Step 11: Login as Worker
1. **Logout** from team leader
2. **Login** as worker (samward@gmail.com)
3. Should see worker dashboard

---

### ☑️ Step 12: Check Worker Notifications
**Two ways to check:**

#### Method 1: Notification Icon
- Look at **top right** corner
- Should see **notification bell** with **badge number**
- Click bell to see notifications

#### Method 2: Notifications Page
- Click **"Notifications"** in sidebar
- Or go to: `http://localhost:3000/notifications`

**Should see:**
```
🔔 New Work Readiness Assignment
⚠️ HIGH PRIORITY

You have been assigned to complete a work readiness 
assessment. Due within 24 hours (Oct 7, 2025, 3:45 PM).

Note: [Your team leader's notes]
```

---

## 🔍 **Troubleshooting**

### Issue 1: No Notification Shows for Worker

#### Check 1: Does notification exist in database?
```sql
SELECT * FROM notifications 
WHERE recipient_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
ORDER BY created_at DESC;
```

If **NO rows** → Notification not created. Check backend console for errors.

If **YES rows** → Notification exists but not showing. Check RLS policies.

#### Check 2: RLS Policies
```sql
-- Temporarily disable RLS for testing
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

Refresh page. If notification shows → RLS problem.

**Fix:**
```sql
-- Re-enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add proper policy
CREATE POLICY "Workers can see own notifications"
ON notifications FOR SELECT
USING (auth.uid() = recipient_id);
```

#### Check 3: Frontend Fetching Correctly
Open browser console (F12):
```javascript
// Check if user is authenticated
const { data: { session } } = await authClient.auth.getSession();
console.log('Session:', session);
console.log('User ID:', session?.user?.id);

// Check if notifications query works
const { data, error } = await dataClient
  .from('notifications')
  .select('*')
  .eq('recipient_id', session?.user?.id);
console.log('Notifications:', data);
console.log('Error:', error);
```

---

### Issue 2: ERR_CONNECTION_REFUSED

**Problem:** Backend not running

**Fix:**
```powershell
cd backend
taskkill /F /IM node.exe
npm start
```

---

### Issue 3: Backend Running on Port 5000

**Problem:** Wrong port in env file

**Fix:**
1. Edit `backend/env.supabase`
2. Change `PORT=5000` to `PORT=5001`
3. Restart backend

---

### Issue 4: Duplicate Assignments

**Problem:** Already fixed in controller

**Verify:** Check `backend/controllers/workReadinessAssignmentController.js`
- Should have only ONE insert statement (around line 103)
- Should NOT have second insert (removed at line 159)

---

## 📊 **Complete Test Flow**

### 1. Team Leader Creates Assignment
```
Team Leader Login
   ↓
Go to Assignments Page
   ↓
Click "Create Assignment"
   ↓
Select Sam Ward
   ↓
Select Date: Oct 7, 2025
   ↓
Add Note: "Please complete before shift"
   ↓
Click "Assign to 1 Worker"
   ↓
✅ Success!
```

### 2. Backend Processes
```
Receive Request
   ↓
Validate Team Leader
   ↓
Check Sam Ward belongs to team
   ↓
Calculate Due Time (24 hours)
   ↓
Insert Assignment Record
   ↓
Create Notification Record
   ↓
Mark Notification as Sent
   ↓
Return Success
```

### 3. Worker Receives Notification
```
Sam Ward Logs In
   ↓
Dashboard Loads
   ↓
Notification Icon Shows Badge
   ↓
Real-time Listener Active
   ↓
Notification Appears!
```

---

## 🧪 **Manual Notification Creation (If Needed)**

If backend didn't create notification, run this SQL:

```sql
-- Get Sam Ward's ID
SELECT id FROM users WHERE email = 'samward@gmail.com';
-- Result: copy this ID

-- Get Team Leader ID (whoever created assignment)
SELECT team_leader_id FROM work_readiness_assignments 
WHERE worker_id = '<sam-ward-id-here>'
ORDER BY created_at DESC LIMIT 1;
-- Result: copy this ID

-- Get Assignment ID
SELECT id, due_time FROM work_readiness_assignments 
WHERE worker_id = '<sam-ward-id-here>'
ORDER BY created_at DESC LIMIT 1;
-- Result: copy assignment ID and due_time

-- Create Notification Manually
INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    priority,
    is_read,
    related_entity_type,
    related_entity_id,
    metadata
) VALUES (
    '<sam-ward-id>',
    '<team-leader-id>',
    'work_readiness_assignment',
    'New Work Readiness Assignment',
    'You have been assigned to complete a work readiness assessment. Due within 24 hours. Please complete before your shift.',
    'high',
    false,
    'work_readiness_assignments',
    '<assignment-id>',
    '{"assignment_id": "<assignment-id>", "due_time": "<due-time>"}'::jsonb
);
```

---

## ✅ **Success Indicators**

You'll know everything works when:

### Backend:
- ✅ Server running on port 5001
- ✅ No "relationship" errors
- ✅ Console shows "created X assignments"
- ✅ No notification creation errors

### Database:
- ✅ Assignment record exists
- ✅ Notification record exists
- ✅ notification_sent = true
- ✅ notification_sent_at has timestamp

### Frontend (Team Leader):
- ✅ Assignments page loads
- ✅ Create assignment dialog works
- ✅ Success message appears
- ✅ Assignment shows in list

### Frontend (Worker):
- ✅ Notification bell shows badge
- ✅ Notification appears in list
- ✅ High priority indicator (red)
- ✅ Correct message and due time

---

## 🎉 **Final Checklist**

Before saying it works, verify ALL of these:

- [ ] Database table created
- [ ] Backend running on port 5001
- [ ] No console errors
- [ ] Assignment created successfully
- [ ] Notification record in database
- [ ] Worker sees notification in UI
- [ ] Notification badge shows number
- [ ] High priority indicator visible
- [ ] Due time shows correctly
- [ ] Notes included in message

---

## 📞 **If Still Not Working**

Share these details:

1. **Backend Console Output:**
   - Copy entire terminal output
   - Include any error messages

2. **SQL Query Result:**
   ```sql
   -- Run this and share result
   SELECT 
       'Assignment' as type,
       COUNT(*) as count
   FROM work_readiness_assignments
   WHERE worker_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
   
   UNION ALL
   
   SELECT 
       'Notification' as type,
       COUNT(*) as count
   FROM notifications
   WHERE recipient_id = (SELECT id FROM users WHERE email = 'samward@gmail.com')
   AND type = 'work_readiness_assignment';
   ```

3. **Browser Console:**
   - Press F12
   - Go to Console tab
   - Copy any red errors

4. **Network Tab:**
   - F12 → Network tab
   - Try to create assignment
   - Share failed request details

---

**🚀 Follow this guide step-by-step and it WILL work! 🎉**
