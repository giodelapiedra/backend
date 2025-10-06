const axios = require('axios');

async function testIncidentCreation() {
  try {
    console.log('🔍 Testing Incident Creation...\n');

    // Step 1: Login as site supervisor
    console.log('👷‍♂️ Logging in as Site Supervisor...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'supervisor@example.com',
      password: 'Password123!'
    });
    
    const supervisorToken = loginResponse.data.token;
    console.log('✅ Site supervisor login successful');
    console.log('Supervisor:', loginResponse.data.user.firstName, loginResponse.data.user.lastName);
    console.log('Role:', loginResponse.data.user.role);
    console.log('Employer assigned:', loginResponse.data.user.employer ? 'Yes' : 'No');

    // Step 2: Get workers
    console.log('\n👥 Fetching workers...');
    const workersResponse = await axios.get('http://localhost:5000/api/users?role=worker', {
      headers: { 'Authorization': `Bearer ${supervisorToken}` }
    });
    
    const workers = workersResponse.data.users || [];
    console.log(`✅ Found ${workers.length} workers`);
    
    if (workers.length === 0) {
      console.log('❌ No workers found to report incident for');
      return;
    }

    const worker = workers[0];
    console.log(`Selected worker: ${worker.firstName} ${worker.lastName} (${worker.email})`);
    console.log(`Worker ID: ${worker.id}`);

    // Step 3: Test incident reporting
    console.log('\n📝 Testing incident reporting...');
    const incidentData = {
      worker: worker.id,
      incidentDate: new Date().toISOString(),
      incidentType: 'slip_fall',
      severity: 'first_aid',
      description: 'Test incident reported by site supervisor without employer assignment'
    };

    console.log('Sending incident data:', JSON.stringify(incidentData, null, 2));

    const incidentResponse = await axios.post('http://localhost:5000/api/incidents', incidentData, {
      headers: { 
        'Authorization': `Bearer ${supervisorToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Incident reported successfully!');
    console.log('Incident ID:', incidentResponse.data.incident._id);
    console.log('Incident Number:', incidentResponse.data.incident.incidentNumber);
    console.log('Status:', incidentResponse.data.incident.status);

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

testIncidentCreation();


