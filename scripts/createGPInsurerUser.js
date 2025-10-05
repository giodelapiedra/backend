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

// GP/Insurer user details
const gpInsurerUser = {
  firstName: 'Dr. James',
  lastName: 'Wilson',
  email: 'gp.insurer@example.com',
  password: 'Password123!',
  role: 'gp_insurer',
  isActive: true
};

// Create GP/Insurer user
async function createGPInsurerUser() {
  try {
    console.log('🔍 Checking if GP/Insurer user already exists...');
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: gpInsurerUser.email });
    
    if (existingUser) {
      console.log('✅ GP/Insurer user already exists. Updating password...');
      
      // Update password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(gpInsurerUser.password, salt);
      
      await User.findByIdAndUpdate(existingUser._id, { 
        password: hashedPassword,
        isActive: true
      });
      
      console.log('✅ GP/Insurer password updated successfully!');
    } else {
      console.log('🆕 Creating new GP/Insurer user...');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(gpInsurerUser.password, salt);
      
      // Create new user
      const newUser = new User({
        firstName: gpInsurerUser.firstName,
        lastName: gpInsurerUser.lastName,
        email: gpInsurerUser.email,
        password: hashedPassword,
        role: gpInsurerUser.role,
        isActive: gpInsurerUser.isActive
      });
      
      await newUser.save();
      console.log('✅ GP/Insurer user created successfully!');
    }
    
    // Display credentials
    console.log('\n🔐 GP/INSURER LOGIN CREDENTIALS:');
    console.log('============================');
    console.log(`Email: ${gpInsurerUser.email}`);
    console.log(`Password: ${gpInsurerUser.password}`);
    
  } catch (error) {
    console.error('❌ Error creating GP/Insurer user:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
createGPInsurerUser();
