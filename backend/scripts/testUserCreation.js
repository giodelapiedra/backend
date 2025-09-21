const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function testUserCreation() {
  try {
    console.log('Testing user creation...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Test data
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test.user@example.com',
      password: 'password123',
      role: 'worker',
      phone: '+1-555-0123'
    };

    // Check if user already exists
    const existingUser = await User.findOne({ email: testUser.email });
    if (existingUser) {
      console.log('Test user already exists:', existingUser.email);
      return;
    }

    // Create test user
    const user = new User(testUser);
    await user.save();
    
    console.log('Test user created successfully!');
    console.log('User details:', {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      phone: user.phone
    });

    // Test different roles
    const roles = ['clinician', 'case_manager', 'employer', 'site_supervisor'];
    
    for (const role of roles) {
      const roleUser = {
        firstName: `Test`,
        lastName: `${role.charAt(0).toUpperCase() + role.slice(1)}`,
        email: `test.${role}@example.com`,
        password: 'password123',
        role: role,
        phone: '+1-555-0123'
      };

      // Check if exists
      const existing = await User.findOne({ email: roleUser.email });
      if (!existing) {
        const newUser = new User(roleUser);
        await newUser.save();
        console.log(`Created ${role} user:`, newUser.email);
      } else {
        console.log(`${role} user already exists:`, existing.email);
      }
    }

    // Show all users
    const allUsers = await User.find({}).select('-password');
    console.log(`\nTotal users in database: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testUserCreation();
