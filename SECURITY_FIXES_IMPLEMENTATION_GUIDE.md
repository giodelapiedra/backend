# 🔧 SECURITY FIXES IMPLEMENTATION GUIDE
**Step-by-Step Instructions to Fix Critical Vulnerabilities**

---

## ⚠️ IMPORTANT: Pre-Implementation Checklist

- [ ] **Backup your database** (Supabase Dashboard → Database → Backup)
- [ ] **Create a Git branch**: `git checkout -b security-fixes-oct-2025`
- [ ] **Test in development first** before deploying to production
- [ ] **Coordinate with team** - these changes will cause downtime
- [ ] **Have rollback plan ready** - note current Git commit hash

---

## 🎯 FIX 1: Remove Hardcoded Credentials (CRITICAL - 30 minutes)

### Step 1.1: Rotate Supabase Keys

1. **Login to Supabase Dashboard**: https://supabase.com/dashboard
2. Navigate to: `Your Project → Settings → API`
3. **Generate new anon key**:
   - Click "Generate new anon key"
   - Copy the new key immediately
   - Save it temporarily in a secure note (NOT in code)
4. **Generate new service role key**:
   - Click "Generate new service role key"
   - Copy the new key immediately
   - Save it temporarily in a secure note (NOT in code)
5. **Update environment variables** on your hosting platform:
   - Render.com: Dashboard → Service → Environment → Add Variable
   - Vercel: Dashboard → Project → Settings → Environment Variables
   
   Add:
   ```
   REACT_APP_SUPABASE_URL=https://dtcgzgbxhefwhqpeotrl.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=[your new anon key]
   SUPABASE_URL=https://dtcgzgbxhefwhqpeotrl.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=[your new service role key]
   ```

### Step 1.2: Remove Hardcoded Values from Frontend

**File**: `frontend/src/lib/supabase.ts`

```typescript
// ❌ BEFORE (Lines 5-6):
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// ✅ AFTER:
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Add validation
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Application configuration error. Please contact support.';
  console.error('❌ Missing Supabase environment variables');
  
  // For development, provide helpful error
  if (process.env.NODE_ENV === 'development') {
    console.error('Please create a .env.local file with:');
    console.error('REACT_APP_SUPABASE_URL=your_supabase_url');
    console.error('REACT_APP_SUPABASE_ANON_KEY=your_anon_key');
  }
  
  throw new Error(errorMsg);
}
```

### Step 1.3: Clean Backend env.example

**File**: `backend/env.example`

```bash
# ❌ BEFORE:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ AFTER:
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_dashboard
```

Replace ALL real keys with placeholders.

### Step 1.4: Remove Secrets from Git History

```bash
# WARNING: This rewrites Git history!
# Coordinate with team before running

# 1. Remove file from Git tracking
git rm --cached backend/env.supabase
git rm --cached backend/env.example

# 2. Update .gitignore to be absolutely sure
echo "env.supabase" >> backend/.gitignore
echo ".env" >> backend/.gitignore
echo ".env.*" >> backend/.gitignore
echo "!.env.example" >> backend/.gitignore

# 3. Commit changes
git add backend/env.example backend/.gitignore frontend/src/lib/supabase.ts
git commit -m "Security: Remove hardcoded credentials and rotate keys"

# 4. If you've already pushed to remote (DANGEROUS - coordinate with team):
# git push origin security-fixes-oct-2025 --force

# 5. Clean local cache
git gc --prune=now
```

### Step 1.5: Create Local Environment Files

```bash
# Frontend .env.local (create this file, never commit it)
cat > frontend/.env.local << EOF
REACT_APP_SUPABASE_URL=https://dtcgzgbxhefwhqpeotrl.supabase.co
REACT_APP_SUPABASE_ANON_KEY=[paste your NEW anon key here]
REACT_APP_API_URL=http://localhost:5001/api
EOF

# Backend .env (create this file, never commit it)
cat > backend/.env << EOF
SUPABASE_URL=https://dtcgzgbxhefwhqpeotrl.supabase.co
SUPABASE_ANON_KEY=[paste your NEW anon key here]
SUPABASE_SERVICE_ROLE_KEY=[paste your NEW service role key here]
JWT_SECRET=$(openssl rand -base64 64)
CSRF_SECRET=$(openssl rand -base64 64)
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF
```

