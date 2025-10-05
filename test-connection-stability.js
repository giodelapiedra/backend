require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/database');

// Test database connection stability
async function testConnectionStability() {
  console.log('🔄 Testing database connection stability...\n');
  
  try {
    // Initial connection
    console.log('1️⃣ Initial connection...');
    await connectDB();
    console.log('✅ Connected successfully');
    
    // Test multiple rapid connections (simulating refreshes)
    console.log('\n2️⃣ Testing rapid connection attempts...');
    for (let i = 0; i < 5; i++) {
      console.log(`   Attempt ${i + 1}:`);
      const start = Date.now();
      await connectDB();
      const duration = Date.now() - start;
      console.log(`   ✅ Connected in ${duration}ms`);
      
      // Small delay to simulate rapid refreshes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Test connection state monitoring
    console.log('\n3️⃣ Testing connection state monitoring...');
    const states = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    console.log(`   Current state: ${states[mongoose.connection.readyState]}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    
    // Test connection pool info
    if (mongoose.connection.db && mongoose.connection.db.serverConfig) {
      const pool = mongoose.connection.db.serverConfig.pool;
      console.log(`   Pool connections: ${pool?.totalConnectionCount || 'N/A'}`);
    }
    
    console.log('\n✅ All connection stability tests passed!');
    console.log('\n💡 Your database should now handle rapid refreshes without issues.');
    
  } catch (error) {
    console.error('❌ Connection stability test failed:', error);
  } finally {
    // Don't close connection, let it stay open for the server
    console.log('\n🔌 Connection left open for server use');
  }
}

// Run the test
if (require.main === module) {
  testConnectionStability().catch(console.error);
}

module.exports = testConnectionStability;

