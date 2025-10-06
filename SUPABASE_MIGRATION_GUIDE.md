# 🚀 SUPABASE MIGRATION GUIDE
## Occupational Rehabilitation System

### **STEP 1: Execute SQL Schema**

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `dtcgzgbxhefwhqpeotrl`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Execute the Schema**
   - Copy the entire content from `supabase-migration.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute

4. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should see all 15 tables:
     - users, cases, incidents, notifications
     - assessments, rehabilitation_plans, appointments
     - work_readiness, check_ins, activity_logs
     - teams, team_members, audit_logs
     - file_attachments, system_settings

### **STEP 2: Install Dependencies**

```bash
# Backend
cd backend
npm install @supabase/supabase-js

# Frontend
cd frontend
npm install @supabase/supabase-js
```

### **STEP 3: Update Environment Variables**

**Backend (.env):**
```bash
# Copy from backend/env.supabase
cp backend/env.supabase backend/.env
```

**Frontend (.env):**
```bash
# Copy from frontend/env.supabase
cp frontend/env.supabase frontend/.env
```

### **STEP 4: Update Backend Code**

Replace your existing database connection with Supabase:

**backend/config/database.js:**
```javascript
const { supabase } = require('./supabase');

const connectDB = async () => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase connected successfully');
    return supabase;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  getConnection: () => supabase
};
```

### **STEP 5: Update Frontend Authentication**

**frontend/src/contexts/AuthContext.tsx:**
```typescript
import { supabase } from '../lib/supabase';

// Replace your existing auth logic with Supabase Auth
const login = async (email: string, password: string) => {
  try {
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Get user profile from users table
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    setUser(userProfile);
    setToken(data.session.access_token);
  } catch (error: any) {
    setError(error.message);
    throw error;
  } finally {
    setLoading(false);
  }
};
```

### **STEP 6: Update API Routes**

**Example: backend/routes/users.js**
```javascript
const { db } = require('../config/supabase');

// Replace Mongoose queries with Supabase
router.get('/', async (req, res) => {
  try {
    const users = await db.users.findMany(
      { role: { $ne: 'admin' } },
      { 
        limit: parseInt(req.query.limit) || 10,
        offset: parseInt(req.query.offset) || 0,
        orderBy: 'created_at',
        ascending: false
      }
    );
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

### **STEP 7: Test the Migration**

1. **Start Backend:**
```bash
cd backend
npm run dev
```

2. **Start Frontend:**
```bash
cd frontend
npm start
```

3. **Test Features:**
   - User registration/login
   - Create cases
   - Report incidents
   - Work readiness submissions
   - Notifications

### **STEP 8: Data Migration (Optional)**

If you have existing MongoDB data, create a migration script:

**migrate-data.js:**
```javascript
const { supabase } = require('./backend/config/supabase');
const mongoose = require('mongoose');

async function migrateUsers() {
  // Connect to MongoDB
  await mongoose.connect('mongodb://localhost:27017/occupational-rehab');
  
  // Get all users from MongoDB
  const mongoUsers = await mongoose.connection.db.collection('users').find({}).toArray();
  
  // Transform and insert into Supabase
  for (const user of mongoUsers) {
    const supabaseUser = {
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      role: user.role,
      team: user.team,
      phone: user.phone,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    };
    
    await supabase.from('users').insert([supabaseUser]);
  }
  
  console.log('Users migrated successfully');
}

migrateUsers();
```

### **BENEFITS OF SUPABASE MIGRATION**

✅ **Built-in Authentication** - No need for custom JWT handling
✅ **Real-time Features** - Live updates for notifications and data
✅ **Automatic API** - REST and GraphQL APIs generated automatically
✅ **Row Level Security** - Database-level security policies
✅ **File Storage** - Built-in file upload and management
✅ **Edge Functions** - Serverless functions for complex logic
✅ **Better Performance** - PostgreSQL with optimized queries
✅ **Scalability** - Auto-scaling infrastructure

### **TROUBLESHOOTING**

**Common Issues:**

1. **RLS Policies Blocking Access**
   - Check Row Level Security policies in Supabase dashboard
   - Temporarily disable RLS for testing: `ALTER TABLE users DISABLE ROW LEVEL SECURITY;`

2. **Authentication Issues**
   - Ensure Supabase Auth is properly configured
   - Check JWT secret matches between frontend and backend

3. **Connection Issues**
   - Verify Supabase URL and keys are correct
   - Check network connectivity

4. **Data Type Mismatches**
   - MongoDB ObjectId vs PostgreSQL UUID
   - Date formats and timezone handling

### **NEXT STEPS**

1. ✅ Execute SQL schema
2. ✅ Install dependencies
3. ✅ Update environment variables
4. ✅ Test basic functionality
5. 🔄 Migrate existing data (if needed)
6. 🔄 Update all API routes
7. 🔄 Implement real-time features
8. 🔄 Set up production deployment

Your system is now ready for Supabase! 🎉
