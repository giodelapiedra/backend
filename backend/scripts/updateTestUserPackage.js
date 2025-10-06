const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function updateTestUserPackage() {
  try {
    console.log('Updating test user package...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the test user
    const testUser = await User.findOne({ email: 'test.user@example.com' });
    
    if (!testUser) {
      console.log('❌ Test user not found with email: test.user@example.com');
      console.log('Creating test user with package2...');
      
      // Create the test user with package2
      const newUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        password: 'password123',
        role: 'worker',
        phone: '+1-555-0123',
        package: 'package2',
        isActive: true
      });
      
      await newUser.save();
      console.log('✅ Test user created with package2');
      console.log('User details:', {
        id: newUser._id,
        name: `${newUser.firstName} ${newUser.lastName}`,
        email: newUser.email,
        role: newUser.role,
        package: newUser.package,
        phone: newUser.phone
      });
    } else {
      console.log('✅ Test user found:', testUser.email);
      console.log('Current package:', testUser.package);
      
      // Update the package to package2
      testUser.package = 'package2';
      await testUser.save();
      
      console.log('✅ Updated test user package to package2');
      console.log('Updated user details:', {
        id: testUser._id,
        name: `${testUser.firstName} ${testUser.lastName}`,
        email: testUser.email,
        role: testUser.role,
        package: testUser.package,
        phone: testUser.phone
      });
    }

    // Verify the update
    const updatedUser = await User.findOne({ email: 'test.user@example.com' });
    console.log('\n🔍 Verification:');
    console.log(`Email: ${updatedUser.email}`);
    console.log(`Package: ${updatedUser.package}`);
    console.log(`Role: ${updatedUser.role}`);
    console.log(`Active: ${updatedUser.isActive}`);

  } catch (error) {
    console.error('❌ Error updating test user package:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
updateTestUserPackage();
