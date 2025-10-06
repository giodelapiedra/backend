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

// Create a simple admin account
async function createSimpleAdmin() {
  try {
    console.log('🔧 Creating simple admin account...');
    
    // Simple credentials
    const adminData = {
      firstName: 'Simple',
      lastName: 'Admin',
      email: 'simple@admin.com',  // Valid email format
      password: '123456', // Simple password
      role: 'admin',
      isActive: true
    };
    
    // Check if admin exists
    let admin = await User.findOne({ email: adminData.email });
    
    if (admin) {
      console.log('Admin already exists. Updating password...');
      
      // Use simple password hashing (fewer rounds)
      const salt = await bcrypt.genSalt(1); // Minimum rounds
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      
      // Update directly in the database
      await User.updateOne(
        { email: adminData.email },
        { 
          $set: { 
            password: hashedPassword,
            isActive: true,
            loginAttempts: 0
          } 
        }
      );
      
      console.log('✅ Admin password updated');
      
      // Double-check the update
      admin = await User.findOne({ email: adminData.email }).select('+password');
      console.log('Updated password hash:', admin.password);
    } else {
      console.log('Creating new admin account...');
      
      // Use simple password hashing (fewer rounds)
      const salt = await bcrypt.genSalt(1); // Minimum rounds
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      
      // Create admin
      admin = new User({
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email,
        password: hashedPassword,
        role: adminData.role,
        isActive: adminData.isActive,
        loginAttempts: 0
      });
      
      await admin.save();
      console.log('✅ Admin account created');
      
      // Double-check the creation
      const createdAdmin = await User.findOne({ email: adminData.email }).select('+password');
      console.log('Password hash:', createdAdmin.password);
    }
    
    console.log('\n🔐 SIMPLE ADMIN LOGIN CREDENTIALS:');
    console.log('============================');
    console.log(`Email: ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    
  } catch (error) {
    console.error('❌ Error creating simple admin:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
createSimpleAdmin();
