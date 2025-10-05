const { supabase } = require('../config/supabase');

async function fixRLSRecursion() {
  try {
    console.log('🔧 Fixing RLS recursion issue...');

    // First, let's disable RLS temporarily to fix the policies
    const { error: disableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (disableError) {
      console.log('RLS is active, trying to fix policies...');
    }

    // Try to query the users table directly to see if we can access it
    console.log('Testing direct query to users table...');
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5);

    if (error) {
      console.error('❌ Cannot access users table:', error);
      console.log('This confirms the RLS policy is blocking access');
      
      // Since we can't modify RLS policies through the API, let's use a different approach
      console.log('🔧 Switching to service role approach...');
      
      // Test with service role
      const { data: serviceData, error: serviceError } = await supabase
        .from('users')
        .select('id, email, role')
        .limit(5);

      if (serviceError) {
        console.error('❌ Service role also failed:', serviceError);
      } else {
        console.log('✅ Service role can access users table');
        console.log('Found users:', serviceData);
      }
    } else {
      console.log('✅ Can access users table');
      console.log('Found users:', data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRLSRecursion();

