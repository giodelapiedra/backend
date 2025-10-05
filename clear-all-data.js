const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env.supabase' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllData() {
  try {
    console.log('🧹 Clearing all incidents and cases...');
    
    // Check current counts
    const { count: incidentsCount } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true });
    
    const { count: casesCount } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Current incidents count:', incidentsCount);
    console.log('📊 Current cases count:', casesCount);
    
    // Delete all cases first (due to foreign key constraints)
    if (casesCount > 0) {
      console.log('🗑️ Deleting all cases...');
      const { error: casesError } = await supabase
        .from('cases')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (casesError) {
        console.error('❌ Error deleting cases:', casesError);
      } else {
        console.log('✅ All cases deleted successfully');
      }
    }
    
    // Delete all incidents
    if (incidentsCount > 0) {
      console.log('🗑️ Deleting all incidents...');
      const { error: incidentsError } = await supabase
        .from('incidents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (incidentsError) {
        console.error('❌ Error deleting incidents:', incidentsError);
      } else {
        console.log('✅ All incidents deleted successfully');
      }
    }
    
    // Check final counts
    const { count: finalIncidentsCount } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true });
    
    const { count: finalCasesCount } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Final incidents count:', finalIncidentsCount);
    console.log('📊 Final cases count:', finalCasesCount);
    
    if (finalIncidentsCount === 0 && finalCasesCount === 0) {
      console.log('🎉 All incidents and cases successfully removed!');
      console.log('✨ You can now create fresh sample data');
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

clearAllData();




























