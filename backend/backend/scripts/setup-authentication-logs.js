const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './env.supabase' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAuthenticationLogs() {
  try {
    console.log('🔧 Setting up authentication_logs table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../create-authentication-logs-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`   ${i + 1}. Executing statement...`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
            // Continue with other statements
          } else {
            console.log(`   ✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`   ❌ Exception in statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('✅ Authentication logs table setup completed!');
    
    // Test the table
    console.log('🧪 Testing authentication_logs table...');
    const { data, error } = await supabase
      .from('authentication_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error testing table:', error);
    } else {
      console.log('✅ Table is accessible and ready to use');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setupAuthenticationLogs();
