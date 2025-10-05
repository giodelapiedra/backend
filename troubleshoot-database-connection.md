# Troubleshoot Database Connection Issues

## Problem
Getting "Failed to perform authorization check" error when running SQL queries in Supabase.

## Possible Causes

### 1. **Supabase Connection Issues**
- Database server might be down
- Network connectivity problems
- Supabase service maintenance

### 2. **Authentication Issues**
- Session expired
- Invalid API keys
- Insufficient permissions

### 3. **Database Schema Issues**
- Missing tables
- Missing columns
- Foreign key constraint violations

## Solutions

### Step 1: Check Supabase Status
1. Go to [Supabase Status Page](https://status.supabase.com/)
2. Check if there are any ongoing issues
3. Wait for service to be restored if there are issues

### Step 2: Refresh Authentication
1. Log out of Supabase dashboard
2. Log back in
3. Try running the query again

### Step 3: Check Database Connection
1. Go to Supabase Dashboard
2. Navigate to Database → Tables
3. Check if tables are visible
4. Try running a simple query: `SELECT 1;`

### Step 4: Run Simple Queries
Instead of complex JOINs, try simple queries:

```sql
-- Check if users table exists
SELECT COUNT(*) FROM users;

-- Check if cases table exists
SELECT COUNT(*) FROM cases;

-- Check if notifications table exists
SELECT COUNT(*) FROM notifications;
```

### Step 5: Check Table Structure
```sql
-- Check users table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';

-- Check cases table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases';
```

### Step 6: Check Specific User
```sql
-- Simple user check
SELECT id, email, role 
FROM users 
WHERE email = 'admin_clinician@test.com';
```

## Alternative: Check from Application

### 1. **Check Browser Console**
1. Open the application in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for any database connection errors

### 2. **Check Network Tab**
1. Open Developer Tools (F12)
2. Go to Network tab
3. Try to assign a case to clinician
4. Look for failed requests

### 3. **Check Application Logs**
1. Look at the terminal where the app is running
2. Check for any database connection errors
3. Look for Supabase authentication errors

## Quick Fixes

### 1. **Restart Application**
```bash
# Stop the application
Ctrl + C

# Restart the application
npm run dev
```

### 2. **Check Environment Variables**
Make sure these are set correctly:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. **Clear Browser Cache**
1. Clear browser cache and cookies
2. Try in incognito/private mode
3. Try a different browser

## Expected Results

### If Working Correctly:
- Simple queries should return results
- Tables should be visible in Supabase dashboard
- Application should connect to database

### If Still Having Issues:
- Contact Supabase support
- Check if there are any billing issues
- Verify project is not paused

## Next Steps

1. Try the simple queries first
2. Check Supabase dashboard
3. Restart the application
4. Check browser console for errors
5. Verify environment variables

## Files Created

- `simple-check-clinician.sql` - Simple queries to check database
- `troubleshoot-database-connection.md` - This troubleshooting guide




