const mongoose = require('mongoose');

// Database connection URL - connect to occupational-rehab database
const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab';

// Connection state tracking
let isConnecting = false;
let connectionPromise = null;

// Connect to MongoDB with improved connection management
const connectDB = async () => {
  try {
    // Skip MongoDB connection in production (use Supabase only)
    if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
      console.log('Skipping MongoDB connection - using Supabase only');
      return null;
    }
    
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return mongoose.connection;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnecting && connectionPromise) {
      console.log('MongoDB connection already in progress, waiting...');
      return await connectionPromise;
    }

    isConnecting = true;
    connectionPromise = mongoose.connect(DB_URL, {
      // Basic connection settings
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 60000, // 60 seconds
      connectTimeoutMS: 30000, // 30 seconds
      
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      
      // Retry settings
      retryWrites: true,
      retryReads: true
    });

    const conn = await connectionPromise;
    console.log(`MongoDB connected successfully to database: ${conn.connection.name}`);
    console.log(`Connection state: ${mongoose.connection.readyState}`);
    console.log(`Pool size: ${mongoose.connection.db?.serverConfig?.pool?.totalConnectionCount || 'N/A'}`);

    // Enhanced connection error handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnecting = false;
      connectionPromise = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected - attempting to reconnect...');
      isConnecting = false;
      connectionPromise = null;
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (mongoose.connection.readyState === 0) {
          console.log('Attempting to reconnect to MongoDB...');
          connectDB().catch(console.error);
        }
      }, 5000);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
      isConnecting = false;
    });

    mongoose.connection.on('close', () => {
      console.log('MongoDB connection closed');
      isConnecting = false;
      connectionPromise = null;
    });

    // Handle process termination gracefully
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, closing MongoDB connection...');
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, closing MongoDB connection...');
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });

    isConnecting = false;
    return conn.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    isConnecting = false;
    connectionPromise = null;
    
    // Don't exit process immediately, try to reconnect
    console.log('Will attempt to reconnect in 10 seconds...');
    setTimeout(() => {
      if (mongoose.connection.readyState === 0) {
        connectDB().catch(console.error);
      }
    }, 10000);
    
    throw error;
  }
};

// Export connection functions that handle production environment
module.exports = {
  connectDB,
  getConnection: () => {
    // Return null connection in production to prevent MongoDB usage
    if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
      return null;
    }
    return mongoose.connection;
  }
};