### Step 1.6: Test

```bash
# 1. Test backend
cd backend
npm start
# Check for error messages about missing env vars

# 2. Test frontend
cd ../frontend
npm start
# Should load without errors

# 3. Test authentication
# Try logging in with existing user
# Should work with new keys
```

**✅ Success Criteria**:
- No hardcoded credentials in source code
- App works with new keys
- Environment variables loaded from .env files
- Old keys no longer work (verify in Supabase)

---

## 🎯 FIX 2: Secure CORS Configuration (15 minutes)

### Step 2.1: Update CORS Settings

**File**: `backend/server.js`

```javascript
// ❌ BEFORE (Lines 45-69):
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  // ...
});

cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://sociosystem.onrender.com',
    /\.onrender\.com$/,
  ],
  credentials: false,
  // ...
})

// ✅ AFTER:
// Define strict allowed origins
const getAllowedOrigins = () => {
  const origins = [
    'https://sociosystem.onrender.com', // Your production frontend
  ];
  
  // Only add localhost in development
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  
  // Add custom frontend URL if specified
  if (process.env.FRONTEND_URL && !origins.includes(process.env.FRONTEND_URL)) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  return origins;
};

const allowedOrigins = getAllowedOrigins();

console.log('✅ CORS allowed origins:', allowedOrigins);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('⚠️ CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Enable credentials (cookies, authorization headers)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
    optionsSuccessStatus: 200,
    preflightContinue: false,
    maxAge: 86400,
  })
);

// Remove or replace the wildcard OPTIONS handler
// Instead, let CORS middleware handle OPTIONS
app.options('*', cors());
```

### Step 2.2: Update Environment Variables

Add to your production environment:
```bash
# Render.com / Vercel
FRONTEND_URL=https://sociosystem.onrender.com
NODE_ENV=production
```

### Step 2.3: Test CORS

```bash
# Test 1: Valid origin (should work)
curl -H "Origin: https://sociosystem.onrender.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:5001/api/cases

# Expected: Access-Control-Allow-Origin: https://sociosystem.onrender.com

# Test 2: Invalid origin (should be blocked)
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:5001/api/cases

# Expected: CORS error or no Access-Control-Allow-Origin header

# Test 3: Localhost in development (should work)
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:5001/api/cases

# Expected: Access-Control-Allow-Origin: http://localhost:3000
```

**✅ Success Criteria**:
- Production frontend can access API
- Localhost works in development only
- Unknown origins are blocked
- CORS errors logged to console

---

## 🎯 FIX 3: Enable Authentication Middleware (20 minutes)

### Step 3.1: Secure Cases Routes

**File**: `backend/routes/cases.js`

```javascript
// Add at the top after imports (around line 12)
// Apply authentication middleware to ALL routes
router.use(authMiddleware);

// Alternatively, if using Supabase auth:
const { authenticateToken } = require('../middleware/authSupabase');
router.use(authenticateToken);
```

### Step 3.2: Remove/Secure Cleanup Endpoint

**File**: `backend/server.js` (Lines 182-213)

```javascript
// ❌ BEFORE:
app.post('/cleanup', (req, res) => {
  const allowCleanup = process.env.NODE_ENV !== 'production' || ...
  // ...
});

// ✅ AFTER - Option A: Remove entirely
// Comment out or delete the entire /cleanup endpoint

// ✅ AFTER - Option B: Secure it properly
if (process.env.NODE_ENV !== 'production') {
  const { authenticateToken, requireRole } = require('./middleware/authSupabase');
  
  app.post('/cleanup', authenticateToken, requireRole('admin'), (req, res) => {
    const before = process.memoryUsage();
    if (global.gc) {
      global.gc();
      const after = process.memoryUsage();
      return res.json({
        success: true,
        message: 'Memory cleanup completed (dev only)',
        memoryBefore: {
          heapUsedMB: Math.round(before.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(before.heapTotal / 1024 / 1024),
        },
        memoryAfter: {
          heapUsedMB: Math.round(after.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(after.heapTotal / 1024 / 1024),
        },
      });
    }
    return res.json({
      success: false,
      message: 'GC not available',
    });
  });
}
```

