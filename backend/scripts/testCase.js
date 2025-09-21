require('dotenv').config();
const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const User = require('../models/User');

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5');
    console.log('Connected to MongoDB');

    // Create test users if they don't exist
    const worker = await User.findOneAndUpdate(
      { email: 'testworker@example.com' },
      {
        firstName: 'Test',
        lastName: 'Worker',
        email: 'testworker@example.com',
        phone: '1234567890',
        role: 'worker',
        isActive: true
      },
      { upsert: true, new: true }
    );

    const employer = await User.findOneAndUpdate(
      { email: 'testemployer@example.com' },
      {
        firstName: 'Test',
        lastName: 'Employer',
        email: 'testemployer@example.com',
        phone: '1234567890',
        role: 'employer',
        isActive: true
      },
      { upsert: true, new: true }
    );

    // Create test incident
    const incident = await Incident.create({
      reportedBy: employer._id,
      worker: worker._id,
      employer: employer._id,
      incidentDate: new Date(),
      location: {
        site: 'Test Site',
        department: 'Test Department',
        specificLocation: 'Test Location'
      },
      incidentType: 'slip_fall',
      severity: 'lost_time',
      description: 'Test incident for case creation',
      status: 'reported'
    });

    console.log('Test incident created:', incident);
    
    // Create test clinician
    const clinician = await User.findOneAndUpdate(
      { email: 'testclinician@example.com' },
      {
        firstName: 'Test',
        lastName: 'Clinician',
        email: 'testclinician@example.com',
        phone: '1234567890',
        role: 'clinician',
        specialty: 'General',
        isActive: true,
        isAvailable: true
      },
      { upsert: true, new: true }
    );

    console.log('Test data created successfully');
    console.log('Worker ID:', worker._id);
    console.log('Employer ID:', employer._id);
    console.log('Clinician ID:', clinician._id);
    console.log('Incident ID:', incident._id);
    console.log('Incident Number:', incident.incidentNumber);

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestData();
