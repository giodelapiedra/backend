const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/User');

async function assignSiteSupervisorToEmployer() {
  try {
    console.log('👷 Assigning Site Supervisor to employer...\n');
    
    // Find the site supervisor
    const supervisor = await User.findOne({ role: 'site_supervisor' });
    if (!supervisor) {
      console.log('❌ Site Supervisor not found');
      return;
    }
    
    // Find the employer (Test Company)
    const employer = await User.findOne({ role: 'employer' });
    if (!employer) {
      console.log('❌ Employer not found');
      return;
    }
    
    // Assign supervisor to employer
    await User.findByIdAndUpdate(supervisor._id, { employer: employer._id });
    
    console.log('✅ Site Supervisor assigned to employer successfully!');
    console.log(`   Supervisor: ${supervisor.firstName} ${supervisor.lastName}`);
    console.log(`   Employer: ${employer.firstName} ${employer.lastName}`);
    console.log(`   Email: ${supervisor.email}`);
    console.log(`   Password: supervisor123`);
    
    console.log('\n🔑 SITE SUPERVISOR CAN NOW:');
    console.log('=' .repeat(40));
    console.log('✅ Report incidents');
    console.log('✅ View incidents from assigned employer');
    console.log('✅ Update incident status');
    console.log('✅ Access supervisor dashboard');
    
  } catch (error) {
    console.error('❌ Error assigning supervisor:', error);
  } finally {
    mongoose.connection.close();
  }
}

assignSiteSupervisorToEmployer();
