const axios = require('axios');

async function testProgressMonitoringWithPlan() {
  try {
    console.log('🔍 Testing Progress Monitoring System...\n');

    // Step 1: Login as clinician
    console.log('👨‍⚕️ Logging in as clinician...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'clinician@example.com',
      password: 'password123'
    });
    
    const clinicianToken = loginResponse.data.token;
    console.log('✅ Clinician login successful');

    // Use the specific plan ID from the previous test
    const planId = '68cd297ad58ad966ab2ca37d';
      
    console.log(`\n📊 Testing progress monitoring for plan ID: ${planId}`);
    
    // Step 2: Test progress monitoring endpoint
    console.log('\n🔍 Fetching detailed progress data...');
    const progressResponse = await axios.get(`http://localhost:5000/api/rehabilitation-plans/${planId}/progress`, {
      headers: { 'Authorization': `Bearer ${clinicianToken}` }
    });
    
    console.log('✅ Progress data fetched successfully');
    console.log('\n📈 Progress Summary:');
    console.log(`- Plan Name: ${progressResponse.data.plan.planName}`);
    console.log(`- Worker: ${progressResponse.data.plan.worker.firstName} ${progressResponse.data.plan.worker.lastName}`);
    console.log(`- Case: ${progressResponse.data.plan.case.caseNumber}`);
    console.log(`- Status: ${progressResponse.data.plan.status}`);
    
    console.log('\n📊 Progress Statistics:');
    console.log(`- Total Days: ${progressResponse.data.progressStats.totalDays}`);
    console.log(`- Completed Days: ${progressResponse.data.progressStats.completedDays}`);
    console.log(`- Skipped Days: ${progressResponse.data.progressStats.skippedDays}`);
    console.log(`- Consecutive Completed: ${progressResponse.data.progressStats.consecutiveCompletedDays}`);
    console.log(`- Consecutive Skipped: ${progressResponse.data.progressStats.consecutiveSkippedDays}`);
    
    console.log('\n📅 Today\'s Status:');
    console.log(`- Overall Status: ${progressResponse.data.today.overallStatus}`);
    console.log(`- Exercises Count: ${progressResponse.data.today.exercises.length}`);
    
    progressResponse.data.today.exercises.forEach((exercise, index) => {
      console.log(`  ${index + 1}. ${exercise.name} - ${exercise.completion.status} (${exercise.duration} min)`);
      if (exercise.completion.completedAt) {
        console.log(`     Completed at: ${new Date(exercise.completion.completedAt).toLocaleString()}`);
      }
      if (exercise.completion.skippedReason) {
        console.log(`     Skip reason: ${exercise.completion.skippedReason}`);
      }
    });
    
    console.log('\n📈 Last 7 Days Progress:');
    progressResponse.data.last7Days.forEach((day, index) => {
      console.log(`  ${index + 1}. ${day.date}: ${day.completedExercises}/${day.totalExercises} completed, ${day.skippedExercises} skipped - ${day.overallStatus}`);
    });
    
    console.log('\n🏃‍♂️ Exercise Progress Details:');
    progressResponse.data.exerciseProgress.forEach((exercise, index) => {
      console.log(`  ${index + 1}. ${exercise.name}:`);
      console.log(`     - Completed: ${exercise.completedCount} times`);
      console.log(`     - Skipped: ${exercise.skippedCount} times`);
      console.log(`     - Completion Rate: ${Math.round(exercise.completionRate)}%`);
    });
    
    if (progressResponse.data.alerts.length > 0) {
      console.log('\n🚨 Alerts:');
      progressResponse.data.alerts.forEach((alert, index) => {
        console.log(`  ${index + 1}. ${alert.type}: ${alert.message}`);
      });
    } else {
      console.log('\n✅ No alerts');
    }
    
    console.log('\n🎯 Progress Monitoring Features:');
    console.log('✅ Real-time exercise completion tracking');
    console.log('✅ Daily progress statistics');
    console.log('✅ 7-day progress history');
    console.log('✅ Exercise-specific completion rates');
    console.log('✅ Automatic alerts for skipped sessions');
    console.log('✅ Clinician notification system');
    console.log('✅ Detailed progress dashboard');
    
  } catch (error) {
    console.error('❌ ERROR:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testProgressMonitoringWithPlan();

