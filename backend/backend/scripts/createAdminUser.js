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

// Admin user details
const adminUser = {
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  password: 'Password123!',
  role: 'admin',
  isActive: true
};

// Create admin user
async function createAdminUser() {
  try {
    console.log('🔍 Checking if admin user already exists...');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists. Updating password...');
      
      // Update admin password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminUser.password, salt);
      
      await User.findByIdAndUpdate(existingAdmin._id, { 
        password: hashedPassword,
        isActive: true
      });
      
      console.log('✅ Admin password updated successfully!');
    } else {
      console.log('🆕 Creating new admin user...');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminUser.password, salt);
      
      // Create new admin user
      const newAdmin = new User({
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
        password: hashedPassword,
        role: adminUser.role,
        isActive: adminUser.isActive
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created successfully!');
    }
    
    // Create additional admin users if needed
    const additionalAdmins = [
      {
        firstName: 'System',
        lastName: 'Administrator',
        email: 'system.admin@example.com',
        password: 'Password123!',
        role: 'admin',
        isActive: true
      },
      {
        firstName: 'Super',
        lastName: 'Admin',
        email: 'super.admin@example.com',
        password: 'Password123!',
        role: 'admin',
        isActive: true
      }
    ];
    
    for (const admin of additionalAdmins) {
      const existingUser = await User.findOne({ email: admin.email });
      
      if (!existingUser) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin.password, salt);
        
        // Create new admin user
        const newAdmin = new User({
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          password: hashedPassword,
          role: admin.role,
          isActive: admin.isActive
        });
        
        await newAdmin.save();
        console.log(`✅ Additional admin user created: ${admin.email}`);
      } else {
        // Update password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin.password, salt);
        
        await User.findByIdAndUpdate(existingUser._id, { 
          password: hashedPassword,
          isActive: true
        });
        
        console.log(`✅ Additional admin user updated: ${admin.email}`);
      }
    }
    
    // Display admin credentials
    console.log('\n🔐 ADMIN LOGIN CREDENTIALS:');
    console.log('========================');
    console.log('1. Primary Admin:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: ${adminUser.password}`);
    console.log('\n2. System Administrator:');
    console.log(`   Email: ${additionalAdmins[0].email}`);
    console.log(`   Password: ${additionalAdmins[0].password}`);
    console.log('\n3. Super Admin:');
    console.log(`   Email: ${additionalAdmins[1].email}`);
    console.log(`   Password: ${additionalAdmins[1].password}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
createAdminUser();
