const { supabase } = require('../config/supabase');

async function testLogin() {
  try {
    console.log('🧪 Testing login with worker account...');
    
    // Test 1: Login
    console.log('Test 1: Login attempt');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin_worker@test.com',
      password: 'Admin123!@#'
    });
    
    if (error) {
      console.error('❌ Login failed:', error);
      return;
    }
    
    console.log('✅ Login successful:', data.user.id);
    
    // Test 2: Get user profile
    console.log('Test 2: Fetching user profile');
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError);
      return;
    }
    
    console.log('✅ Profile fetched:', profile);
    
    // Test 3: Verify role
    if (profile.role !== 'worker') {
      console.error('❌ Unexpected role:', profile.role);
      return;
    }
    
    console.log('✅ Role verified:', profile.role);
    
    // Test 4: Logout
    console.log('Test 4: Logging out');
    const { error: logoutError } = await supabase.auth.signOut();
    
    if (logoutError) {
      console.error('❌ Logout failed:', logoutError);
      return;
    }
    
    console.log('✅ Logout successful');
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLogin();

