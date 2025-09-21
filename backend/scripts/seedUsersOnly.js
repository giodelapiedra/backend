const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Case = require('../models/Case');
const Incident = require('../models/Incident');
const RehabPlan = require('../models/RehabPlan');
const CheckIn = require('../models/CheckIn');

const seedUsersOnly = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Case.deleteMany({});
    await Incident.deleteMany({});
    await RehabPlan.deleteMany({});
    await CheckIn.deleteMany({});
    console.log('Cleared existing sample data');

    // Check if users already exist
    const existingUsers = await User.countDocuments();
    
    if (existingUsers > 0) {
      console.log(`Found ${existingUsers} existing users. Keeping user accounts.`);
    } else {
      console.log('No existing users found. Creating sample user accounts...');
      
      // Create sample users
      const plainPassword = 'password123';

      // Create Admin
      const admin = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: plainPassword,
        role: 'admin',
        phone: '555-0001',
        address: '123 Admin St',
        isActive: true
      });
      await admin.save();

      // Create Case Manager
      const caseManager = new User({
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'casemanager@example.com',
        password: plainPassword,
        role: 'case_manager',
        phone: '555-0002',
        address: '456 Case Manager Ave',
        isActive: true
      });
      await caseManager.save();

      // Create Clinician
      const clinician = new User({
        firstName: 'Dr. Michael',
        lastName: 'Smith',
        email: 'clinician@example.com',
        password: plainPassword,
        role: 'clinician',
        phone: '555-0003',
        address: '789 Clinician Blvd',
        specialty: 'Physical Therapy',
        licenseNumber: 'PT-12345',
        isActive: true
      });
      await clinician.save();

      // Create Employer
      const employer = new User({
        firstName: 'ABC',
        lastName: 'Construction',
        email: 'employer@example.com',
        password: plainPassword,
        role: 'employer',
        phone: '555-0004',
        address: '321 Employer Rd',
        isActive: true
      });
      await employer.save();

      // Create Workers
      const worker1 = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'worker@example.com',
        password: plainPassword,
        role: 'worker',
        phone: '555-0005',
        address: '654 Worker St',
        employer: employer._id,
        isActive: true
      });
      await worker1.save();

      const worker2 = new User({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'worker2@example.com',
        password: plainPassword,
        role: 'worker',
        phone: '555-0006',
        address: '987 Worker Ave',
        employer: employer._id,
        isActive: true
      });
      await worker2.save();

      // Create Site Supervisor
      const siteSupervisor = new User({
        firstName: 'Robert',
        lastName: 'Wilson',
        email: 'supervisor@example.com',
        password: plainPassword,
        role: 'site_supervisor',
        phone: '555-0007',
        address: '147 Supervisor Ln',
        employer: employer._id,
        isActive: true
      });
      await siteSupervisor.save();

      console.log('Created sample user accounts');
    }

    console.log('\n=== DATABASE RESET COMPLETED ===');
    console.log('All sample data has been removed.');
    console.log('User accounts have been preserved or created.');
    console.log('\nSample user accounts:');
    console.log('- Admin: admin@example.com');
    console.log('- Case Manager: casemanager@example.com');
    console.log('- Clinician: clinician@example.com');
    console.log('- Employer: employer@example.com');
    console.log('- Worker 1: worker@example.com');
    console.log('- Worker 2: worker2@example.com');
    console.log('- Site Supervisor: supervisor@example.com');
    console.log('\nPassword for all users: password123');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed function
seedUsersOnly();
