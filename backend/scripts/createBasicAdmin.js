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

// Create a very basic admin account
async function createBasicAdmin() {
  try {
    console.log('🔧 Creating basic admin account...');
    
    // Very simple credentials
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin',  // Super simple email
      password: '123', // Super simple password
      role: 'admin',
      isActive: true
    };
    
    // Check if admin exists
    let admin = await User.findOne({ email: adminData.email });
    
    if (admin) {
      console.log('Admin already exists. Updating password...');
      
      // Use very simple password hashing (fewer rounds)
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
      
      // Use very simple password hashing (fewer rounds)
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
    
    console.log('\n🔐 BASIC ADMIN LOGIN CREDENTIALS:');
    console.log('============================');
    console.log(`Email: ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    
    // Also create a normal email admin as backup
    const backupAdminData = {
      firstName: 'Backup',
      lastName: 'Admin',
      email: 'backup@admin.com',
      password: '123456',
      role: 'admin',
      isActive: true
    };
    
    // Check if backup admin exists
    let backupAdmin = await User.findOne({ email: backupAdminData.email });
    
    if (!backupAdmin) {
      console.log('\nCreating backup admin account...');
      
      // Use very simple password hashing (fewer rounds)
      const salt = await bcrypt.genSalt(1); // Minimum rounds
      const hashedPassword = await bcrypt.hash(backupAdminData.password, salt);
      
      // Create backup admin
      backupAdmin = new User({
        firstName: backupAdminData.firstName,
        lastName: backupAdminData.lastName,
        email: backupAdminData.email,
        password: hashedPassword,
        role: backupAdminData.role,
        isActive: backupAdminData.isActive,
        loginAttempts: 0
      });
      
      await backupAdmin.save();
      console.log('✅ Backup admin account created');
    } else {
      console.log('\nUpdating backup admin password...');
      
      // Use very simple password hashing (fewer rounds)
      const salt = await bcrypt.genSalt(1); // Minimum rounds
      const hashedPassword = await bcrypt.hash(backupAdminData.password, salt);
      
      // Update directly in the database
      await User.updateOne(
        { email: backupAdminData.email },
        { 
          $set: { 
            password: hashedPassword,
            isActive: true,
            loginAttempts: 0
          } 
        }
      );
      
      console.log('✅ Backup admin password updated');
    }
    
    console.log('\n🔐 BACKUP ADMIN LOGIN CREDENTIALS:');
    console.log('==============================');
    console.log(`Email: ${backupAdminData.email}`);
    console.log(`Password: ${backupAdminData.password}`);
    
  } catch (error) {
    console.error('❌ Error creating basic admin:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
createBasicAdmin();
