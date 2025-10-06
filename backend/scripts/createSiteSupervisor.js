const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/User');

async function createSiteSupervisor() {
  try {
    console.log('👷 Creating Site Supervisor account...\n');
    
    // Check if site supervisor already exists
    const existingSupervisor = await User.findOne({ role: 'site_supervisor' });
    if (existingSupervisor) {
      console.log('✅ Site Supervisor already exists:');
      console.log(`   Name: ${existingSupervisor.firstName} ${existingSupervisor.lastName}`);
      console.log(`   Email: ${existingSupervisor.email}`);
      console.log(`   Password: supervisor123`);
      return;
    }
    
    // Create site supervisor
    const hashedPassword = await bcrypt.hash('supervisor123', 12);
    
    const supervisor = new User({
      firstName: 'Site',
      lastName: 'Supervisor',
      email: 'supervisor@company.com',
      password: hashedPassword,
      role: 'site_supervisor',
      isActive: true,
      phone: '+1-555-0123',
      department: 'Safety Department',
      employeeId: 'SS001'
    });
    
    await supervisor.save();
    
    console.log('✅ Site Supervisor created successfully!');
    console.log(`   Name: ${supervisor.firstName} ${supervisor.lastName}`);
    console.log(`   Email: ${supervisor.email}`);
    console.log(`   Password: supervisor123`);
    console.log(`   Role: ${supervisor.role}`);
    console.log(`   Employee ID: ${supervisor.employeeId}`);
    
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('=' .repeat(40));
    console.log('Email: supervisor@company.com');
    console.log('Password: supervisor123');
    
  } catch (error) {
    console.error('❌ Error creating site supervisor:', error);
  } finally {
    mongoose.connection.close();
  }
}

createSiteSupervisor();
