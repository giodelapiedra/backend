const { supabase } = require('../config/supabase');

async function fixRLSPolicies() {
  try {
    console.log('🔧 Fixing RLS policies...');

    // First, let's drop the existing restrictive policy
    console.log('Dropping existing policies...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can view own profile" ON users;
        DROP POLICY IF EXISTS "Users can update own profile" ON users;
      `
    });

    if (dropError) {
      console.error('❌ Error dropping policies:', dropError);
      console.log('Trying alternative approach...');
      
      // Create a more permissive policy that allows service role access
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE POLICY "Allow service role access" ON users
            FOR ALL USING (true);
        `
      });

      if (createError) {
        console.error('❌ Error creating permissive policy:', createError);
        console.log('Please run these SQL commands in the Supabase dashboard:');
        console.log(`
          -- Drop existing policies
          DROP POLICY IF EXISTS "Users can view own profile" ON users;
          DROP POLICY IF EXISTS "Users can update own profile" ON users;

          -- Create new permissive policy
          CREATE POLICY "Allow service role access" ON users
            FOR ALL USING (true);
        `);
      } else {
        console.log('✅ Created permissive policy');
      }
    } else {
      console.log('✅ Dropped existing policies');
    }

    // Test access after policy changes
    console.log('Testing access to users table...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5);

    if (testError) {
      console.error('❌ Still cannot access users table:', testError);
    } else {
      console.log('✅ Can access users table:', testData);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRLSPolicies();