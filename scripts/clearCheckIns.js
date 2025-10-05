const mongoose = require('mongoose');
require('dotenv').config();

const CheckIn = require('../models/CheckIn');

async function clearAllCheckIns() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Count existing check-ins
    const countBefore = await CheckIn.countDocuments();
    console.log(`Found ${countBefore} check-ins in database`);

    if (countBefore === 0) {
      console.log('No check-ins to clear.');
      return;
    }

    // Delete all check-ins
    const result = await CheckIn.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} check-ins from database`);

    // Verify deletion
    const countAfter = await CheckIn.countDocuments();
    console.log(`Check-ins remaining: ${countAfter}`);

    if (countAfter === 0) {
      console.log('✅ All check-ins cleared successfully!');
    } else {
      console.log('⚠️ Some check-ins may still exist');
    }

  } catch (error) {
    console.error('Error clearing check-ins:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
clearAllCheckIns();
