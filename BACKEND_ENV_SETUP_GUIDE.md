# 🔧 Backend Environment Setup Guide

## Quick Start (5 minutes)

### Step 1: Create .env File
```bash
cd backend
cp .env.example .env
```

### Step 2: Get Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `dtcgzgbxhefwhqpeotrl`
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_KEY`

⚠️ **IMPORTANT:** The `service_role` key was previously exposed in the code. You **MUST** regenerate it:
1. In Settings → API, click "Regenerate" next to service_role key
2. Copy the NEW key
3. Update all deployments with the new key

### Step 3: Generate JWT Secret

Run this command to generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as `JWT_SECRET` in your .env file.

### Step 4: Configure Your .env

Open `backend/.env` and fill in:

```bash
# Required Configuration
SUPABASE_URL=https://dtcgzgbxhefwhqpeotrl.supabase.co
SUPABASE_SERVICE_KEY=your-new-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
JWT_SECRET=paste-generated-secret-here

# Server Configuration
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:3000

# Optional: Enable scheduled jobs in production
ENABLE_SCHEDULED_JOBS=false
```

### Step 5: Verify Configuration

```bash
# Test that environment loads correctly
node -e "require('dotenv').config(); console.log('✅ SUPABASE_URL:', !!process.env.SUPABASE_URL); console.log('✅ JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);"

# Expected output:
# ✅ SUPABASE_URL: true
# ✅ JWT_SECRET length: 128
```

### Step 6: Start Backend

```bash
cd backend
npm install
npm start
```

Expected output:
```
✅ Supabase configuration loaded successfully
✅ Environment validation passed
✅ Server started successfully on port 5001
```

---

## ❌ Common Issues & Solutions

### Issue 1: "Missing Supabase configuration"

**Error:**
```
❌ CRITICAL: Missing Supabase configuration in environment variables
Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

**Solution:**
1. Check that `.env` file exists in backend directory
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set
3. Make sure there are no typos in variable names
4. Restart the server after updating .env

### Issue 2: "JWT_SECRET must be at least 32 characters"

**Error:**
```
❌ CRITICAL: JWT_SECRET must be set and at least 32 characters long!
```

**Solution:**
1. Generate a new secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Add it to .env: `JWT_SECRET=your-generated-secret`
3. Make sure it's at least 32 characters long (recommended: 64+)

### Issue 3: "Invalid token" or Authentication Fails

**Possible Causes:**
1. JWT_SECRET changed between token generation and verification
2. Service role key is incorrect
3. Token expired

**Solution:**
1. Clear browser cookies/localStorage
2. Generate new token by logging in again
3. Verify JWT_SECRET hasn't changed
4. Check JWT_EXPIRE setting (default: 7d)

### Issue 4: "Connection to Supabase failed"

**Possible Causes:**
1. Wrong Supabase URL
2. Network/firewall issues
3. Supabase service down

**Solution:**
1. Test connection: `curl https://dtcgzgbxhefwhqpeotrl.supabase.co/rest/v1/`
2. Verify SUPABASE_URL is correct
3. Check Supabase status: https://status.supabase.com/

---

## 🔒 Security Best Practices

### 1. Never Commit Secrets
✅ **DO:**
- Use .env file for secrets
- Keep .env in .gitignore
- Use different secrets for dev/staging/production
- Rotate secrets regularly

❌ **DON'T:**
- Commit .env to git
- Hardcode secrets in code
- Share secrets via email/Slack
- Use weak or predictable secrets

### 2. Protect Your Service Role Key

The service role key has **FULL DATABASE ACCESS**, bypassing all Row Level Security (RLS) policies.

**Best Practices:**
- Only use in backend (NEVER in frontend)
- Rotate every 90 days
- Use secret management service in production
- Limit access to production .env files
- Monitor usage in Supabase dashboard

### 3. Strong JWT Secrets

**Generate Strong Secret:**
```bash
# Good: 128 character random hex string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Bad: Short or predictable secrets
JWT_SECRET=secret123  ❌
JWT_SECRET=myapp  ❌
```

### 4. Environment-Specific Configuration

**Development (.env.development):**
```bash
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
ENABLE_SCHEDULED_JOBS=false
```

**Production (.env.production):**
```bash
NODE_ENV=production
PORT=5001
FRONTEND_URL=https://yourdomain.com
LOG_LEVEL=info
ENABLE_SCHEDULED_JOBS=true
```

---

## 📦 Deployment Configuration

### Heroku

