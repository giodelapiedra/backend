const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Case = require('../models/Case');
const Incident = require('../models/Incident');

async function setupTestData() {
  try {
    console.log('Setting up test data for alert system...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find or create a clinician
    let clinician = await User.findOne({ role: 'clinician', isActive: true });
    if (!clinician) {
      console.log('Creating test clinician...');
      clinician = new User({
        firstName: 'Dr. Test',
        lastName: 'Clinician',
        email: 'test.clinician@example.com',
        password: 'password123',
        role: 'clinician',
        specialty: 'Physical Therapy',
        licenseNumber: 'PT123456'
      });
      await clinician.save();
      console.log('Created clinician:', clinician.email);
    } else {
      console.log('Found existing clinician:', clinician.email);
    }

    // Find or create a worker
    let worker = await User.findOne({ role: 'worker', isActive: true });
    if (!worker) {
      console.log('Creating test worker...');
      worker = new User({
        firstName: 'Test',
        lastName: 'Worker',
        email: 'test.worker@example.com',
        password: 'password123',
        role: 'worker'
      });
      await worker.save();
      console.log('Created worker:', worker.email);
    } else {
      console.log('Found existing worker:', worker.email);
    }

    // Find or create a case manager
    let caseManager = await User.findOne({ role: 'case_manager', isActive: true });
    if (!caseManager) {
      console.log('Creating test case manager...');
      caseManager = new User({
        firstName: 'Test',
        lastName: 'CaseManager',
        email: 'test.casemanager@example.com',
        password: 'password123',
        role: 'case_manager'
      });
      await caseManager.save();
      console.log('Created case manager:', caseManager.email);
    } else {
      console.log('Found existing case manager:', caseManager.email);
    }

    // Find or create an employer
    let employer = await User.findOne({ role: 'employer', isActive: true });
    if (!employer) {
      console.log('Creating test employer...');
      employer = new User({
        firstName: 'Test',
        lastName: 'Employer',
        email: 'test.employer@example.com',
        password: 'password123',
        role: 'employer'
      });
      await employer.save();
      console.log('Created employer:', employer.email);
    } else {
      console.log('Found existing employer:', employer.email);
    }

    // Check if there's already a case assigned to the clinician
    let testCase = await Case.findOne({ clinician: clinician._id }).populate('clinician worker caseManager');
    
    if (!testCase) {
      console.log('Creating test case with clinician assignment...');
      
      // Create a test incident
      const incident = new Incident({
        incidentNumber: 'INC-TEST-' + Date.now(),
        incidentDate: new Date(),
        incidentType: 'injury',
        severity: 'medical_treatment',
        description: 'Test incident for alert testing',
        reportedBy: worker._id,
        worker: worker._id,
        employer: employer._id
      });
      await incident.save();
      console.log('Created incident:', incident.incidentNumber);

      // Create case with clinician assigned
      testCase = new Case({
        worker: worker._id,
        employer: employer._id,
        caseManager: caseManager._id,
        clinician: clinician._id,
        incident: incident._id,
        priority: 'high',
        injuryDetails: {
          bodyPart: 'Back',
          injuryType: 'Strain',
          severity: 'moderate',
          description: 'Lower back strain from lifting'
        },
        status: 'triaged'
      });
      await testCase.save();
      console.log('Created case:', testCase.caseNumber);
    } else {
      console.log('Found existing case:', testCase.caseNumber);
    }

    console.log('\n=== Test Data Summary ===');
    console.log('Clinician:', `${clinician.firstName} ${clinician.lastName} (${clinician.email})`);
    console.log('Worker:', `${worker.firstName} ${worker.lastName} (${worker.email})`);
    console.log('Case Manager:', `${caseManager.firstName} ${caseManager.lastName} (${caseManager.email})`);
    console.log('Employer:', `${employer.firstName} ${employer.lastName} (${employer.email})`);
    console.log('Case:', testCase.caseNumber, '- Assigned to clinician:', !!testCase.clinician);
    
    console.log('\n=== Login Credentials ===');
    console.log('Clinician Login:');
    console.log('  Email:', clinician.email);
    console.log('  Password: password123');
    console.log('\nWorker Login:');
    console.log('  Email:', worker.email);
    console.log('  Password: password123');
    console.log('\nCase Manager Login:');
    console.log('  Email:', caseManager.email);
    console.log('  Password: password123');

    console.log('\nTest data setup complete! You can now:');
    console.log('1. Login as the clinician to test the alert system');
    console.log('2. Login as the worker to perform check-ins');
    console.log('3. Use the "Test Alerts" button in the clinician dashboard');

  } catch (error) {
    console.error('Error setting up test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the setup
setupTestData();
