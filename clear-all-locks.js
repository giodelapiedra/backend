const mongoose = require('mongoose');
const User = require('./models/User');

async function clearAllLoginAttempts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab');
    console.log('Connected to MongoDB');
    
    // Clear login attempts and unlock all accounts
    const result = await User.updateMany(
      {},
      {
        $unset: { 
          loginAttempts: 1, 
          lockUntil: 1 
        }
      }
    );
    
    console.log(`Cleared login attempts for ${result.modifiedCount} users`);
    console.log('All accounts are now unlocked!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

clearAllLoginAttempts();
