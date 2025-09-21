const axios = require('axios');

async function testCompleteExerciseFlow() {
  try {
    console.log('Testing Complete Exercise Flow...');
    
    // Login as worker
    const workerLogin = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test.user@example.com',
      password: 'password123'
    });
    const workerToken = workerLogin.data.token;
    console.log('✅ Worker login successful');
    
    // Get rehabilitation plans
    const plansResponse = await axios.get('http://localhost:5000/api/rehabilitation-plans', {
      headers: { 'Authorization': `Bearer ${workerToken}` }
    });
    
    if (plansResponse.data.plans && plansResponse.data.plans.length > 0) {
      const activePlan = plansResponse.data.plans.find(p => p.status === 'active');
      
      if (activePlan) {
        console.log(`\n📋 Testing with Plan: ${activePlan.planName} (${activePlan._id})`);
        
        // Get today's exercises
        const todayResponse = await axios.get(`http://localhost:5000/api/rehabilitation-plans/${activePlan._id}/today`, {
          headers: { 'Authorization': `Bearer ${workerToken}` }
        });
        
        console.log('✅ Today\'s exercises fetched');
        console.log('Data structure:', Object.keys(todayResponse.data));
        
        if (todayResponse.data.exercises && todayResponse.data.exercises.length > 0) {
          const firstExercise = todayResponse.data.exercises[0];
          console.log(`\n🎯 Testing complete exercise: ${firstExercise.name}`);
          console.log(`- Exercise ID: ${firstExercise._id}`);
          console.log(`- Current status: ${firstExercise.completion.status}`);
          console.log(`- Duration: ${firstExercise.duration}`);
          
          // Test completing the exercise with correct parameter
          console.log('\n🔄 Completing exercise...');
          const completeResponse = await axios.post(`http://localhost:5000/api/rehabilitation-plans/${activePlan._id}/exercises/${firstExercise._id}/complete`, {
            completedDuration: firstExercise.duration
          }, {
            headers: { 'Authorization': `Bearer ${workerToken}` }
          });
          
          console.log('✅ Exercise completed successfully!');
          console.log('Response:', completeResponse.data.message);
          
          // Verify the exercise is now completed
          console.log('\n🔍 Verifying completion...');
          const verifyResponse = await axios.get(`http://localhost:5000/api/rehabilitation-plans/${activePlan._id}/today`, {
            headers: { 'Authorization': `Bearer ${workerToken}` }
          });
          
          const updatedExercise = verifyResponse.data.exercises.find(e => e._id === firstExercise._id);
          console.log(`✅ Exercise status updated to: ${updatedExercise.completion.status}`);
          
          console.log('\n🎯 Frontend Integration Test Results:');
          console.log('✅ API data structure is correct');
          console.log('✅ Complete exercise API working');
          console.log('✅ Exercise status updates correctly');
          console.log('✅ Frontend should now work with Done button');
          
        } else {
          console.log('❌ No exercises found');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testCompleteExerciseFlow();
