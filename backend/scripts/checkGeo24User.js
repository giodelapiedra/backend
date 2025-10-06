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

async function checkGeo24User() {
  try {
    console.log('🔍 Checking geo24@gmail.com user status...\n');

    // Check 1: Look in users table
    console.log('1. Checking users table...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'geo24@gmail.com')
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
      console.log('   Password Hash:', usersData.password_hash ? 'Present' : 'Missing');
    }

    // Check 2: Look in auth.users
    console.log('\n2. Checking auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Error getting auth users:', authError.message);
    } else {
      const authUser = authUsers.users.find(u => u.email === 'geo24@gmail.com');
      if (authUser) {
        console.log('✅ User found in auth.users:');
        console.log('   ID:', authUser.id);
        console.log('   Email:', authUser.email);
        console.log('   Email Confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
        console.log('   Created:', authUser.created_at);
        console.log('   Last Sign In:', authUser.last_sign_in_at);
      } else {
        console.log('❌ User not found in auth.users');
      }
    }

    // Check 3: Try to login with common passwords
    console.log('\n3. Testing login with different passwords...');
    const passwords = ['password123', 'Password123', 'geo24123', 'Geo24123', '123456', 'password', 'Password'];
    
    for (const password of passwords) {
      console.log(`   Trying password: ${password}`);
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'geo24@gmail.com',
        password: password
      });

      if (loginError) {
        console.log(`   ❌ Failed: ${loginError.message}`);
      } else {
        console.log(`   ✅ SUCCESS! Password is: ${password}`);
        console.log('   User ID:', loginData.user.id);
        console.log('   Session:', loginData.session ? 'Created' : 'Not created');
        break;
      }
    }

    // Check 4: Check if IDs match
    if (usersData && authUsers.users.find(u => u.email === 'geo24@gmail.com')) {
      const authUser = authUsers.users.find(u => u.email === 'geo24@gmail.com');
      if (usersData.id !== authUser.id) {
        console.log('\n❌ ID MISMATCH FOUND:');
        console.log('   Users table ID:', usersData.id);
        console.log('   Auth users ID:', authUser.id);
        console.log('   This will cause login issues!');
      } else {
        console.log('\n✅ IDs match correctly');
      }
    }

    // Check 5: Check recent users to see creation pattern
    console.log('\n5. Checking recent users...');
    const { data: recentUsers, error: recentError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentError && recentUsers) {
      console.log('Recent users:');
      recentUsers.forEach(user => {
        console.log(`   ${user.email} - ${user.created_at} - ID: ${user.id}`);
      });
    }

    // Check 6: Check if user was created with the new flow
    if (usersData && authUsers.users.find(u => u.email === 'geo24@gmail.com')) {
      console.log('\n✅ User was created with the new flow (both tables have user)');
    } else if (usersData && !authUsers.users.find(u => u.email === 'geo24@gmail.com')) {
      console.log('\n❌ User was created with old flow (only users table)');
    } else if (!usersData && authUsers.users.find(u => u.email === 'geo24@gmail.com')) {
      console.log('\n❌ User was created with incomplete flow (only auth table)');
    } else {
      console.log('\n❌ User not found in either table');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkGeo24User();



