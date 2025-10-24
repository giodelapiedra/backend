// Skip MongoDB completely in production or if mongoose is not available
try {
  if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
    console.log('Skipping MongoDB completely - using Supabase only');
    module.exports = {
      dbHealthCheck: (req, res, next) => {
        req.dbHealthy = true; // Supabase is our primary database
        req.dbStatus = 'supabase';
        next();
      },
      getDatabaseStatus: (req, res) => {
        res.json({
          status: 'supabase',
          healthy: true,
          timestamp: new Date().toISOString()
        });
      },
      ensureConnection: async () => true
    };
    return;
  }
} catch (error) {
  console.log('Skipping MongoDB completely - mongoose not available');
  module.exports = {
    dbHealthCheck: (req, res, next) => {
      req.dbHealthy = true; // Supabase is our primary database
      req.dbStatus = 'supabase';
      next();
    },
    getDatabaseStatus: (req, res) => {
      res.json({
        status: 'supabase',
        healthy: true,
        timestamp: new Date().toISOString()
      });
    },
    ensureConnection: async () => true
  };
  return;
}

let mongoose;
try {
  mongoose = require('mongoose');
} catch (error) {
  console.log('Mongoose not available - using Supabase only');
  module.exports = {
    dbHealthCheck: (req, res, next) => {
      req.dbHealthy = true; // Supabase is our primary database
      req.dbStatus = 'supabase';
      next();
    },
    getDatabaseStatus: (req, res) => {
      res.json({
        status: 'supabase',
        healthy: true,
        timestamp: new Date().toISOString()
      });
    },
    ensureConnection: async () => true
  };
  return;
}

// Database health check middleware
const dbHealthCheck = (req, res, next) => {
  const connectionState = mongoose.connection.readyState;
  
  // Connection states:
  // 0 = disconnected
  // 1 = connected
  // 2 = connecting
  // 3 = disconnecting
  
  if (connectionState === 1) {
    // Database is connected
    req.dbHealthy = true;
    next();
  } else if (connectionState === 2) {
    // Database is connecting
    req.dbHealthy = false;
    req.dbStatus = 'connecting';
    next();
  } else {
    // Database is disconnected or disconnecting
    req.dbHealthy = false;
    req.dbStatus = 'disconnected';
    
    // For critical operations, return error
    if (req.method !== 'GET' && !req.path.includes('/health')) {
      return res.status(503).json({
        message: 'Database temporarily unavailable',
        status: 'database_disconnected',
        retryAfter: 5 // seconds
      });
    }
    
    next();
  }
};

// Enhanced database status endpoint
const getDatabaseStatus = (req, res) => {
  const connectionState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  const status = {
    status: states[connectionState] || 'unknown',
    readyState: connectionState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    healthy: connectionState === 1,
    timestamp: new Date().toISOString()
  };
  
  // Add connection pool info if available
  if (mongoose.connection.db && mongoose.connection.db.serverConfig) {
    const pool = mongoose.connection.db.serverConfig.pool;
    status.pool = {
      totalConnections: pool?.totalConnectionCount || 0,
      availableConnections: pool?.availableConnectionCount || 0,
      checkedOutConnections: pool?.checkedOutConnectionCount || 0
    };
  }
  
  res.json(status);
};

// Database reconnection utility
const ensureConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  
  try {
    const { connectDB } = require('./database');
    await connectDB();
    return true;
  } catch (error) {
    console.error('Failed to ensure database connection:', error);
    return false;
  }
};

module.exports = {
  dbHealthCheck,
  getDatabaseStatus,
  ensureConnection
};

