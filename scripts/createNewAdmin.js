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

// Create a new admin user with a different email
async function createNewAdmin() {
  try {
    console.log('🔍 Creating new admin user...');
    
    // Check if user already exists
    const email = 'new.admin@example.com';
    const password = 'Admin123!';
    
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log(`User already exists with email: ${email}`);
      
      // Update password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      existingUser.password = hashedPassword;
      existingUser.isActive = true;
      existingUser.role = 'admin';
      existingUser.loginAttempts = 0;
      
      await existingUser.save();
      console.log(`✅ Updated user: ${email}`);
      
    } else {
      // Create new user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const newUser = new User({
        firstName: 'New',
        lastName: 'Admin',
        email,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        loginAttempts: 0
      });
      
      await newUser.save();
      console.log(`✅ Created new admin user: ${email}`);
    }
    
    console.log('\n🔐 NEW ADMIN LOGIN CREDENTIALS:');
    console.log('============================');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error('❌ Error creating new admin user:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
createNewAdmin();
