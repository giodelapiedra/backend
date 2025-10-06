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

// Debug password comparison
async function debugPasswordComparison() {
  try {
    console.log('🔍 Debugging password comparison...');
    
    // Find the simple admin user
    const email = 'simple@admin.com';
    const password = '123456';
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      return;
    }
    
    console.log('User found in database:');
    console.log('- ID:', user._id);
    console.log('- Name:', user.firstName, user.lastName);
    console.log('- Role:', user.role);
    console.log('- Active:', user.isActive);
    console.log('- Password hash:', user.password);
    
    // Manual bcrypt comparison
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`\nPassword comparison result: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    // Try with the comparePassword method
    const isMethodMatch = await user.comparePassword(password);
    console.log(`Method comparison result: ${isMethodMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    if (!isMatch) {
      console.log('\nCreating a completely new admin with direct password hash...');
      
      // Create a completely new admin
      const newAdminData = {
        firstName: 'Test',
        lastName: 'Admin',
        email: 'test@admin.com',
        password: 'test123',
        role: 'admin',
        isActive: true
      };
      
      // Hash password manually
      const salt = await bcrypt.genSalt(1);
      const hashedPassword = await bcrypt.hash(newAdminData.password, salt);
      
      // Delete if exists
      await User.deleteOne({ email: newAdminData.email });
      
      // Create new admin with direct hash
      const newAdmin = new User({
        firstName: newAdminData.firstName,
        lastName: newAdminData.lastName,
        email: newAdminData.email,
        password: hashedPassword,
        role: newAdminData.role,
        isActive: newAdminData.isActive,
        loginAttempts: 0
      });
      
      // Save without triggering pre-save hook
      await User.collection.insertOne(newAdmin);
      
      console.log('✅ Created test admin with direct password hash');
      console.log('\n🔐 TEST ADMIN LOGIN CREDENTIALS:');
      console.log('===========================');
      console.log(`Email: ${newAdminData.email}`);
      console.log(`Password: ${newAdminData.password}`);
    }
    
  } catch (error) {
    console.error('❌ Error debugging password comparison:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
debugPasswordComparison();
