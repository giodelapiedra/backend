# 🔑 Easiest Ways to Reset Password in Supabase

## ❌ Problem
SQL password reset isn't working because Supabase uses special encryption.

---

## ✅ EASIEST SOLUTIONS (Pick One)

### **Option 1: Use Supabase Dashboard (RECOMMENDED - 30 seconds)**

1. Go to **Supabase Dashboard**
2. Click **Authentication** → **Users**
3. Find user: `lololssdllll@gmail.com`
4. Click the **trash icon** to delete the user
5. Click **"Invite User"** button
6. Enter:
   - Email: `lololssdllll@gmail.com`
   - Auto Confirm: ✅ Check this box
   - Send Email: ❌ Uncheck this
7. After created, click the user again
8. Click **"Reset Password"** and set to: `password123`
9. Done! ✅

---

### **Option 2: Use Supabase Reset Password UI**

1. Go to **Supabase Dashboard**
2. Click **Authentication** → **Users**
3. Find user: `lololssdllll@gmail.com`
4. Click the **3 dots (...)** menu
5. Click **"Edit User"**
6. Scroll down to **Password** field
7. Type: `password123`
8. Click **Save**
9. Done! ✅

---

### **Option 3: Send Password Reset Email (If Email Works)**

1. Go to **Supabase Dashboard**
2. Click **Authentication** → **Users**
3. Find user: `lololssdllll@gmail.com`
4. Click **"Send password reset email"**
5. User checks email and resets password
6. Done! ✅

---

### **Option 4: Create Brand New Test User**

Instead of resetting, create a fresh test user:

**Run this SQL:**
```sql
-- Check if user exists in public.users (your app's table)
SELECT * FROM users WHERE email = 'testworker@test.com';

-- If exists, update to package2
UPDATE users 
SET package = 'package2'
WHERE email = 'testworker@test.com';
```

**Then in Supabase Dashboard:**
1. **Authentication** → **Users** → **Invite User**
2. Email: `testworker@test.com`
3. Password: `password123`
4. Auto Confirm: ✅
5. Click **Create User**

**Then create user in your app's table:**
```sql
INSERT INTO users (email, first_name, last_name, role, package, is_active)
VALUES ('testworker@test.com', 'Test', 'Worker', 'worker', 'package2', true)
ON CONFLICT (email) DO UPDATE
SET package = 'package2';
```

---

## 🎯 RECOMMENDED: Option 1 or 2

These are the fastest and most reliable! The SQL method doesn't work well because Supabase handles auth separately.

---

## ✅ After Reset

**Login with:**
- Email: `lololssdllll@gmail.com` (or your test user)
- Password: `password123`

Then user should see **"Recovery Exercises"** button in Worker Dashboard! 🎉









