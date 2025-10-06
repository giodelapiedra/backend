const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// API URL
const API_URL = 'http://localhost:5000/api';

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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Test admin login with API
async function testAdminLoginAPI() {
  try {
    console.log('🔍 Testing admin login with API calls...');
    
    for (const admin of adminCredentials) {
      console.log(`\nTesting API login for: ${admin.email}`);
      
      try {
        // Try to login with API
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: admin.email,
          password: admin.password
        });
        
        console.log(`✅ API Login successful for: ${admin.email}`);
        console.log('User data:', response.data.user);
        
      } catch (apiError) {
        console.log(`❌ API Login failed for: ${admin.email}`);
        console.log('Error:', apiError.response?.data?.message || apiError.message);
        
        // Fix the user in the database
        console.log('Fixing user in database...');
        
        // Find user by email
        const user = await User.findOne({ email: admin.email });
        
        if (!user) {
          console.log(`❌ User not found with email: ${admin.email}`);
          console.log('Creating admin user...');
          
          // Create the admin user with proper password hashing
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(admin.password, salt);
          
          const newAdmin = new User({
            firstName: admin.email.split('@')[0].split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            lastName: 'Admin',
            email: admin.email,
            password: hashedPassword,
            role: 'admin',
            isActive: true,
            loginAttempts: 0
          });
          
          await newAdmin.save();
          console.log(`✅ Created admin user: ${admin.email}`);
          
        } else {
          // Update password directly with proper hashing
          console.log('Updating user password with proper hashing...');
          
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(admin.password, salt);
          
          user.password = hashedPassword;
          user.isActive = true;
          user.loginAttempts = 0;
          
          await user.save();
          console.log(`✅ Updated password for: ${admin.email}`);
          
          // Try login again
          try {
            const retryResponse = await axios.post(`${API_URL}/auth/login`, {
              email: admin.email,
              password: admin.password
            });
            
            console.log(`✅ Retry login successful for: ${admin.email}`);
            console.log('User data:', retryResponse.data.user);
            
          } catch (retryError) {
            console.log(`❌ Retry login still failed for: ${admin.email}`);
            console.log('Error:', retryError.response?.data?.message || retryError.message);
            
            // Show user details from database
            console.log('User details from database:');
            console.log('- ID:', user._id);
            console.log('- Role:', user.role);
            console.log('- Active:', user.isActive);
            console.log('- Login attempts:', user.loginAttempts);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing admin login with API:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
testAdminLoginAPI();
