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

async function disableRLSOnUsers() {
  try {
    console.log('🔧 Temporarily disabling RLS on users table...');

    // Test current access first
    console.log('Testing current access to users table...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(3);

    if (testError) {
      console.error('❌ Cannot access users table:', testError);
      console.log('\n📋 Manual fix required:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run this command:');
      console.log('   ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
      console.log('4. This will temporarily disable RLS and allow login');
      console.log('5. After login works, you can fix the policies and re-enable RLS');
      return;
    }

    console.log('✅ Can access users table with service role');
    console.log('Sample users:', testData);

    console.log('\n📋 To fix the login issue, run this SQL in Supabase dashboard:');
    console.log('ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
    console.log('\nThis will temporarily disable RLS and allow login to work.');
    console.log('After login works, you can fix the policies and re-enable RLS with:');
    console.log('ALTER TABLE users ENABLE ROW LEVEL SECURITY;');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

disableRLSOnUsers();