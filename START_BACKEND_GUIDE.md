# 🚀 How to Start Backend Server

## ❌ Current Problem:
```
ERR_CONNECTION_REFUSED
Failed to load resource: http://localhost:5001/api/work-readiness-assignments
```

**Meaning:** Backend server is NOT running!

---

## ✅ Solution: Start Backend Server

### Method 1: Double-Click Batch File (EASIEST)

1. Go to folder: `C:\Users\GIO\project\backend`
2. **Double-click** `START_BACKEND.bat`
3. A window will open showing:
   ```
   KPI API Server running on port 5001
   ```
4. **KEEP THIS WINDOW OPEN** while using the app
5. Go back to your browser and try creating assignment again

---

### Method 2: PowerShell/Terminal

1. Open **PowerShell** or **Command Prompt**
2. Run these commands:

```powershell
cd C:\Users\GIO\project\backend
node server.js
```

3. You should see:
```
KPI API Server running on port 5001
```

4. **KEEP THIS TERMINAL OPEN**
5. Go to browser and try again

---

### Method 3: VS Code Terminal

1. In VS Code, open **Terminal** (Ctrl + `)
2. Click **+** to open new terminal
3. Run:
```powershell
cd backend
node server.js
```

4. **KEEP THIS TERMINAL OPEN**
5. Switch to browser and try again

---

## ✅ How to Verify Backend is Running

### Test 1: Browser Test
Open browser and go to:
```
http://localhost:5001/health
```

Should see:
```json
{
  "status": "ok",
  "message": "KPI API is running"
}
```

### Test 2: Console Test
Open browser console (F12) and run:
```javascript
fetch('http://localhost:5001/health')
  .then(r => r.json())
  .then(console.log);
```

Should see:
```
{status: 'ok', message: 'KPI API is running'}
```

---

## 🔍 If Server Won't Start

### Error: "Cannot find module '@supabase/supabase-js'"

**Solution:**
```powershell
cd backend
npm install @supabase/supabase-js
node server.js
```

### Error: "Port 5001 is already in use"

**Solution (Windows):**
```powershell
# Find process using port 5001
netstat -ano | findstr :5001

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F

# Start server again
node server.js
```

### Error: "Cannot find module './routes/workReadinessAssignments'"

**Solution:**
Check if file exists:
```powershell
dir routes\workReadinessAssignments.js
```

If missing, the file should be at:
`backend/routes/workReadinessAssignments.js`

### Error: "Cannot find module './middleware/authSupabase'"

**Solution:**
Check if file exists:
```powershell
dir middleware\authSupabase.js
```

If missing, the file should be at:
`backend/middleware/authSupabase.js`

---

## 📋 Complete Startup Checklist

Before creating assignment:

1. [ ] Backend server is running
   - Terminal shows: "KPI API Server running on port 5001"
   
2. [ ] Health check works
   - Browser: `http://localhost:5001/health` returns OK
   
3. [ ] Database table exists
   - Ran `create-work-readiness-assignments-simple.sql` in Supabase
   
4. [ ] Logged in as Team Leader
   - Check user role in app
   
5. [ ] Have team members
   - At least one worker in your team

---

## 🎯 Quick Test Flow

### Step 1: Start Backend
```powershell
cd C:\Users\GIO\project\backend
node server.js
```

Wait for: `KPI API Server running on port 5001`

### Step 2: Test Health
Open browser: `http://localhost:5001/health`

Should see: `{"status":"ok","message":"KPI API is running"}`

### Step 3: Try Assignment
1. Go to Team Leader Dashboard
2. Scroll to "Work Readiness Assignments"
3. Click "Create Assignment"
4. Select workers
5. Click "Assign to X Workers"

### Step 4: Check Result
- ✅ Success: "Successfully assigned..."
- ❌ Error: Check console for details

---

## 💡 Pro Tips

### Tip 1: Keep Backend Running
Don't close the terminal/window while using the app!

### Tip 2: Auto-Restart on Changes
Install nodemon for auto-restart:
```powershell
npm install -g nodemon
nodemon server.js
```

### Tip 3: Check Logs
Backend terminal shows all requests:
- POST /api/work-readiness-assignments
- Status codes (200, 401, 500, etc.)
- Error messages

### Tip 4: Multiple Terminals
- Terminal 1: Backend server
- Terminal 2: Frontend (npm start)
- Keep both running!

---

## 🆘 Still Not Working?

### Get Debug Info:

1. **Backend Terminal Output**
   - Copy all error messages
   
2. **Browser Console (F12)**
   - Copy error messages
   - Check Network tab
   
3. **Network Tab Details**
   - Request URL
   - Status Code
   - Response body

### Common Issues:

| Error | Cause | Solution |
|-------|-------|----------|
| ERR_CONNECTION_REFUSED | Backend not running | Start backend server |
| 401 Unauthorized | Not logged in | Re-login |
| 404 Not Found | Wrong URL | Check routes |
| 500 Internal Server | Backend error | Check backend logs |

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Backend terminal shows: "KPI API Server running on port 5001"
2. ✅ Health check returns OK
3. ✅ No console errors in browser
4. ✅ Assignment creation shows success message
5. ✅ Assignments appear in table

---

## 📝 Summary

**The Problem:**
Backend server not running → ERR_CONNECTION_REFUSED

**The Solution:**
```powershell
cd backend
node server.js
```

**Keep it running and try again!** 🚀

---

## 🎉 After Backend Starts

1. Refresh your Team Leader Dashboard
2. Try creating assignment again
3. Should work now! ✅

**If you see "Successfully assigned..." → IT WORKS! 🎉**
