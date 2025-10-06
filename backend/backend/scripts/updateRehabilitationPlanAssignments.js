const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const RehabilitationPlan = require('../models/RehabilitationPlan');
const Case = require('../models/Case');

async function updateRehabilitationPlanAssignments() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the new clinician
    const newClinician = await User.findOne({ email: 'projectklouds24@gmail.com' });
    if (!newClinician) {
      console.log('❌ New clinician not found');
      return;
    }
    
    console.log(`✅ Found new clinician: ${newClinician.firstName} ${newClinician.lastName} (${newClinician._id})`);

    // Find all rehabilitation plans
    const plans = await RehabilitationPlan.find({});
    console.log(`📋 Found ${plans.length} rehabilitation plans`);

    // Update all plans to assign them to the new clinician
    let updatedCount = 0;
    for (const plan of plans) {
      if (plan.clinician.toString() !== newClinician._id.toString()) {
        plan.clinician = newClinician._id;
        await plan.save();
        updatedCount++;
        console.log(`✅ Updated plan: ${plan.planName} -> assigned to ${newClinician.firstName} ${newClinician.lastName}`);
      }
    }

    console.log(`\n🎯 Summary:`);
    console.log(`- Total plans: ${plans.length}`);
    console.log(`- Updated plans: ${updatedCount}`);
    console.log(`- Plans already assigned: ${plans.length - updatedCount}`);

    // Verify the assignments
    const assignedPlans = await RehabilitationPlan.find({ clinician: newClinician._id })
      .populate('worker', 'firstName lastName email')
      .populate('case', 'caseNumber');
    
    console.log(`\n📊 Plans now assigned to ${newClinician.firstName} ${newClinician.lastName}:`);
    assignedPlans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.planName}`);
      console.log(`   - Worker: ${plan.worker?.firstName} ${plan.worker?.lastName}`);
      console.log(`   - Case: ${plan.case?.caseNumber}`);
      console.log(`   - Status: ${plan.status}`);
      console.log(`   - Exercises: ${plan.exercises.length}`);
      console.log(`   - Daily Completions: ${plan.dailyCompletions.length}`);
    });

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateRehabilitationPlanAssignments();
