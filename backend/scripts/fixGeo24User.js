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

async function fixGeo24User() {
  try {
    console.log('🔧 Fixing geo24@gmail.com user...\n');

    // Step 1: Delete the old user from users table
    console.log('1. Deleting old user from users table...');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('email', 'geo24@gmail.com');

    if (deleteError) {
      console.log('❌ Error deleting user:', deleteError.message);
      return;
    }

    console.log('✅ User deleted from users table');

    // Step 2: Verify deletion
    console.log('\n2. Verifying deletion...');
    const { data: checkData, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'geo24@gmail.com')
      .single();

    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ User successfully deleted from users table');
    } else {
      console.log('❌ User still exists in users table');
      return;
    }

    console.log('\n🎉 Fix completed!');
    console.log('Now you can recreate the user using the team leader dashboard at:');
    console.log('http://localhost:3000/team-leader');
    console.log('\nIMPORTANT: Make sure to refresh your browser page to get the latest code!');
    console.log('The new user will be created with both:');
    console.log('- Supabase Auth user (for login)');
    console.log('- Users table record (for profile data)');
    console.log('- Proper password_hash field');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixGeo24User();



