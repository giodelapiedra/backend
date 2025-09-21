const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function checkWorkerAccounts() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all worker accounts
    const workers = await User.find({ role: 'worker' }).select('-password');
    console.log(`Found ${workers.length} worker accounts:`);
    
    workers.forEach(worker => {
      console.log(`- ${worker.firstName} ${worker.lastName} (${worker.email})`);
    });

    // Find all clinician accounts
    const clinicians = await User.find({ role: 'clinician' }).select('-password');
    console.log(`\nFound ${clinicians.length} clinician accounts:`);
    
    clinicians.forEach(clinician => {
      console.log(`- ${clinician.firstName} ${clinician.lastName} (${clinician.email})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkWorkerAccounts();