### Step 3.3: Re-enable Rate Limiting on Auth Routes

**File**: `backend/routes/auth.js`

```javascript
// ❌ BEFORE (Line 39):
router.post('/register', [
  // registrationLimiter, // DISABLED
  uploadSingleUserPhoto,
  // ...

// ✅ AFTER:
router.post('/register', [
  registrationLimiter, // ✅ ENABLED
  uploadSingleUserPhoto,
  // ...

// ❌ BEFORE (Line 201):
router.post('/login', [
  // authLimiter, // DISABLED
  body('email').isEmail(),
  // ...

// ✅ AFTER:
router.post('/login', [
  authLimiter, // ✅ ENABLED
  body('email').isEmail(),
  // ...
```

### Step 3.4: Verify Authentication on All Routes

Run this check to find routes without authentication:

```bash
# Search for routes that might be missing auth
cd backend
grep -r "router\.get\|router\.post\|router\.put\|router\.delete" routes/ | \
  grep -v "authenticateToken\|authMiddleware\|optionalAuth"

# Review output and add authentication to any sensitive routes
```

### Step 3.5: Test Authentication

```bash
# Test 1: Without authentication (should fail)
curl -X GET http://localhost:5001/api/cases
# Expected: 401 Unauthorized

# Test 2: With valid token (should work)
# First login to get token
TOKEN=$(curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' | \
  jq -r '.token')

# Then use token
curl -X GET http://localhost:5001/api/cases \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK with cases data

# Test 3: Rate limiting on login
for i in {1..10}; do
  curl -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}';
  echo "";
done
# Expected: 429 Too Many Requests after 5 attempts
```

**✅ Success Criteria**:
- All protected routes require authentication
- Unauthenticated requests return 401
- Rate limiting active on auth endpoints
- Cleanup endpoint secured or removed

---

## 🎯 FIX 4: Strengthen Rate Limiting (10 minutes)

### Step 4.1: Update Global Rate Limit

**File**: `backend/server.js` (Lines 109-131)

```javascript
// ❌ BEFORE:
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000, // Too high
    // ...
  })
);

// ✅ AFTER:
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 66 requests per minute per IP
    message: { error: 'Too many requests from this IP', retryAfter: 900 },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    handler: (req, res) => {
      logger.warn('Global rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.headers['user-agent'],
        limit: 1000,
        window: '900s',
        requestId: req.requestId,
      });
      res.status(429).json({ 
        error: 'Too many requests from this IP', 
        retryAfter: 900,
        message: 'Please try again in 15 minutes'
      });
    },
  })
);
```

### Step 4.2: Add Stricter Auth Rate Limiting

**File**: `backend/middleware/rateLimiter.js`

Ensure these are exported and properly configured:

```javascript
// Auth endpoints - very strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts
  skipSuccessfulRequests: true, // Don't count successful logins
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email?.substring(0, 3) + '***',
    });
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Please try again in 15 minutes',
      retryAfter: 900
    });
  }
});

// Registration - moderate
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 registrations per hour per IP
  message: { error: 'Too many registration attempts' },
  skipSuccessfulRequests: true
});

module.exports = {
  authLimiter,
  registrationLimiter,
  // ... other limiters
};
```

### Step 4.3: Test Rate Limits

```bash
# Test auth rate limiting
for i in {1..10}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nHTTP Status: %{http_code}\n\n"
done

# Should see 429 after 5 attempts
```

