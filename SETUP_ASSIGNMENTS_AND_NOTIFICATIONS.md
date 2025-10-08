# 🚀 Complete Setup Guide - Work Readiness Assignments & Notifications

## ❌ **Current Issue:**
```
Error: Could not find a relationship between 'work_readiness_assignments' and 'users'
```

**Translation:** Table `work_readiness_assignments` doesn't exist yet sa Supabase!

---

## ✅ **Complete Setup Steps**

### Step 1: Create Assignment Table in Supabase

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Login with your account
   - Select your project: `dtcgzgbxhefwhqpeotrl`

2. **Open SQL Editor**
   - Click **"SQL Editor"** sa left sidebar
   - Click **"New Query"**

3. **Copy and Run This SQL**
```sql
-- =============================================
-- WORK READINESS ASSIGNMENTS TABLE
-- =============================================

-- Drop existing table if any (for clean install)
DROP TABLE IF EXISTS public.work_readiness_assignments CASCADE;

-- Create the assignments table
CREATE TABLE public.work_readiness_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_leader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    team TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    work_readiness_id UUID REFERENCES public.work_readiness(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_team_leader FOREIGN KEY (team_leader_id) REFERENCES public.users(id),
    CONSTRAINT fk_worker FOREIGN KEY (worker_id) REFERENCES public.users(id),
    CONSTRAINT unique_assignment_per_worker_per_day UNIQUE (worker_id, assigned_date)
);

-- Create indexes for performance
CREATE INDEX idx_work_readiness_assignments_team_leader ON public.work_readiness_assignments(team_leader_id);
CREATE INDEX idx_work_readiness_assignments_worker ON public.work_readiness_assignments(worker_id);
CREATE INDEX idx_work_readiness_assignments_date ON public.work_readiness_assignments(assigned_date);
CREATE INDEX idx_work_readiness_assignments_status ON public.work_readiness_assignments(status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.work_readiness_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all for service role (backend)
CREATE POLICY "Enable all for service role" ON public.work_readiness_assignments
    FOR ALL USING (true);

-- RLS Policy: Team leaders can see their assignments
CREATE POLICY "Team leaders can view own assignments" ON public.work_readiness_assignments
    FOR SELECT USING (auth.uid() = team_leader_id);

-- RLS Policy: Workers can see their assignments
CREATE POLICY "Workers can view own assignments" ON public.work_readiness_assignments
    FOR SELECT USING (auth.uid() = worker_id);

-- RLS Policy: Team leaders can create assignments
CREATE POLICY "Team leaders can create assignments" ON public.work_readiness_assignments
    FOR INSERT WITH CHECK (auth.uid() = team_leader_id);

-- RLS Policy: Team leaders can update their assignments
CREATE POLICY "Team leaders can update own assignments" ON public.work_readiness_assignments
    FOR UPDATE USING (auth.uid() = team_leader_id);

-- RLS Policy: Workers can update their assignments (to mark complete)
CREATE POLICY "Workers can update own assignments" ON public.work_readiness_assignments
    FOR UPDATE USING (auth.uid() = worker_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_work_readiness_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_work_readiness_assignments_updated_at
    BEFORE UPDATE ON public.work_readiness_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_work_readiness_assignments_updated_at();

-- Success message
SELECT 'Work Readiness Assignments table created successfully!' as message,
       'Now you can create assignments and send notifications!' as next_step;
```

4. **Click "Run"** button (or press Ctrl + Enter)

5. **Verify Success**
   - Should see: ✅ "Work Readiness Assignments table created successfully!"

---

### Step 2: Verify Notifications Table Exists

Run this in SQL Editor:
```sql
-- Check if notifications table exists
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

Expected columns:
- ✅ `id`
- ✅ `recipient_id`
- ✅ `sender_id`
- ✅ `type`
- ✅ `title`
- ✅ `message`
- ✅ `priority`
- ✅ `is_read`
- ✅ `metadata`
- ✅ `created_at`

If missing, notifications table already exists from your migration!

---

### Step 3: Restart Backend Server

1. **Kill existing backend**
```powershell
# Press Ctrl + C in backend terminal
# OR
taskkill /F /IM node.exe
```

2. **Start backend fresh**
```powershell
cd C:\Users\GIO\project\backend
npm start
```

3. **Should see:**
```
KPI API Server running on port 5001
```

4. **NO MORE ERRORS about relationships!**

---

### Step 4: Test Assignment Creation

1. **Login as Team Leader**
   - Go to: http://localhost:3000/login
   - Use team leader credentials

2. **Go to Assignments Page**
   - Click "Assignments" in sidebar
   - Or go to: http://localhost:3000/team-leader/assignments

3. **Create Assignment**
   - Click "Create Assignment" button
   - Select date (today or tomorrow)
   - Select worker(s) from your team
   - Add notes (optional)
   - Click "Assign to X Workers"

4. **Check Console**
   - Backend terminal should show:
   ```
   ✅ Team leader {id} created X assignments
   ```

---

### Step 5: Verify Worker Notification

#### Method 1: Check Database
```sql
-- Check if notification was created
SELECT 
    n.id,
    n.title,
    n.message,
    n.priority,
    n.created_at,
    u.first_name || ' ' || u.last_name as worker_name
