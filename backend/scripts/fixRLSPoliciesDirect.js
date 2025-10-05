const { createClient } = require('@supabase/supabase-js');

// Use service role key to bypass RLS
const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRLSPolicies() {
  try {
    console.log('🔧 Fixing RLS policies to prevent recursion...');

    // Test current access
    console.log('Testing current access to users table...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(3);

    if (testError) {
      console.error('❌ Cannot access users table:', testError);
      return;
    }

    console.log('✅ Can access users table with service role');
    console.log('Sample users:', testData);

    // Since we can't modify RLS policies through the API without exec_sql function,
    // let's provide instructions for manual fix
    console.log('\n📋 Manual fix required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to Authentication > Policies');
    console.log('3. Find the users table policies');
    console.log('4. Delete all existing policies');
    console.log('5. Create new policies with the following SQL:');
    console.log(`
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- Create new non-recursive policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
    `);

    console.log('\n🔧 Alternative: Temporarily disable RLS');
    console.log('If you need immediate access, you can temporarily disable RLS:');
    console.log('ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
    console.log('(Remember to re-enable it after fixing policies)');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRLSPolicies();