1. Set environment variables:
```bash
heroku config:set SUPABASE_URL=https://your-project.supabase.co
heroku config:set SUPABASE_SERVICE_KEY=your-service-key
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set NODE_ENV=production
```

2. Verify:
```bash
heroku config
```

### Vercel

1. Create `vercel.json`:
```json
{
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_SERVICE_KEY": "@supabase-service-key",
    "JWT_SECRET": "@jwt-secret"
  }
}
```

2. Add secrets:
```bash
vercel secrets add supabase-url https://your-project.supabase.co
vercel secrets add supabase-service-key your-service-key
vercel secrets add jwt-secret your-jwt-secret
```

### AWS (Elastic Beanstalk)

1. Create `.ebextensions/environment.config`:
```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 5001
```

2. Use AWS Secrets Manager for sensitive values:
```bash
aws secretsmanager create-secret \
  --name backend-secrets \
  --secret-string '{"SUPABASE_SERVICE_KEY":"your-key","JWT_SECRET":"your-secret"}'
```

### Docker

1. Create `.env.production` (not committed)
2. Reference in docker-compose.yml:
```yaml
services:
  backend:
    build: ./backend
    env_file:
      - .env.production
    ports:
      - "5001:5001"
```

3. Use Docker secrets:
```yaml
services:
  backend:
    secrets:
      - supabase_service_key
      - jwt_secret
    environment:
      SUPABASE_SERVICE_KEY_FILE: /run/secrets/supabase_service_key
      JWT_SECRET_FILE: /run/secrets/jwt_secret

secrets:
  supabase_service_key:
    external: true
  jwt_secret:
    external: true
```

---

## 🧪 Testing Configuration

### Test Environment Variables Loaded
```javascript
// test-env.js
require('dotenv').config();

const tests = {
  'SUPABASE_URL': !!process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_KEY': !!process.env.SUPABASE_SERVICE_KEY,
  'SUPABASE_ANON_KEY': !!process.env.SUPABASE_ANON_KEY,
  'JWT_SECRET': !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
  'PORT': !!process.env.PORT,
  'FRONTEND_URL': !!process.env.FRONTEND_URL
};

console.log('\n🧪 Environment Configuration Test\n');
Object.entries(tests).forEach(([key, pass]) => {
  console.log(`${pass ? '✅' : '❌'} ${key}`);
});

const allPassed = Object.values(tests).every(t => t);
console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed!'}\n`);
process.exit(allPassed ? 0 : 1);
```

Run test:
```bash
node test-env.js
```

### Test Supabase Connection
```javascript
// test-supabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  console.log('\n🔌 Testing Supabase Connection...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    // Test query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Successfully connected to Supabase!');
    console.log('✅ Database is accessible');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
```

Run test:
```bash
node test-supabase.js
```

---

## 🔄 Secret Rotation Procedure

### When to Rotate:
- Every 90 days (calendar reminder)
- After team member leaves
- If secrets potentially exposed
- After security incident

### How to Rotate:

#### 1. Rotate Service Role Key
```bash
# 1. Generate new key in Supabase dashboard
# 2. Update .env with new key
# 3. Restart backend server
# 4. Verify connection works
# 5. Old key automatically revoked
```

#### 2. Rotate JWT Secret
```bash
# 1. Generate new secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# 2. Add as JWT_SECRET_NEW to .env
echo "JWT_SECRET_NEW=$NEW_SECRET" >> .env

# 3. Update code to accept both old and new
# (Grace period for existing sessions)

# 4. After grace period, replace JWT_SECRET
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" .env
sed -i "/JWT_SECRET_NEW/d" .env

# 5. Restart server
```

#### 3. Document Rotation
```bash
# Create rotation log
echo "$(date): Rotated JWT_SECRET" >> secret-rotation.log
echo "$(date): Rotated SUPABASE_SERVICE_KEY" >> secret-rotation.log
```

---

## 📚 Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [Node.js Environment Variables](https://nodejs.dev/learn/how-to-read-environment-variables-from-nodejs)
- [12 Factor App Config](https://12factor.net/config)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_CheatSheet.html)

---

## 🆘 Need Help?

### Check Logs
```bash
# Backend logs
tail -f backend/logs/combined.log

# Error logs only
tail -f backend/logs/error.log
```

### Debug Mode
```bash
# Start with debug logging
LOG_LEVEL=debug npm start
```

### Health Check
```bash
# Test server is running
curl http://localhost:5001/health

# Expected response:
# {"status":"ok","message":"KPI API is running"}
```

---

**Last Updated:** October 9, 2025  
**Next Review:** November 9, 2025

