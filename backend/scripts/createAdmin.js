const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      console.log('Login credentials:');
      console.log('  Email:', existingAdmin.email);
      console.log('  Password: password123');
      return;
    }

    // Create admin user
    const admin = new User({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@system.com',
      password: 'password123',
      role: 'admin',
      phone: '+1-555-0123',
      isActive: true
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Login credentials:');
    console.log('  Email: admin@system.com');
    console.log('  Password: password123');
    console.log('\nAdmin capabilities:');
    console.log('✅ Create users of any role');
    console.log('✅ Edit user details and roles');
    console.log('✅ Delete/deactivate users');
    console.log('✅ View all system data');
    console.log('✅ Test alert system');
    console.log('✅ Full system access');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createAdminUser();
