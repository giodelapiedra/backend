const { supabase } = require('../config/supabase');

async function testFrontendLogin() {
  try {
    console.log('🧪 Testing frontend login flow...');
    
    // Test 1: Login with worker credentials
    console.log('Test 1: Logging in with worker credentials...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin_worker@test.com',
      password: 'Admin123!@#'
    });
    
    if (loginError) {
      console.error('❌ Login failed:', loginError);
      return;
    }
    
    console.log('✅ Login successful:', loginData.user.id);
    
    // Test 2: Get auth user
    console.log('Test 2: Getting auth user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Get auth user failed:', userError);
      return;
    }
    
    console.log('✅ Auth user found:', user.id);
    
    // Test 3: Get auth session
    console.log('Test 3: Getting auth session...');
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Get auth session failed:', sessionError);
      return;
    }
    
    console.log('✅ Auth session found:', session.session?.user?.id || 'No session');
    
    // Test 4: Query users table
    console.log('Test 4: Querying users table...');
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (queryError) {
      console.error('❌ Query users table failed:', queryError);
      return;
    }
    
    console.log('✅ User data found:', userData);
    
    // Test 5: Logout
    console.log('Test 5: Logging out...');
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

testFrontendLogin();

