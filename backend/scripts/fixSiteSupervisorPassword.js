const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/User');

async function fixSiteSupervisorPassword() {
  try {
    console.log('🔧 Fixing Site Supervisor password...\n');
    
    const supervisor = await User.findOne({ role: 'site_supervisor' });
    if (!supervisor) {
      console.log('❌ Site Supervisor not found');
      return;
    }
    
    // Reset password to supervisor123
    const hashedPassword = await bcrypt.hash('supervisor123', 12);
    await User.findByIdAndUpdate(supervisor._id, { password: hashedPassword });
    
    console.log('✅ Site Supervisor password fixed!');
    console.log(`   Name: ${supervisor.firstName} ${supervisor.lastName}`);
    console.log(`   Email: ${supervisor.email}`);
    console.log(`   Password: supervisor123`);
    
    // Test the password
    const updatedSupervisor = await User.findById(supervisor._id);
    const isPasswordValid = await bcrypt.compare('supervisor123', updatedSupervisor.password);
    console.log(`   Password Test: ${isPasswordValid ? '✅ VALID' : '❌ INVALID'}`);
    
  } catch (error) {
    console.error('❌ Error fixing password:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixSiteSupervisorPassword();
