const mongoose = require('mongoose');
require('dotenv').config();
const RehabilitationPlan = require('../models/RehabilitationPlan');
const Case = require('../models/Case');
const User = require('../models/User');

async function checkRehabilitationPlansDatabase() {
  try {
    console.log('🔍 Checking Rehabilitation Plans Database...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get all rehabilitation plans
    const plans = await RehabilitationPlan.find({})
      .populate('case', 'caseNumber status')
      .populate('worker', 'firstName lastName email')
      .populate('clinician', 'firstName lastName email');

    console.log(`📊 Total Rehabilitation Plans: ${plans.length}\n`);

    if (plans.length > 0) {
      plans.forEach((plan, index) => {
        console.log(`📋 Plan ${index + 1}:`);
        console.log(`   - Plan ID: ${plan._id}`);
        console.log(`   - Plan Name: ${plan.planName}`);
        console.log(`   - Status: ${plan.status}`);
        console.log(`   - Worker: ${plan.worker?.firstName} ${plan.worker?.lastName} (${plan.worker?.email})`);
        console.log(`   - Case: ${plan.case?.caseNumber}`);
        console.log(`   - Clinician: ${plan.clinician?.firstName} ${plan.clinician?.lastName}`);
        console.log(`   - Exercises Count: ${plan.exercises.length}`);
        
        if (plan.exercises.length > 0) {
          console.log(`   📝 Exercises:`);
          plan.exercises.forEach((exercise, exIndex) => {
            console.log(`      ${exIndex + 1}. ${exercise.name}`);
            console.log(`         - Duration: ${exercise.duration} minutes`);
            console.log(`         - Category: ${exercise.category}`);
            console.log(`         - Difficulty: ${exercise.difficulty}`);
            console.log(`         - Description: ${exercise.description || 'N/A'}`);
            console.log(`         - Instructions: ${exercise.instructions || 'N/A'}`);
          });
        }
        
        console.log(`   📅 Daily Completions: ${plan.dailyCompletions.length}`);
        if (plan.dailyCompletions.length > 0) {
          console.log(`   📊 Recent Completions:`);
          plan.dailyCompletions.slice(-3).forEach((completion, compIndex) => {
            console.log(`      ${compIndex + 1}. Date: ${completion.date.toLocaleDateString()}`);
            console.log(`         - Overall Status: ${completion.overallStatus}`);
            console.log(`         - Exercises Completed: ${completion.exercises.filter(e => e.status === 'completed').length}/${plan.exercises.length}`);
          });
        }
        
        console.log(`   📈 Progress Stats:`);
        console.log(`      - Completed Days: ${plan.progressStats.completedDays}`);
        console.log(`      - Skipped Days: ${plan.progressStats.skippedDays}`);
        console.log(`      - Consecutive Completed: ${plan.progressStats.consecutiveCompletedDays}`);
        console.log(`      - Consecutive Skipped: ${plan.progressStats.consecutiveSkippedDays}`);
        console.log('');
      });
    } else {
      console.log('❌ No rehabilitation plans found in database');
    }

    // Check database collections
    console.log('🗄️ Database Collections:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });

    console.log('\n📍 Database Location:');
    console.log(`   - Database Name: ${mongoose.connection.name}`);
    console.log(`   - Collection Name: rehabilitationplans`);
    console.log(`   - Full Collection Path: ${mongoose.connection.name}.rehabilitationplans`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkRehabilitationPlansDatabase();
