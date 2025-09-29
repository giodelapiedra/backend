const mongoose = require('mongoose');
const User = require('../models/User');
const RehabilitationPlan = require('../models/RehabilitationPlan');
const Case = require('../models/Case');

async function checkUserAccounts() {
  try {
    console.log('🔍 Checking User Accounts and Database Connection...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB database: data5\n');

    // Check all users
    console.log('👥 All Users in Database:');
    const users = await User.find({});
    console.log(`Total users: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - ID: ${user._id}`);
      console.log(`   - Created: ${user.createdAt}`);
      console.log('');
    });

    // Check rehabilitation plans
    console.log('📋 All Rehabilitation Plans:');
    const plans = await RehabilitationPlan.find({})
      .populate('worker', 'firstName lastName email')
      .populate('clinician', 'firstName lastName email')
      .populate('case', 'caseNumber');
    
    console.log(`Total plans: ${plans.length}\n`);
    
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.planName}`);
      console.log(`   - Worker: ${plan.worker?.firstName} ${plan.worker?.lastName} (${plan.worker?.email})`);
      console.log(`   - Clinician: ${plan.clinician?.firstName} ${plan.clinician?.lastName} (${plan.clinician?.email})`);
      console.log(`   - Case: ${plan.case?.caseNumber}`);
      console.log(`   - Status: ${plan.status}`);
      console.log(`   - Exercises: ${plan.exercises.length}`);
      console.log(`   - Daily Completions: ${plan.dailyCompletions.length}`);
      console.log('');
    });

    // Test login credentials
    console.log('🔐 Testing Login Credentials:');
    
    // Test clinician login
    const clinician = await User.findOne({ email: 'clinician@example.com' });
    if (clinician) {
      console.log('✅ Clinician found:');
      console.log(`   - Name: ${clinician.firstName} ${clinician.lastName}`);
      console.log(`   - Email: ${clinician.email}`);
      console.log(`   - Role: ${clinician.role}`);
      console.log(`   - ID: ${clinician._id}`);
      
      // Check if this clinician has any plans
      const clinicianPlans = await RehabilitationPlan.find({ clinician: clinician._id });
      console.log(`   - Assigned Plans: ${clinicianPlans.length}`);
    } else {
      console.log('❌ Clinician not found with email: clinician@example.com');
    }
    
    console.log('');
    
    // Test worker login
    const worker = await User.findOne({ email: 'test.user@example.com' });
    if (worker) {
      console.log('✅ Worker found:');
      console.log(`   - Name: ${worker.firstName} ${worker.lastName}`);
      console.log(`   - Email: ${worker.email}`);
      console.log(`   - Role: ${worker.role}`);
      console.log(`   - ID: ${worker._id}`);
      
      // Check if this worker has any plans
      const workerPlans = await RehabilitationPlan.find({ worker: worker._id });
      console.log(`   - Assigned Plans: ${workerPlans.length}`);
    } else {
      console.log('❌ Worker not found with email: test.user@example.com');
    }

    console.log('\n🎯 Summary:');
    console.log(`- Total Users: ${users.length}`);
    console.log(`- Total Rehabilitation Plans: ${plans.length}`);
    console.log(`- Plans with completions: ${plans.filter(p => p.dailyCompletions.length > 0).length}`);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkUserAccounts();
