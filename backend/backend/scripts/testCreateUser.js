const { createClient } = require('@supabase/supabase-js');

// Use service role key to bypass RLS
const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDQ3MTgsImV4cCI6MjA3NDcyMDcxOH0.n557fWuqr8-e900nNhWOfeJTzdnhSzsv5tBW2pNM4gw';

// Create both clients
const dataClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const authClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testCreateUser() {
  try {
    console.log('🧪 Testing user creation flow...\n');

    const testUserData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser123@gmail.com',
      password: 'password123',
      phone: '',
      team: 'TEAM GEO'
    };

    console.log('1. Testing email check...');
    const { data: emailCheck, error: emailError } = await dataClient
      .from('users')
      .select('id, email')
      .eq('email', testUserData.email)
      .single();
    
    if (emailError && emailError.code !== 'PGRST116') {
      console.log('❌ Email check error:', emailError.message);
      return;
    }
    
    if (emailCheck) {
      console.log('❌ Email already exists, deleting first...');
      await dataClient.from('users').delete().eq('email', testUserData.email);
    }
    
    console.log('✅ Email is available');

    console.log('\n2. Testing Supabase Auth user creation...');
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email: testUserData.email,
      password: testUserData.password,
      options: {
        data: {
          first_name: testUserData.firstName,
          last_name: testUserData.lastName,
          role: 'worker'
        }
      }
    });
    
    if (authError) {
      console.log('❌ Auth user creation failed:', authError.message);
      return;
    }
    
    if (!authData.user) {
      console.log('❌ No user returned from auth signup');
      return;
    }
    
    console.log('✅ Supabase Auth user created:', authData.user.id);

    console.log('\n3. Testing users table profile creation...');
    const profileData = {
      id: authData.user.id,
      first_name: testUserData.firstName,
      last_name: testUserData.lastName,
      email: testUserData.email,
      role: 'worker',
      phone: testUserData.phone || null,
      team: testUserData.team || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: profileResult, error: profileError } = await dataClient
      .from('users')
      .insert(profileData)
      .select()
      .single();
    
    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message);
      return;
    }
    
    console.log('✅ Users table profile created:', profileResult.id);

    console.log('\n4. Testing login...');
    const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({
      email: testUserData.email,
      password: testUserData.password
    });
    
    if (loginError) {
      console.log('❌ Login failed:', loginError.message);
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', loginData.user.id);
    }

    console.log('\n5. Cleaning up test user...');
    await dataClient.from('users').delete().eq('email', testUserData.email);
    console.log('✅ Test user cleaned up');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCreateUser();