**✅ Success Criteria**:
- Global limit lowered to reasonable value
- Auth endpoints have strict limits
- Rate limit headers present in responses
- 429 status returned when limit exceeded

---

## 🎯 FIX 5: Audit and Fix RLS Policies (45 minutes)

### Step 5.1: Audit Current Policies

**Run in Supabase SQL Editor**:

```sql
-- 1. Check which tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Find overly permissive policies
SELECT 
  tablename,
  policyname,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND (qual LIKE '%true%' OR qual IS NULL);

-- Save results for review
```

### Step 5.2: Drop Overly Permissive Policies

```sql
-- Drop any policies that use USING (true)
-- Be careful - this will temporarily block access until new policies are created

-- Example:
DROP POLICY IF EXISTS "Allow service role access" ON users;
DROP POLICY IF EXISTS "Public read access" ON users; -- if it exists
```

### Step 5.3: Create Secure Policies with is_active Checks

```sql
-- ===================================
-- USERS TABLE POLICIES
-- ===================================

-- Drop existing user policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Users can view own profile (only if active)
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (
    (auth.uid() = id AND is_active = true) 
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role = 'admin' 
        AND is_active = true
    )
  );

-- Users can update own profile (only if active)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (
    auth.uid() = id AND is_active = true
  )
  WITH CHECK (
    auth.uid() = id AND is_active = true
  );

-- Team leaders can view their team members
CREATE POLICY "Team leaders can view team members" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users tl
      WHERE tl.id = auth.uid()
        AND tl.role = 'team_leader'
        AND tl.is_active = true
        AND (
          users.team_leader_id = tl.id
          OR users.team = ANY(tl.managed_teams)
        )
    )
  );

-- ===================================
-- CASES TABLE POLICIES
-- ===================================

DROP POLICY IF EXISTS "Users can view relevant cases" ON cases;

CREATE POLICY "Users can view relevant cases" ON cases
  FOR SELECT
  USING (
    -- Workers can see their own cases
    (worker_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true))
    OR
    -- Case managers can see assigned cases
    (case_manager_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true))
    OR
    -- Clinicians can see assigned cases
    (clinician_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true))
    OR
    -- Employers can see their workers' cases
    (employer_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true))
    OR
    -- Admins and site supervisors can see all
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'site_supervisor')
        AND is_active = true
    )
  );

-- ===================================
-- WORK_READINESS TABLE POLICIES
-- ===================================

DROP POLICY IF EXISTS "Users can view relevant work readiness" ON work_readiness;

CREATE POLICY "Users can view relevant work readiness" ON work_readiness
  FOR SELECT
  USING (
    -- Workers can see their own submissions
    (worker_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true))
    OR
    -- Team leaders can see their team's submissions
    (team_leader_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true))
    OR
    -- Admins and site supervisors can see all
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'site_supervisor')
        AND is_active = true
    )
  );

-- Workers can insert their own work readiness
CREATE POLICY "Workers can insert work readiness" ON work_readiness
  FOR INSERT
  WITH CHECK (
    worker_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role = 'worker'
        AND is_active = true
    )
  );

-- ===================================
-- NOTIFICATIONS TABLE POLICIES
-- ===================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (
    recipient_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND is_active = true
    )
  );

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (
    recipient_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND is_active = true
    )
  );

-- ===================================
-- WORK_READINESS_ASSIGNMENTS POLICIES
-- ===================================

-- Team leaders can view assignments they created
CREATE POLICY "Team leaders view their assignments" ON work_readiness_assignments
  FOR SELECT
  USING (
    team_leader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role = 'team_leader'
        AND is_active = true
    )
  );

-- Team leaders can create assignments
CREATE POLICY "Team leaders create assignments" ON work_readiness_assignments
  FOR INSERT
  WITH CHECK (
    team_leader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role = 'team_leader'
        AND is_active = true
    )
  );

-- Workers can view their own assignments
CREATE POLICY "Workers view their assignments" ON work_readiness_assignments
  FOR SELECT
  USING (
    worker_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role = 'worker'
        AND is_active = true
    )
  );
```

