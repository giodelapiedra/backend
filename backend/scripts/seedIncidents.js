const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Incident = require('../models/Incident');

const seedIncidents = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab');
    console.log('Connected to MongoDB');

    // Clear existing incidents
    await Incident.deleteMany({});
    console.log('Cleared existing incidents');

    // Get users
    const workers = await User.find({ role: 'worker' });
    const employer = await User.findOne({ role: 'employer' });
    const siteSupervisor = await User.findOne({ role: 'site_supervisor' });

    if (!workers.length || !employer || !siteSupervisor) {
      console.error('Required users not found. Please run seedUsersOnly.js first.');
      return;
    }

    console.log('Found required users for creating incidents');

    // Create sample incidents
    const incident1 = new Incident({
      incidentNumber: 'INC-2024-001',
      incidentDate: new Date('2024-01-15'),
      location: {
        site: 'Construction Site A',
        department: 'Construction',
        specificLocation: 'Building Floor 2'
      },
      incidentType: 'slip_fall',
      severity: 'medical_treatment',
      description: 'Worker slipped on wet surface and injured back',
      worker: workers[0]._id,
      reportedBy: siteSupervisor._id,
      employer: employer._id,
      status: 'reported',
      immediateCause: 'Wet surface from recent cleaning',
      rootCause: 'Inadequate safety procedures for wet areas',
      immediateActions: ['First aid provided', 'Worker taken to medical facility'],
      correctiveActions: ['Clean up wet areas immediately', 'Install warning signs'],
      preventiveActions: ['Implement wet floor procedures', 'Regular safety training']
    });
    await incident1.save();

    const incident2 = new Incident({
      incidentNumber: 'INC-2024-002',
      incidentDate: new Date('2024-01-20'),
      location: {
        site: 'Construction Site B',
        department: 'Construction',
        specificLocation: 'Equipment Storage Area'
      },
      incidentType: 'overexertion',
      severity: 'medical_treatment',
      description: 'Worker strained shoulder while lifting heavy equipment',
      worker: workers[1] ? workers[1]._id : workers[0]._id,
      reportedBy: siteSupervisor._id,
      employer: employer._id,
      status: 'reported',
      immediateCause: 'Lifting equipment beyond safe capacity',
      rootCause: 'Inadequate lifting equipment and training',
      immediateActions: ['First aid provided', 'Worker assessed by medical team'],
      correctiveActions: ['Provide proper lifting equipment', 'Implement lifting protocols'],
      preventiveActions: ['Lifting technique training', 'Regular equipment maintenance']
    });
    await incident2.save();

    console.log('Created sample incidents');
    console.log('\n=== INCIDENTS SEEDED SUCCESSFULLY ===');
    console.log('Created 2 sample incidents:');
    console.log('- INC-2024-001: Slip and fall incident');
    console.log('- INC-2024-002: Overexertion incident');
    console.log('\nYou can now create cases from these incidents in the Case Manager Dashboard.');

  } catch (error) {
    console.error('Error seeding incidents:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed function
seedIncidents();
