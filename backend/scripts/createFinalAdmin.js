const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Create admin directly in the database
async function createFinalAdmin() {
  try {
    console.log('🔧 Creating final admin account...');
    
    // Very simple credentials
    const adminData = {
      firstName: 'Final',
      lastName: 'Admin',
      email: 'admin@admin.com',
      password: 'admin',
      role: 'admin',
      isActive: true
    };
    
    // Hash password manually with minimal rounds
    const salt = await bcrypt.genSalt(1);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);
    
    // Check if admin exists
    const existingAdmin = await mongoose.connection.collection('users').findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log('Admin already exists. Updating password...');
      
      // Update directly in the database
      await mongoose.connection.collection('users').updateOne(
        { email: adminData.email },
        { 
          $set: { 
            password: hashedPassword,
            isActive: true,
            loginAttempts: 0,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('✅ Admin password updated directly in database');
    } else {
      console.log('Creating new admin directly in database...');
      
      // Create admin document
      const adminDoc = {
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        email: adminData.email,
        password: hashedPassword,
        role: adminData.role,
        isActive: adminData.isActive,
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert directly into the database
      await mongoose.connection.collection('users').insertOne(adminDoc);
      
      console.log('✅ Admin created directly in database');
    }
    
    // Verify admin
    const admin = await mongoose.connection.collection('users').findOne({ email: adminData.email });
    
    console.log('\nAdmin in database:');
    console.log('- ID:', admin._id);
    console.log('- Name:', admin.firstName, admin.lastName);
    console.log('- Email:', admin.email);
    console.log('- Role:', admin.role);
    console.log('- Active:', admin.isActive);
    console.log('- Password hash:', admin.password);
    
    console.log('\n🔐 FINAL ADMIN LOGIN CREDENTIALS:');
    console.log('============================');
    console.log(`Email: ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    
  } catch (error) {
    console.error('❌ Error creating final admin:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
createFinalAdmin();
