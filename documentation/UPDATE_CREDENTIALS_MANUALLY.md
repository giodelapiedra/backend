# 🔧 UPDATE CREDENTIALS MANUALLY

**IMPORTANT: You need to update 2 files manually!**

Your `.env` files are ignored by Git (which is good for security), so you need to update the credentials yourself.

---

## 📋 **YOUR CREDENTIALS**

```
Project: physio
Project ID: owntqluhgjqavobupayt
Project URL: https://owntqluhgjqavobupayt.supabase.co

Anon Public Key:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bnRxbHVoZ2pxYXZvYnVwYXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzMyNjMsImV4cCI6MjA3NDkwOTI2M30.9KlyQgD4670PXKvQPCqJxOSlhU4n32JusSm3Qk17ZXU

Service Role Key:
⚠️ YOU NEED TO GET THIS! ⚠️
```

---

## 🎯 **OPTION 1: UPDATE supabase.js DIRECTLY (FASTEST)**

### **Edit: backend/config/supabase.js**

**Find lines 3-4:**
```javascript
const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Replace with:**
```javascript
const supabaseUrl = 'https://owntqluhgjqavobupayt.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY_HERE'; // ⚠️ GET FROM SUPABASE!
```

**Steps:**
1. Open: `C:\Users\GIO\project\backend\config\supabase.js`
2. Change line 3 to: `const supabaseUrl = 'https://owntqluhgjqavobupayt.supabase.co';`
3. Go to Supabase → Settings → API → Copy service_role key
4. Change line 4 to: `const supabaseServiceKey = 'YOUR_COPIED_SERVICE_ROLE_KEY';`
5. Save file (Ctrl+S)

---

## 🎯 **OPTION 2: UPDATE .env FILES (RECOMMENDED FOR PRODUCTION)**

### **Create/Edit: backend/.env**

```env
SUPABASE_URL=https://owntqluhgjqavobupayt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
PORT=5000
NODE_ENV=development
JWT_SECRET=2c8f4a7b9e1d6c3a5f8e0d2b4a6c8e0f1a3c5e7f9b1d3f5a7c9e1b3d5f7a9c1
JWT_EXPIRE=7d
CSRF_SECRET=5e7f9b1d3f5a7c9e1b3d5f7a9c1e3f5a7c9e1b3d5f7a9c1e3f5a7c9e1b3d5f
CLOUDINARY_CLOUD_NAME=dxfdgrerx
CLOUDINARY_API_KEY=981778737815535
CLOUDINARY_API_SECRET=Pg1dI_pObyemK3XXFwQuiUNgvRA
ZOOM_ACCOUNT_ID=Vs4M5C2RTqCGhFTSbYi4zQ
ZOOM_CLIENT_ID=E46Tv0TTSreuxqpLKGK_2A
ZOOM_CLIENT_SECRET=76pQzlr6Hcw96HPoW9xHpULHxyQBgnzd
FRONTEND_URL=http://localhost:3000
```

**Then update supabase.js to use .env:**

Change lines 3-4 in `backend/config/supabase.js` to:
```javascript
const supabaseUrl = process.env.SUPABASE_URL || 'https://owntqluhgjqavobupayt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

### **Create/Edit: frontend/.env**

```env
REACT_APP_SUPABASE_URL=https://owntqluhgjqavobupayt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bnRxbHVoZ2pxYXZvYnVwYXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzMyNjMsImV4cCI6MjA3NDkwOTI2M30.9KlyQgD4670PXKvQPCqJxOSlhU4n32JusSm3Qk17ZXU
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🔑 **HOW TO GET service_role KEY**

1. **Go to**: https://supabase.com/dashboard/project/owntqluhgjqavobupayt/settings/api
2. **Scroll down** to "Project API keys"
3. **Find**: "service_role" section
4. **Click**: [Copy] button next to the key
5. **Paste**: Into supabase.js or .env file

**Screenshot guide:**
```
Supabase Dashboard
→ Settings (⚙️)
→ API
→ Scroll to "Project API keys"
→ You'll see:

┌──────────────────────────────────────┐
│ anon public                          │
│ eyJhbGciOiJIUz... [Copy]            │ ← You have this
├──────────────────────────────────────┤
│ service_role ⚠️                      │
│ eyJhbGciOiJIUz... [Copy]            │ ← COPY THIS!
└──────────────────────────────────────┘
```

---

## ✅ **AFTER UPDATING, TEST CONNECTION**

Run this to verify:

```bash
cd backend
node -e "const {supabase} = require('./config/supabase'); supabase.from('users').select('count').then(r => console.log('Connected!', r))"
```

Expected output:
```
Connected! { data: ..., error: null }
```

---

## 🚀 **QUICK START COMMANDS**

```bash
# Terminal 1: Backend
cd C:\Users\GIO\project\backend
node server.js

# Terminal 2: Frontend
cd C:\Users\GIO\project\frontend
npm start
```

---

## 📝 **SUMMARY**

**What you need to do:**

1. ✅ Get service_role key from Supabase
2. ✅ Update `backend/config/supabase.js` lines 3-4
   OR
3. ✅ Create `backend/.env` and `frontend/.env` files
4. ✅ Start backend server
5. ✅ Start frontend server
6. ✅ Test login at http://localhost:3000

**Give me the service_role key and I'll help you update!** 🚀

