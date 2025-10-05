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

async function debugTeamLeaders() {
  try {
    console.log('🔍 Debugging team leaders and members...\n');

    // Check 1: Get all team leaders
    console.log('1. Checking team leaders...');
    const { data: teamLeaders, error: teamLeadersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        team,
        is_active,
        created_at,
        updated_at
      `)
      .eq('role', 'team_leader')
      .eq('is_active', true)
      .order('first_name');

    if (teamLeadersError) {
      console.log('❌ Error fetching team leaders:', teamLeadersError);
      return;
    }

    console.log(`✅ Found ${teamLeaders?.length || 0} team leaders:`);
    if (teamLeaders && teamLeaders.length > 0) {
      teamLeaders.forEach(leader => {
        console.log(`   - ${leader.first_name} ${leader.last_name} (${leader.email}) - Team: ${leader.team}`);
      });
    } else {
      console.log('   No team leaders found!');
      return;
    }

    // Check 2: Get all workers and their team_leader field
    console.log('\n2. Checking workers and their team_leader assignments...');
    const { data: workers, error: workersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        team,
        team_leader,
        is_active
      `)
      .eq('role', 'worker')
      .eq('is_active', true)
      .order('first_name');

    if (workersError) {
      console.log('❌ Error fetching workers:', workersError);
      return;
    }

    console.log(`✅ Found ${workers?.length || 0} workers:`);
    if (workers && workers.length > 0) {
      workers.forEach(worker => {
        console.log(`   - ${worker.first_name} ${worker.last_name} (${worker.email}) - Team: ${worker.team} - Team Leader: ${worker.team_leader || 'None'}`);
      });
    } else {
      console.log('   No workers found!');
    }

    // Check 3: Test the specific query that's failing
    console.log('\n3. Testing the failing query for each team leader...');
    for (const teamLeader of teamLeaders || []) {
      console.log(`\n   Testing query for ${teamLeader.first_name} ${teamLeader.last_name} (ID: ${teamLeader.id}):`);
      
      const { data: teamMembers, error: membersError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          team,
          package,
          created_at,
          updated_at
        `)
        .eq('team_leader', teamLeader.id)
        .eq('is_active', true)
        .order('first_name');

      if (membersError) {
        console.log(`   ❌ Error: ${membersError.message}`);
        console.log(`   Error details:`, membersError);
      } else {
        console.log(`   ✅ Found ${teamMembers?.length || 0} team members`);
        if (teamMembers && teamMembers.length > 0) {
          teamMembers.forEach(member => {
            console.log(`      - ${member.first_name} ${member.last_name} (${member.email})`);
          });
        }
      }
    }

    // Check 4: Check if there are any users with team_leader field set
    console.log('\n4. Checking users with team_leader field...');
    const { data: usersWithTeamLeader, error: teamLeaderFieldError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, team_leader')
      .not('team_leader', 'is', null);

    if (teamLeaderFieldError) {
      console.log('❌ Error checking team_leader field:', teamLeaderFieldError);
    } else {
      console.log(`✅ Found ${usersWithTeamLeader?.length || 0} users with team_leader field set:`);
      if (usersWithTeamLeader && usersWithTeamLeader.length > 0) {
        usersWithTeamLeader.forEach(user => {
          console.log(`   - ${user.first_name} ${user.last_name} (${user.email}) - Role: ${user.role} - Team Leader: ${user.team_leader}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugTeamLeaders();