FROM notifications n
JOIN users u ON n.recipient_id = u.id
WHERE n.type = 'work_readiness_assignment'
ORDER BY n.created_at DESC
LIMIT 5;
```

Should see notification with:
- Title: "New Work Readiness Assignment"
- Priority: "high"
- Message: "You have been assigned..."

#### Method 2: Login as Worker
1. **Logout** (if logged in as team leader)
2. **Login as Worker** (the one you assigned to)
3. **Check Notifications**
   - Look at notification icon (top right)
   - Should have badge with number
   - Or go to: http://localhost:3000/notifications

Expected notification:
```
🔔 New Work Readiness Assignment
⚠️ HIGH PRIORITY

You have been assigned to complete a work readiness 
assessment. Due within 24 hours (Oct 7, 2025, 3:45 PM).

Note: [Any special instructions]
```

---

## 🔍 **Troubleshooting**

### Issue 1: Still Getting Relationship Error
**Problem:** Table not created properly

**Solution:**
```sql
-- Check if table exists
SELECT * FROM work_readiness_assignments LIMIT 1;

-- If error, run the CREATE TABLE script again
```

### Issue 2: No Notifications Created
**Problem:** Backend error or notification insert failed

**Solution:**
1. Check backend console for errors
2. Verify notifications table exists
3. Check RLS policies:
```sql
-- Disable RLS temporarily for testing
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

### Issue 3: Worker Doesn't See Notification
**Problem:** RLS policy blocking

**Solution:**
```sql
-- Check notification exists
SELECT * FROM notifications 
WHERE recipient_id = 'worker-id-here'
ORDER BY created_at DESC;

-- If exists, check RLS policy
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

### Issue 4: Duplicate Assignments
**Problem:** Fixed! (removed duplicate insert)

**Solution:** Already fixed in controller

---

## ✅ **Expected Flow**

```
1. Team Leader creates assignment
   ↓
2. Backend receives request
   ↓
3. Backend validates worker belongs to team
   ↓
4. Backend creates assignment record
   ↓
5. Backend creates notification record
   ↓
6. Backend marks notification as sent
   ↓
7. Worker sees notification immediately!
   ↓
8. Worker clicks notification
   ↓
9. Worker completes work readiness
   ↓
10. Assignment marked as complete
```

---

## 🎯 **Quick Test Script**

Run in Supabase SQL Editor:
```sql
-- 1. Get a team leader
SELECT id, email, first_name, last_name, team, role 
FROM users 
WHERE role = 'team_leader' 
LIMIT 1;

-- 2. Get workers from same team
SELECT id, email, first_name, last_name, team, role 
FROM users 
WHERE role = 'worker' 
AND team = 'Team Alpha'  -- Replace with team leader's team
LIMIT 5;

-- 3. After creating assignment, check it was created
SELECT * FROM work_readiness_assignments 
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Check notification was created
SELECT * FROM notifications 
WHERE type = 'work_readiness_assignment'
ORDER BY created_at DESC 
LIMIT 1;
```

---

## 📋 **Summary Checklist**

Before testing:
- [ ] Run SQL script in Supabase
- [ ] Verify table exists
- [ ] Restart backend server
- [ ] No relationship errors in console
- [ ] Backend running on port 5001

When creating assignment:
- [ ] Logged in as team leader
- [ ] On Assignments page
- [ ] Selected worker(s)
- [ ] Clicked "Assign" button
- [ ] Saw success message

Verify notification:
- [ ] Check database for notification record
- [ ] Login as worker
- [ ] See notification in notification center
- [ ] Notification shows correct message
- [ ] Priority is HIGH

---

## 🎉 **Once Setup Complete:**

✅ Team leaders can assign work readiness
✅ Workers get instant notifications
✅ 24-hour due time automatic
✅ High priority notifications
✅ Includes any notes from team leader
✅ Worker can click to complete
✅ Assignment status tracked
✅ Everything working!

---

**🚀 RUN THE SQL SCRIPT NOW AND TEST! 🎉**
