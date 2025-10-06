const { supabase } = require('../config/supabase');

async function checkUserIds() {
  try {
    console.log('🔍 Checking user IDs in auth.users and public.users...');

    // Get users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Error getting auth users:', authError);
      return;
    }

    console.log('✅ Auth users:', authUsers.users.map(u => ({ id: u.id, email: u.email })));

    // Get users from public.users
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email');
    
    if (publicError) {
      console.error('❌ Error getting public users:', publicError);
      return;
    }

    console.log('✅ Public users:', publicUsers);

    // Check for mismatches
    const mismatches = [];
    authUsers.users.forEach(authUser => {
      const publicUser = publicUsers.find(pu => pu.email === authUser.email);
      if (!publicUser) {
        mismatches.push({ type: 'missing_in_public', authUser });
      } else if (publicUser.id !== authUser.id) {
        mismatches.push({ 
          type: 'id_mismatch', 
          authUser, 
          publicUser,
          fix: `UPDATE users SET id = '${authUser.id}' WHERE email = '${authUser.email}';`
        });
      }
    });

    if (mismatches.length > 0) {
      console.log('❌ Found mismatches:', mismatches);
      console.log('\nTo fix, run these SQL commands in Supabase:');
      mismatches.forEach(m => {
        if (m.type === 'id_mismatch') {
          console.log(m.fix);
        } else {
          console.log(`-- Create missing user for ${m.authUser.email}`);
        }
      });
    } else {
      console.log('✅ No mismatches found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserIds();

