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

// Fix the User model and create a super admin
async function fixUserModel() {
  try {
    console.log('🔧 Fixing User model and creating super admin...');
    
    // Create super admin with simple password
    const superAdminData = {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@example.com',
      password: 'admin123',
      role: 'admin',
      isActive: true
    };
    
    // Check if super admin exists
    let superAdmin = await User.findOne({ email: superAdminData.email });
    
    if (superAdmin) {
      console.log('Super admin already exists. Updating password...');
      
      // Hash password with simple method
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(superAdminData.password, salt);
      
      // Update user directly in database
      await User.updateOne(
        { email: superAdminData.email },
        { 
          $set: { 
            password: hashedPassword,
            isActive: true,
            loginAttempts: 0
          } 
        }
      );
      
      console.log('✅ Super admin password updated');
    } else {
      console.log('Creating new super admin...');
      
      // Hash password with simple method
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(superAdminData.password, salt);
      
      // Create super admin
      superAdmin = new User({
        firstName: superAdminData.firstName,
        lastName: superAdminData.lastName,
        email: superAdminData.email,
        password: hashedPassword,
        role: superAdminData.role,
        isActive: superAdminData.isActive,
        loginAttempts: 0
      });
      
      await superAdmin.save();
      console.log('✅ Super admin created');
    }
    
    console.log('\n🔐 SUPER ADMIN LOGIN CREDENTIALS:');
    console.log('=============================');
    console.log(`Email: ${superAdminData.email}`);
    console.log(`Password: ${superAdminData.password}`);
    
  } catch (error) {
    console.error('❌ Error fixing User model:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
fixUserModel();