### Step 5.4: Test RLS Policies

**Test with Deactivated User**:

```sql
-- 1. Create test deactivated user (or deactivate existing)
UPDATE users 
SET is_active = false 
WHERE email = 'test@example.com';

-- 2. Try to authenticate as that user in your app
-- Should be blocked at authentication level

-- 3. If somehow authenticated, policies should block:
-- Switch to anon key in Supabase dashboard and manually test query:
SELECT * FROM users WHERE email = 'test@example.com';
-- Should return: No rows (policy blocks inactive users)
```

**Test with Active User**:

```sql
-- Test as worker (use their UUID)
-- Should only see their own data
SELECT * FROM work_readiness WHERE worker_id = 'worker-uuid';
-- Should return: Only their submissions

-- Test as team leader
-- Should see team's data
SELECT * FROM work_readiness WHERE team_leader_id = 'team-leader-uuid';
-- Should return: All team submissions
```

### Step 5.5: Verify No Gaps

```sql
-- Check for tables without policies
SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename NOT IN (
    SELECT DISTINCT tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  )
  AND t.rowsecurity = true;

-- Should return empty (all RLS-enabled tables have policies)
```

**✅ Success Criteria**:
- No policies with USING (true)
- All policies check is_active = true
- Deactivated users cannot access data
- Users can only access data they're authorized for
- No tables with RLS enabled but no policies

---

## 🔒 POST-IMPLEMENTATION VERIFICATION

### Complete Verification Checklist

```bash
# 1. Secrets removed from code
git log --all --full-history -- "*env*" | grep -E "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9|dtcgzgbx"
# Should return: Nothing

# 2. CORS working correctly
curl -I -H "Origin: https://evil.com" https://your-api.com/health
# Should NOT have Access-Control-Allow-Origin header

curl -I -H "Origin: https://sociosystem.onrender.com" https://your-api.com/health
# Should have Access-Control-Allow-Origin: https://sociosystem.onrender.com

# 3. Authentication enforced
curl https://your-api.com/api/cases
# Should return: 401 Unauthorized

# 4. Rate limiting working
for i in {1..10}; do curl https://your-api.com/api/auth/login -d '{}'; done
# Should return 429 after attempts

# 5. Frontend loads correctly
# Visit https://your-frontend-domain.com
# Check console for errors
# Try logging in

# 6. RLS policies enforced
# Login as regular user
# Try to access admin-only data
# Should be blocked
```

### Monitoring After Deployment

```bash
# Watch authentication logs
tail -f backend/logs/authentication.log | grep -i "failed\|blocked\|429"

# Watch for CORS errors
tail -f backend/logs/error.log | grep -i "cors"

# Monitor Supabase audit logs
# Dashboard → Logs → Query API logs
# Look for unexpected 403 errors (could indicate RLS issues)
```

---

## 🚨 ROLLBACK PLAN

If something breaks after deployment:

```bash
# 1. Rollback code
git revert HEAD
git push origin main

# 2. Restore old Supabase keys (if new ones cause issues)
# Dashboard → Settings → API → "Revert to previous key"

# 3. Restore RLS policies
# Run saved SQL from Step 5.1 audit

# 4. Verify services are running
curl https://your-api.com/health
curl https://your-frontend-domain.com

# 5. Investigate and fix issues before retry
```

---

## 📞 NEED HELP?

If you encounter issues:

1. **Check logs**: `tail -f backend/logs/*.log`
2. **Check Supabase logs**: Dashboard → Logs
3. **Test locally first**: Don't deploy to production until local tests pass
4. **Verify environment variables**: Check hosting platform dashboard
5. **Rollback if needed**: Use Git revert, restore old keys

---

**Document prepared**: October 12, 2025  
**Estimated total implementation time**: 2-3 hours  
**Downtime required**: 5-10 minutes (during key rotation)

🎯 **Goal**: Eliminate critical vulnerabilities while maintaining system functionality

