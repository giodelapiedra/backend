const { supabase } = require('../config/supabase');

async function disableRLS() {
  try {
    console.log('🔧 Disabling RLS on users table...');

    // Disable RLS on users table
    const { error: disableError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users DISABLE ROW LEVEL SECURITY;'
    });

    if (disableError) {
      console.error('Error disabling RLS:', disableError);
      console.log('Trying alternative approach...');
      
      // Alternative: Drop all policies
      const policies = [
        'Users can view own profile',
        'Users can update own profile'
      ];
      
      for (const policy of policies) {
        const { error: dropError } = await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy}" ON users;`
        });
        
        if (dropError) {
          console.error(`Error dropping policy ${policy}:`, dropError);
        } else {
          console.log(`✅ Dropped policy: ${policy}`);
        }
      }
    } else {
      console.log('✅ RLS disabled on users table');
    }

    // Test the fix
    console.log('🧪 Testing users table access...');
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5);

    if (error) {
      console.error('❌ Users table still not accessible:', error);
    } else {
      console.log('✅ Users table accessible:', data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

disableRLS();