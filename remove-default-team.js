/**
 * Remove default TEAM GEO assignment for team leaders
 * Team leaders should create their own team
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function removeDefaultTeam() {
  try {
    const email = 'asdasd2323@gmail.com';
    
    console.log('🔧 Removing default team from:', email);

    const { data: updated, error } = await supabase
      .from('users')
      .update({
        team: null,
        default_team: null,
        managed_teams: [],
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select()
      .single();

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Team removed successfully!');
    console.log('   Team:', updated.team);
    console.log('   Default Team:', updated.default_team);
    console.log('   Managed Teams:', updated.managed_teams);
    console.log('\n📋 Next Steps:');
    console.log('   1. Logout and login again');
    console.log('   2. You should see "Create Your Team" dialog');
    console.log('   3. Create your team name');
    console.log('   4. Then create workers');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

removeDefaultTeam();

