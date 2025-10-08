# Backend Setup - Quick Start Guide

## ✅ Mga Ginawa Ko:

### 1. **Fixed Backend API URL**
- Changed from port 5000 to **5001**
- `frontend/src/utils/backendAssignmentApi.ts`

### 2. **Created Supabase Auth Middleware**
- New file: `backend/middleware/authSupabase.js`
- Uses Supabase JWT tokens (not custom JWT)
- Verifies tokens using `supabaseAdmin.auth.getUser()`

### 3. **Updated Frontend Token Handling**
- Uses `authClient.auth.getSession()` to get Supabase token
- Automatically adds token to all backend requests

### 4. **Updated Routes**
- Routes now use `authSupabase` middleware
- Compatible with Supabase authentication

## 🚀 Setup Steps

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install @supabase/supabase-js
```

### Step 2: Create/Update Environment Variables

Create `backend/.env` or update `backend/env.supabase`:

```bash
# Supabase Configuration
SUPABASE_URL=https://dtcgzgbxhefwhqpeotrl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8

# Server Configuration
PORT=5001
NODE_ENV=development

# JWT Secret (optional, for custom tokens)
JWT_SECRET=your-secret-key-here
```

### Step 3: Run Database Migration

Execute in Supabase SQL Editor:
```sql
-- File: create-work-readiness-assignments-table.sql
-- Copy and paste the entire file content
```

### Step 4: Start Backend Server

```bash
cd backend
node server.js
```

You should see:
```
KPI API Server running on port 5001
```

### Step 5: Test Backend

Open browser or use curl:
```bash
# Test health check
curl http://localhost:5001/health

# Expected response:
{
  "status": "ok",
  "message": "KPI API is running"
}
```

### Step 6: Test with Frontend

1. Make sure frontend is running
2. Login as Team Leader
3. Go to Team Leader Dashboard
4. Scroll to "Work Readiness Assignments" section
5. Click "Create Assignment"
6. Select workers and create assignment

## 🔍 Troubleshooting

### Error: "Cannot GET /api/work-readiness-assignments"

**Problem:** Backend not running or wrong port

**Solution:**
```bash
cd backend
node server.js
```

### Error: "Authentication required"

**Problem:** Token not being sent or invalid

**Solution:**
1. Make sure you're logged in
2. Check browser console for token
3. Verify Supabase session exists

**Test:**
```javascript
// In browser console
const { data: { session } } = await authClient.auth.getSession();
console.log('Token:', session?.access_token);
```

### Error: "User not found"

**Problem:** User exists in Supabase Auth but not in users table

**Solution:**
1. Check if user exists in users table
2. Make sure user_id matches between auth.users and public.users

```sql
-- Check in Supabase SQL Editor
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

### Error: "CORS Error"

**Problem:** CORS not configured

**Solution:** Add to `backend/server.js`:
```javascript
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Error: "Port 5001 already in use"

**Problem:** Another process using port 5001

**Solution:**
```bash
# Windows
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5001 | xargs kill -9
```

## 📊 How Authentication Works

### Flow:

1. **User logs in** → Supabase Auth creates session
2. **Session stored** → Cookie storage (7 days)
3. **Frontend makes request** → Gets token from session
4. **Token sent** → `Authorization: Bearer <token>`
5. **Backend receives** → Verifies with Supabase
6. **User attached** → `req.user` contains user info
7. **Controller executes** → With user context

### Token Verification:

```javascript
// Frontend
const { data: { session } } = await authClient.auth.getSession();
config.headers.Authorization = `Bearer ${session.access_token}`;

// Backend
const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
// Then fetch user details from users table
```

## ✅ Verification Checklist

- [ ] Backend server running on port 5001
- [ ] Health check endpoint works
- [ ] Database table created
- [ ] Environment variables set
- [ ] Frontend can connect to backend
- [ ] Authentication works
- [ ] Can create assignments
- [ ] Can view assignments
- [ ] Can cancel assignments

## 🎯 Testing Commands

```bash
# 1. Test health check
curl http://localhost:5001/health

# 2. Test with authentication (replace TOKEN with actual token)
curl -X GET http://localhost:5001/api/work-readiness-assignments \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"

# 3. Test create assignment
curl -X POST http://localhost:5001/api/work-readiness-assignments \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workerIds": ["worker-id-1"],
    "assignedDate": "2025-10-07",
    "team": "Team Alpha",
    "notes": "Test assignment",
    "dueTime": "09:00"
  }'
```

## 🚀 Production Deployment

### Backend (Render/Railway/Heroku):

1. Set environment variables
2. Deploy backend code
3. Note the production URL

### Frontend (Vercel/Netlify):

1. Set `REACT_APP_BACKEND_URL` to production backend URL
2. Deploy frontend code

### Example:
```bash
# Frontend .env.production
REACT_APP_BACKEND_URL=https://your-backend.onrender.com/api
```

## 📝 Summary

**Files Created/Modified:**
1. ✅ `backend/middleware/authSupabase.js` - Supabase auth middleware
2. ✅ `backend/controllers/workReadinessAssignmentController.js` - Controller
3. ✅ `backend/routes/workReadinessAssignments.js` - Routes
4. ✅ `backend/server.js` - Added routes
5. ✅ `frontend/src/utils/backendAssignmentApi.ts` - API client
6. ✅ `frontend/src/components/WorkReadinessAssignmentManager.tsx` - UI component
7. ✅ `frontend/src/pages/teamLeader/TeamLeaderDashboard.tsx` - Integration

**Everything is ready! Just start the backend server and test! 🎉**
