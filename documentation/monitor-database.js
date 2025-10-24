require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/database');

// Database monitoring script
class DatabaseMonitor {
  constructor() {
    this.isMonitoring = false;
    this.connectionCount = 0;
    this.lastStatus = null;
  }

  async startMonitoring() {
    console.log('🔍 Starting database monitoring...\n');
    
    try {
      await connectDB();
      this.isMonitoring = true;
      
      // Monitor connection state every 5 seconds
      const monitorInterval = setInterval(() => {
        this.checkConnectionStatus();
      }, 5000);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping database monitor...');
        clearInterval(monitorInterval);
        this.isMonitoring = false;
        mongoose.connection.close();
        process.exit(0);
      });
      
      console.log('✅ Database monitor started. Press Ctrl+C to stop.\n');
      
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
    }
  }

  checkConnectionStatus() {
    const states = {
      0: '🔴 DISCONNECTED',
      1: '🟢 CONNECTED',
      2: '🟡 CONNECTING',
      3: '🟠 DISCONNECTING'
    };
    
    const currentState = mongoose.connection.readyState;
    const status = states[currentState] || '❓ UNKNOWN';
    
    // Only log if status changed
    if (this.lastStatus !== currentState) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${status} - State: ${currentState}`);
      
      if (currentState === 1) {
        this.connectionCount++;
        console.log(`   📊 Connection #${this.connectionCount}`);
        console.log(`   🏠 Host: ${mongoose.connection.host}`);
        console.log(`   🗄️  Database: ${mongoose.connection.name}`);
        
        // Show pool info if available
        if (mongoose.connection.db && mongoose.connection.db.serverConfig) {
          const pool = mongoose.connection.db.serverConfig.pool;
          console.log(`   🏊 Pool: ${pool?.totalConnectionCount || 'N/A'} connections`);
        }
      } else if (currentState === 0) {
        console.log('   ⚠️  Database disconnected - will attempt reconnection');
      }
      
      this.lastStatus = currentState;
    }
  }
}

// Run the monitor
if (require.main === module) {
  const monitor = new DatabaseMonitor();
  monitor.startMonitoring().catch(console.error);
}

module.exports = DatabaseMonitor;

