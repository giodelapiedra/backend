const mongoose = require('mongoose');
const User = require('./models/User');

async function resetAllPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab');
    console.log('Connected to MongoDB');
    
    // Reset passwords for common test users
    const usersToReset = [
      { email: 'admin@example.com', password: 'Admin123' },
      { email: 'michael.johnson@example.com', password: 'Clinician123' },
      { email: 'sarah.wilson@example.com', password: 'Manager123' },
      { email: 'supervisor@company.com', password: 'Supervisor123' },
      { email: 'teamleader@example.com', password: 'Teamleader123' },
      { email: 'test@company.com', password: 'Employer123' }
    ];
    
    for (const userData of usersToReset) {
      const user = await User.findOne({ email: userData.email });
      
      if (user) {
        console.log(`Resetting password for: ${user.email}`);
        user.password = userData.password;
        await user.save();
        
        // Test the password
        const testUser = await User.findOne({ email: userData.email }).select('+password');
        const isMatch = await testUser.comparePassword(userData.password);
        console.log(`Password test for ${user.email}: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
      } else {
        console.log(`User not found: ${userData.email}`);
      }
    }
    
    console.log('\nAll passwords reset successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

resetAllPasswords();
