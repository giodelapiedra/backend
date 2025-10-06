const { supabase } = require('../config/supabase');

async function fixRLSRecursion() {
  try {
    console.log('🔧 Fixing RLS recursion issue...');

    // Drop the problematic policy
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "Users can view own profile" ON users;'
    });

    if (dropError) {
      console.error('Error dropping policy:', dropError);
    } else {
      console.log('✅ Dropped recursive policy');
    }

    // Create a new non-recursive policy
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can view own profile" ON users
          FOR SELECT USING (auth.uid() = id);
      `
    });

    if (createError) {
      console.error('Error creating new policy:', createError);
    } else {
      console.log('✅ Created new non-recursive policy');
    }

    // Also fix the update policy
    const { error: dropUpdateError } = await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "Users can update own profile" ON users;'
    });

    if (dropUpdateError) {
      console.error('Error dropping update policy:', dropUpdateError);
    } else {
      console.log('✅ Dropped recursive update policy');
    }

    const { error: createUpdateError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can update own profile" ON users
          FOR UPDATE USING (auth.uid() = id);
      `
    });

    if (createUpdateError) {
      console.error('Error creating new update policy:', createUpdateError);
    } else {
      console.log('✅ Created new non-recursive update policy');
    }

    console.log('🎉 RLS policies fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error);
  }
}

fixRLSRecursion();