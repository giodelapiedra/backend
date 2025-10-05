const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function clearRateLimit() {
  try {
    console.log('🔓 Clearing Rate Limits...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Reset all users' login attempts and lock status
    const result = await User.updateMany(
      {},
      {
        $unset: {
          loginAttempts: 1,
          lockUntil: 1
        }
      }
    );

    console.log(`✅ Cleared rate limits for ${result.modifiedCount} users`);
    
    // Verify the reset
    const users = await User.find({}).select('email loginAttempts lockUntil');
    console.log('\n📋 User Status After Reset:');
    users.forEach(user => {
      console.log(`- ${user.email}: Attempts: ${user.loginAttempts || 0}, Locked: ${user.lockUntil ? 'Yes' : 'No'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

clearRateLimit();
