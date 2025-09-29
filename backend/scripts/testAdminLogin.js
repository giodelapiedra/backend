const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Admin credentials to test
const adminCredentials = [
  {
    email: 'admin@example.com',
    password: 'Password123!'
  },
  {
    email: 'system.admin@example.com',
    password: 'Password123!'
  },
  {
    email: 'super.admin@example.com',
    password: 'Password123!'
  }
];

// Test admin login
async function testAdminLogin() {
  try {
    console.log('🔍 Testing admin login credentials...');
    
    for (const admin of adminCredentials) {
      console.log(`\nTesting login for: ${admin.email}`);
      
      // Find user by email
      const user = await User.findOne({ email: admin.email }).select('+password');
      
      if (!user) {
        console.log(`❌ User not found with email: ${admin.email}`);
        console.log('Creating this admin account now...');
        
        // Create the admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin.password, salt);
        
        const newAdmin = new User({
          firstName: admin.email.split('@')[0].split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          lastName: 'Admin',
          email: admin.email,
          password: hashedPassword,
          role: 'admin',
          isActive: true
        });
        
        await newAdmin.save();
        console.log(`✅ Created admin user: ${admin.email}`);
        continue;
      }
      
      // Check if user is active
      if (!user.isActive) {
        console.log(`❌ User account is inactive: ${admin.email}`);
        console.log('Activating account...');
        
        user.isActive = true;
        await user.save();
        console.log(`✅ Account activated: ${admin.email}`);
      }
      
      // Check password
      const isMatch = await bcrypt.compare(admin.password, user.password);
      
      if (!isMatch) {
        console.log(`❌ Password doesn't match for: ${admin.email}`);
        console.log('Updating password...');
        
        // Update password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin.password, salt);
        
        user.password = hashedPassword;
        await user.save();
        console.log(`✅ Password updated for: ${admin.email}`);
      } else {
        console.log(`✅ Password matches for: ${admin.email}`);
      }
      
      // Check role
      if (user.role !== 'admin') {
        console.log(`❌ User is not an admin. Current role: ${user.role}`);
        console.log('Updating role to admin...');
        
        user.role = 'admin';
        await user.save();
        console.log(`✅ Role updated to admin for: ${admin.email}`);
      } else {
        console.log(`✅ User has admin role: ${admin.email}`);
      }
    }
    
    console.log('\n🔐 ADMIN LOGIN CREDENTIALS (VERIFIED):');
    console.log('=================================');
    for (const admin of adminCredentials) {
      console.log(`Email: ${admin.email}`);
      console.log(`Password: ${admin.password}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('❌ Error testing admin login:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
testAdminLogin();
