# Team Leader Sample Data Guide

## Issue Identified
Kapag bagong Team Leader account na walang workers pa, empty state lang ang lumalabas sa dashboard. Para makita yung actual design with data, kailangan may workers at assignments.

## Solution: Create Sample Users via Admin Dashboard

### Step 1: Login as Admin
1. Go to `http://localhost:3000`
2. Login using admin credentials
3. Navigate to Admin Dashboard

### Step 2: Create Team Leader Account

Click **"Add User"** button and create a team leader:

```
First Name: Juan
Last Name: Santos
Email: teamleader1@rehab.com
Password: TeamLeader123!@# (must meet requirements)
Role: Team Leader
Phone: +63 917 123 4567
Team Name: TEAM ALPHA
```

**Important:** 
- ✓ User will be created in Supabase Auth automatically
- ✓ User can login immediately with the email and password
- ✓ Package 2 assigned automatically for team leaders

### Step 3: Create Workers Under That Team Leader

Create 3-5 workers for that team:

**Worker 1:**
```
First Name: Pedro
Last Name: Reyes  
Email: worker1@rehab.com
Password: Worker123!@#$
Role: Worker
Phone: +63 917 234 5678
Team: TEAM ALPHA (same as team leader)
```

**Worker 2:**
```
First Name: Maria
Last Name: Cruz
Email: worker2@rehab.com
Password: Worker123!@#$
Role: Worker
Phone: +63 917 345 6789
Team: TEAM ALPHA
```

**Worker 3:**
```
First Name: Jose
Last Name: Garcia
Email: worker3@rehab.com
Password: Worker123!@#$
Role: Worker
Phone: +63 917 456 7890
Team: TEAM ALPHA
```

### Step 4: Create Clinicians (for assignments)

**Clinician 1:**
```
First Name: Dr. Carlos
Last Name: Martinez
Email: clinician1@rehab.com
Password: Clinician123!@#
Role: Clinician
Phone: +63 917 567 8901
Specialty: Physiotherapy
License Number: PT-12345
```

**Clinician 2:**
```
First Name: Dr. Ana
Last Name: Lopez
Email: clinician2@rehab.com
Password: Clinician123!@#
Role: Clinician
Phone: +63 917 678 9012
Specialty: Occupational Therapy
License Number: OT-67890
```

### Step 5: Login as Team Leader and Create Assignments

1. **Logout** from admin account
2. **Login** as team leader:
   - Email: `teamleader1@rehab.com`
   - Password: `TeamLeader123!@#`
3. Go to **Assignments** page
4. Click **"Create Assignment"**
5. Create work readiness assignments for your workers

### Step 6: View The Dashboard Design

Now kapag pumunta ka sa Team Leader Dashboard:
- ✓ May makikita ka nang workers list
- ✓ May KPI statistics
- ✓ May analytics charts
- ✓ May recent assignments
- ✓ Complete dashboard design with data

## Quick Reference: All Roles Dashboard URLs

After creating users, you can test different dashboards:

| Role | URL | Description |
|------|-----|-------------|
| Admin | `http://localhost:3000/admin` | User management, system settings |
| Team Leader | `http://localhost:3000/team-leader` | Manage team workers, assignments, KPIs |
| Worker | `http://localhost:3000/worker` | View own assignments, submit assessments |
| Clinician | `http://localhost:3000/clinician` | View assigned cases, assessments |
| Case Manager | `http://localhost:3000/case-manager` | Manage cases, incidents |
| Site Supervisor | `http://localhost:3000/supervisor` | Overview of site operations |

## What Was Fixed

### Backend Optimization (`backend/controllers/adminController.js`)

**Before:**
1. ❌ Created user in database first
2. ❌ Then tried to create in Supabase Auth (often failed)
3. ❌ IDs didn't match
4. ❌ Users couldn't login

**After:**
1. ✅ Create user in Supabase Auth FIRST
2. ✅ Use Auth user ID for database record
3. ✅ Proper rollback if database insert fails
4. ✅ Users can login immediately
5. ✅ Automatic package assignment based on role:
   - Team Leader → Package 2
   - Admin → Package 4
   - Others → Package 1

### Frontend Enhancement (`frontend/src/pages/admin/AdminDashboard.tsx`)

**Improvements:**
- ✅ Better validation for clinician fields
- ✅ Automatic package selection based on role
- ✅ Automatic team assignment for workers (TEAM GEO default)
- ✅ Clear success dialog with login instructions
- ✅ Better error messages
- ✅ Shows created user details including package and team

### Key Features

1. **Proper Auth Flow:**
   - Supabase Auth user created first
   - Database user ID matches Auth ID
   - User metadata stored in Auth

2. **Role-Based Defaults:**
   - Team Leader: Package 2, optional team name
   - Worker: Package 1, team required (default: TEAM GEO)
   - Clinician: Package 1, specialty & license required
   - Admin: Package 4

3. **Immediate Login:**
   - No email verification needed
   - Users can login right after creation
   - Password stored securely (bcrypt in DB, Auth password in Supabase)

## Testing Checklist

- [ ] Create team leader account via Admin Dashboard
- [ ] Create 3+ workers for that team
- [ ] Create 1-2 clinicians
- [ ] Login as team leader
- [ ] Create assignments for workers
- [ ] Check dashboard shows proper design with data
- [ ] Verify KPIs are calculating
- [ ] Test Analytics page
- [ ] Test Work Readiness KPI page

## Common Issues

### Issue: Empty Dashboard
**Solution:** Create workers and assignments for your team first

### Issue: User can't login
**Solution:** 
- Check password meets requirements (12+ chars, uppercase, lowercase, number, special char)
- User should be created through Admin Dashboard (not manually in Supabase)
- Check backend logs for Auth errors

### Issue: Workers not showing in team leader dashboard
**Solution:**
- Verify workers have the same `team` value as team leader
- Check workers are created via Admin Dashboard with proper team assignment
- Refresh the page

## Next Steps

Para makita yung full design ng Team Leader Dashboard:

1. ✅ Create team leader account (Done via Admin Dashboard)
2. ✅ Create 3-5 workers under same team
3. ✅ Create clinicians for assignments
4. ⏳ Login as team leader
5. ⏳ Create work readiness assignments
6. ⏳ Workers submit assessments
7. ⏳ View complete dashboard with data

This will populate all the charts, KPIs, and lists with actual data, allowing you to see the complete design in action!


