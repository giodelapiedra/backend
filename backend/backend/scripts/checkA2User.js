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

async function checkA2User() {
  try {
    console.log('🔍 Checking a2@gmail.com user status...\n');

    // Check 1: Look in users table
    console.log('1. Checking users table...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'a2@gmail.com')
      .single();

    if (usersError) {
      console.log('❌ User not found in users table:', usersError.message);
    } else {
      console.log('✅ User found in users table:');
      console.log('   ID:', usersData.id);
      console.log('   Email:', usersData.email);
      console.log('   Role:', usersData.role);
      console.log('   Team:', usersData.team);
      console.log('   Is Active:', usersData.is_active);
      console.log('   Created:', usersData.created_at);
    }

    // Check 2: Look in auth.users
    console.log('\n2. Checking auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error getting auth users:', authError.message);
    } else {
      const authUser = authUsers.users.find(u => u.email === 'a2@gmail.com');
      if (authUser) {
        console.log('✅ User found in auth.users:');
        console.log('   ID:', authUser.id);
        console.log('   Email:', authUser.email);
        console.log('   Email Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
        console.log('   Created:', authUser.created_at);
      } else {
        console.log('❌ User not found in auth.users');
      }
    }

    // Check 3: Try to login
    console.log('\n3. Testing login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'a2@gmail.com',
      password: 'password123' // Assuming this is the password
    });

    if (loginError) {
      console.log('❌ Login failed:', loginError.message);
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', loginData.user.id);
      console.log('   Session:', loginData.session ? 'Created' : 'Not created');
    }

    // Check 4: If user exists in users table but not in auth, suggest fix
    if (usersData && !authUsers.users.find(u => u.email === 'a2@gmail.com')) {
      console.log('\n🔧 ISSUE FOUND: User exists in users table but not in auth.users');
      console.log('   This means the user was created before the fix was implemented.');
      console.log('   Solution: Delete the user from users table and recreate them using the team leader dashboard.');
      console.log('   SQL to delete: DELETE FROM users WHERE email = \'a2@gmail.com\';');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkA2User();



