# Fix Missing User Record - Quick Guide

## Ang Problem
Naka-login ka sa `lolosi@gmail.com` pero walang user record sa database. Kaya walang lumalabas na data sa dashboard.

Error: 
```
GET .../users?select=*&id=eq.464218df-56cb-42c7-8671-0fe29ea9f33f 406 (Not Acceptable)
❌ Team leader not found
```

## Solution: I-delete at I-recreate ang Account (Easiest Way)

### Step 1: Logout muna
1. Logout from `lolosi@gmail.com`
2. Go to http://localhost:3000

### Step 2: Login as Admin
1. Login using admin account
2. Go to Admin Dashboard (http://localhost:3000/admin)

### Step 3: Delete the Incomplete User (if may makita)
Sa Admin Dashboard:
- Check if may `lolosi@gmail.com` sa users list
- Kung meron, delete it
- Kung wala, proceed to next step

### Step 4: Create Proper Team Leader Account

Click **"Add User"** button:

```
First Name: Team
Last Name: Leader
Email: teamleader@rehab.com  (Gumamit ng bagong email)
Password: TeamLeader123!@#
Role: Team Leader
Phone: +63 917 123 4567
Team Name: TEAM ALPHA
```

**IMPORTANTE:**
- ✅ Password must have:
  - At least 12 characters
  - One uppercase letter (T, L)
  - One lowercase letter (eam, eader)
  - One number (123)
  - One special character (!@#)

### Step 5: Verify Account Creation

After creation, dapat makita mo:
- ✅ Success message
- ✅ "User can now login with their email and password"
- ✅ User details showing role, team, package

### Step 6: Logout and Login as Team Leader

1. **Logout** from admin
2. **Login** using the new credentials:
   - Email: `teamleader@rehab.com`
   - Password: `TeamLeader123!@#`
3. You should be redirected to Team Leader Dashboard

### Step 7: Create Workers for Your Team

Para may makita kang data sa dashboard, kailangan mo ng workers:

1. Login as **Admin** again
2. Go to Admin Dashboard
3. Create 3 workers:

**Worker 1:**
```
First Name: Pedro
Last Name: Reyes
Email: worker1@rehab.com
Password: Worker123!@#$
Role: Worker
Team: TEAM ALPHA (same team as team leader)
```

**Worker 2:**
```
First Name: Maria
Last Name: Cruz
Email: worker2@rehab.com
Password: Worker123!@#$
Role: Worker
Team: TEAM ALPHA
```

**Worker 3:**
```
First Name: Jose
Last Name: Garcia
Email: worker3@rehab.com
Password: Worker123!@#$
Role: Worker
Team: TEAM ALPHA
```

### Step 8: Login as Team Leader and See the Design!

1. Logout
2. Login as team leader (`teamleader@rehab.com`)
3. Go to Team Leader Dashboard
4. You should now see:
   - ✅ List of workers (3 workers)
   - ✅ KPI statistics
   - ✅ Team overview
   - ✅ Complete dashboard design

## Why This Happens

Ang `lolosi@gmail.com` ay manually na-create sa Supabase Auth pero hindi dumaan sa proper user creation flow. Kaya:
- ❌ May Auth record pero walang database record
- ❌ Hindi ma-fetch ng frontend ang user data
- ❌ 406 error dahil walang user sa `users` table

## The Correct Way to Create Users

**✅ Always use Admin Dashboard** to create users:
1. Login as admin
2. Use the "Add User" button
3. Fill in all required fields
4. Password must meet requirements
5. System will automatically:
   - Create Supabase Auth user
   - Create database record with matching ID
   - Set proper role and package
   - Enable immediate login

**❌ Don't manually create users** in:
- Supabase Auth dashboard
- Direct SQL INSERT
- Supabase Table Editor

## Quick Test Accounts

Para sa testing, here are ready-to-use credentials:

### Team Leader Account
```
Email: teamleader@rehab.com
Password: TeamLeader123!@#
Dashboard: http://localhost:3000/team-leader
```

### Worker Account
```
Email: worker1@rehab.com
Password: Worker123!@#$
Dashboard: http://localhost:3000/worker
```

### Admin Account
```
Email: admin@rehab.com
Password: Admin123!@#$
Dashboard: http://localhost:3000/admin
```

## Troubleshooting

### Problem: Can't create user
**Solution:** Check password requirements - 12+ chars, uppercase, lowercase, number, special char

### Problem: User created but can't login
**Solution:** Clear browser cache and cookies, try again

### Problem: Dashboard still empty
**Solution:** 
1. Make sure workers have the SAME team as team leader
2. Refresh the page (F5)
3. Check browser console for errors

### Problem: Workers not showing in team leader dashboard
**Solution:**
1. Verify team names match exactly (case-sensitive)
2. Workers should have `team` field = team leader's `team` field
3. Create workers through Admin Dashboard with correct team

## Next Steps

After fixing the account:

1. ✅ Create team leader account properly
2. ✅ Create 3-5 workers under same team  
3. ✅ Login as team leader
4. ✅ See the complete dashboard design
5. ⏳ Create work readiness assignments
6. ⏳ Test different features
7. ⏳ Explore analytics and KPIs

---

**Summary:** Mag-create na lang ng bagong account using the Admin Dashboard. Yun ang safest at guaranteed working approach! 🚀


