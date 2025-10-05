const { supabase } = require('../config/supabase');

// Test user query with different approaches
const testUserQuery = async () => {
  try {
    console.log('🧪 Testing user query approaches...\n');
    
    const userId = 'aa82781a-bbbb-49be-ba0b-5c9a95accc7e';
    
    // Test 1: Direct query with service role
    console.log('1. Testing with service role (should work):');
    const { data: serviceData, error: serviceError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (serviceError) {
      console.error('❌ Service role error:', serviceError);
    } else {
      console.log('✅ Service role success:', serviceData?.email);
    }
    
    // Test 2: Check if user exists in auth
    console.log('\n2. Testing auth user lookup:');
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('❌ Auth lookup error:', authError);
    } else {
      console.log('✅ Auth user found:', authData?.user?.email);
    }
    
    // Test 3: Try to create a session for the user
    console.log('\n3. Testing session creation:');
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin_admin@test.com',
      options: {
        redirectTo: 'http://localhost:3000'
      }
    });
    
    if (sessionError) {
      console.error('❌ Session creation error:', sessionError);
    } else {
      console.log('✅ Magic link generated');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

// Run the script
if (require.main === module) {
  testUserQuery()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testUserQuery };

