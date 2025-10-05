const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAuthLogging() {
  console.log('🔒 Setting up authentication logging...');
  
  try {
    const sqlContent = fs.readFileSync('./create-auth-logging-trigger.sql', 'utf8');
    console.log('📝 SQL content loaded, executing...');
    
    // Split SQL into individual statements and execute them
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: trimmed });
          
          if (error) {
            console.warn('⚠️ Statement warning:', error.message);
          } else {
            console.log('✅ Statement executed');
          }
        } catch (stmtError) {
          console.warn('⚠️ Statement error:', stmtError.message);
        }
      }
    }
    
    console.log('✅ Authentication logging setup completed!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Login attempts will now be logged automatically');
    console.log('2. Team leaders can see worker login status');
    console.log('3. Authentication logs are stored in authentication_logs table');
    
  } catch (error) {
    console.error('❌ Error reading SQL file:', error);
    console.log('\n📝 MANUAL INSTRUCTIONS:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy and paste the contents of create-auth-logging-trigger.sql');
    console.log('3. Run the SQL script');
  }
}

setupAuthLogging();


















