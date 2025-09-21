const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function createSupervisorAccount() {
  try {
    console.log('🔍 Creating Supervisor Account...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB database: data5\n');

    // Check if supervisor already exists
    let supervisor = await User.findOne({ email: 'supervisor@example.com' });
    
    if (supervisor) {
      console.log('Supervisor already exists, updating password...');
      supervisor.password = 'Password123!';
      await supervisor.save();
      console.log('✅ Password updated to "Password123!"');
    } else {
      console.log('Creating new supervisor account...');
      
      // Create new supervisor
      supervisor = new User({
        firstName: 'Robert',
        lastName: 'Wilson',
        email: 'supervisor@example.com',
        password: 'Password123!',
        role: 'site_supervisor',
        phone: '+1234567890',
        address: {
          street: '123 Construction Site',
          city: 'Manila',
          state: 'Metro Manila',
          zipCode: '1000'
        },
        specialty: 'Construction Safety',
        isActive: true
      });
      
      await supervisor.save();
      console.log('✅ New supervisor account created');
    }
    
    console.log(`\n👷‍♂️ Supervisor Account Details:`);
    console.log(`- Name: ${supervisor.firstName} ${supervisor.lastName}`);
    console.log(`- Email: ${supervisor.email}`);
    console.log(`- Role: ${supervisor.role}`);
    console.log(`- ID: ${supervisor._id}`);
    console.log(`- Password: Password123!`);
    
    // Verify the password
    const isPasswordValid = await supervisor.comparePassword('Password123!');
    console.log(`- Password verification: ${isPasswordValid}`);

    console.log('\n🎯 Login Instructions:');
    console.log('====================');
    console.log('1. Go to: http://localhost:3000');
    console.log('2. Email: supervisor@example.com');
    console.log('3. Password: Password123!');
    console.log('4. Click Login');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createSupervisorAccount();
