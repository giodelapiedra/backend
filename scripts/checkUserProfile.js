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

async function checkUserProfile() {
  try {
    console.log('🔍 Checking user profile for ID: aa82781a-bbbb-49be-ba0b-5c9a95accc7e');

    // Test with service role (should work)
    const { data: serviceData, error: serviceError } = await supabase
      .from('users')
      .select('*')
      .eq('id', 'aa82781a-bbbb-49be-ba0b-5c9a95accc7e')
      .single();

    if (serviceError) {
      console.error('❌ Service role failed:', serviceError);
    } else {
      console.log('✅ Service role can access user profile:');
      console.log(JSON.stringify(serviceData, null, 2));
    }

    // Test with anon key (this is what the frontend uses)
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDQ3MTgsImV4cCI6MjA3NDcyMDcxOH0.n557fWuqr8-e900nNhWOfeJTzdnhSzsv5tBW2pNM4gw';
    
    const anonSupabase = createClient(supabaseUrl, anonKey);
    
    const { data: anonData, error: anonError } = await anonSupabase
      .from('users')
      .select('*')
      .eq('id', 'aa82781a-bbbb-49be-ba0b-5c9a95accc7e')
      .single();

    if (anonError) {
      console.error('❌ Anon key failed (this is the problem):', anonError);
      console.log('\n🔧 Solution: Disable RLS on users table');
      console.log('Run this SQL in Supabase dashboard:');
      console.log('ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
    } else {
      console.log('✅ Anon key can access user profile:');
      console.log(JSON.stringify(anonData, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserProfile();
