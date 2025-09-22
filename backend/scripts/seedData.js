const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Case = require('../models/Case');
const Incident = require('../models/Incident');
const RehabilitationPlan = require('../models/RehabilitationPlan');
const CheckIn = require('../models/CheckIn');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5');
    console.log('Connected to MongoDB database: data5');

    // Clear existing data
    await User.deleteMany({});
    await Case.deleteMany({});
    await Incident.deleteMany({});
    await RehabilitationPlan.deleteMany({});
    await CheckIn.deleteMany({});
    console.log('Cleared existing data');

    // Create sample users
    const plainPassword = 'Password123!';

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

    console.log('Created sample users');

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
      worker: worker1._id,
      reportedBy: siteSupervisor._id,
      employer: employer._id,
      status: 'investigated',
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
      worker: worker2._id,
      reportedBy: siteSupervisor._id,
      employer: employer._id,
      status: 'investigated',
      immediateCause: 'Lifting equipment beyond safe capacity',
      rootCause: 'Inadequate lifting equipment and training',
      immediateActions: ['First aid provided', 'Worker assessed by medical team'],
      correctiveActions: ['Provide proper lifting equipment', 'Implement lifting protocols'],
      preventiveActions: ['Lifting technique training', 'Regular equipment maintenance']
    });
    await incident2.save();

    console.log('Created sample incidents');

    // Create sample cases
    const case1 = new Case({
      caseNumber: 'CASE-2024-001',
      worker: worker1._id,
      employer: employer._id,
      caseManager: caseManager._id,
      clinician: clinician._id,
      incident: incident1._id,
      status: 'in_rehab',
      priority: 'high',
      injuryDetails: {
        bodyPart: 'Lower Back',
        injuryType: 'Strain',
        severity: 'moderate',
        description: 'Lower back strain from slip and fall incident',
        dateOfInjury: new Date('2024-01-15'),
        mechanismOfInjury: 'Slip and fall on wet surface'
      },
      workRestrictions: {
        lifting: {
          maxWeight: 10,
          frequency: 'Occasionally',
          duration: '2 hours max'
        },
        standing: {
          maxDuration: 30,
          breaks: 2
        },
        sitting: {
          maxDuration: 60,
          breaks: 1
        },
        bending: false,
        twisting: false,
        climbing: false,
        driving: true,
        other: 'No heavy lifting, frequent breaks required'
      },
      expectedReturnDate: new Date('2024-03-15')
    });
    await case1.save();

    const case2 = new Case({
      caseNumber: 'CASE-2024-002',
      worker: worker2._id,
      employer: employer._id,
      caseManager: caseManager._id,
      clinician: clinician._id,
      incident: incident2._id,
      status: 'assessed',
      priority: 'medium',
      injuryDetails: {
        bodyPart: 'Right Shoulder',
        injuryType: 'Strain',
        severity: 'minor',
        description: 'Right shoulder strain from lifting heavy equipment',
        dateOfInjury: new Date('2024-01-20'),
        mechanismOfInjury: 'Overexertion while lifting'
      },
      workRestrictions: {
        lifting: {
          maxWeight: 20,
          frequency: 'Limited',
          duration: '4 hours max'
        },
        standing: {
          maxDuration: 60,
          breaks: 1
        },
        sitting: {
          maxDuration: 120,
          breaks: 1
        },
        bending: true,
        twisting: false,
        climbing: true,
        driving: true,
        other: 'Avoid overhead activities'
      },
      expectedReturnDate: new Date('2024-02-20')
    });
    await case2.save();

    console.log('Created sample cases');

    // Create sample rehabilitation plans
    const rehabPlan1 = new RehabilitationPlan({
      case: case1._id,
      clinician: clinician._id,
      planName: 'Lower Back Recovery Plan',
      status: 'active',
      startDate: new Date('2024-01-20'),
      endDate: new Date('2024-03-15'),
      goals: [
        {
          description: 'Reduce pain level to 3/10',
          targetDate: new Date('2024-02-15'),
          progress: 60,
          status: 'in_progress'
        },
        {
          description: 'Improve flexibility and range of motion',
          targetDate: new Date('2024-02-28'),
          progress: 40,
          status: 'in_progress'
        },
        {
          description: 'Return to full work capacity',
          targetDate: new Date('2024-03-15'),
          progress: 20,
          status: 'not_started'
        }
      ],
      exercises: [
        {
          name: 'Back stretches',
          description: 'Gentle back stretching exercises',
          frequency: 'Daily',
          duration: 15,
          instructions: 'Perform gentle back stretches in the morning',
          difficulty: 'beginner',
          status: 'in_progress'
        },
        {
          name: 'Core strengthening',
          description: 'Core muscle strengthening exercises',
          frequency: '3x per week',
          duration: 20,
          instructions: 'Focus on core stability exercises',
          difficulty: 'intermediate',
          status: 'in_progress'
        }
      ],
      notes: 'Focus on gradual recovery with proper form'
    });
    await rehabPlan1.save();

    const rehabPlan2 = new RehabilitationPlan({
      case: case2._id,
      clinician: clinician._id,
      planName: 'Shoulder Rehabilitation Plan',
      status: 'active',
      startDate: new Date('2024-01-25'),
      endDate: new Date('2024-02-20'),
      goals: [
        {
          description: 'Reduce shoulder pain to 2/10',
          targetDate: new Date('2024-02-10'),
          progress: 70,
          status: 'in_progress'
        },
        {
          description: 'Restore full shoulder range of motion',
          targetDate: new Date('2024-02-15'),
          progress: 50,
          status: 'in_progress'
        },
        {
          description: 'Return to normal work duties',
          targetDate: new Date('2024-02-20'),
          progress: 30,
          status: 'not_started'
        }
      ],
      exercises: [
        {
          name: 'Shoulder pendulum exercises',
          description: 'Gentle shoulder pendulum movements',
          frequency: 'Daily',
          duration: 10,
          instructions: 'Perform gentle pendulum exercises',
          difficulty: 'beginner',
          status: 'in_progress'
        },
        {
          name: 'Shoulder strengthening',
          description: 'Progressive shoulder strengthening',
          frequency: '3x per week',
          duration: 25,
          instructions: 'Use resistance bands for strengthening',
          difficulty: 'intermediate',
          status: 'in_progress'
        }
      ],
      notes: 'Focus on gradual shoulder recovery and strengthening'
    });
    await rehabPlan2.save();

    console.log('Created sample rehabilitation plans');

    // Create sample check-ins
    const checkIn1 = new CheckIn({
      worker: worker1._id,
      case: case1._id,
      date: new Date(),
      painLevel: {
        current: 4,
        worst: 6,
        average: 5
      },
      functionalStatus: {
        mobility: 6,
        strength: 5,
        endurance: 4,
        flexibility: 5,
        balance: 7,
        coordination: 6
      },
      exerciseCompliance: 85,
      notes: 'Feeling better today, exercises are helping',
      mood: 'good',
      sleepQuality: 'fair',
      medicationTaken: true,
      sideEffects: 'None'
    });
    await checkIn1.save();

    const checkIn2 = new CheckIn({
      worker: worker2._id,
      case: case2._id,
      date: new Date(),
      painLevel: {
        current: 3,
        worst: 5,
        average: 4
      },
      functionalStatus: {
        mobility: 7,
        strength: 6,
        endurance: 6,
        flexibility: 6,
        balance: 8,
        coordination: 7
      },
      exerciseCompliance: 90,
      notes: 'Shoulder feels much better, range of motion improving',
      mood: 'excellent',
      sleepQuality: 'good',
      medicationTaken: true,
      sideEffects: 'None'
    });
    await checkIn2.save();

    console.log('Created sample check-ins');

    console.log('\n=== SEED DATA COMPLETED ===');
    console.log('Sample users created:');
    console.log('- Admin: admin@example.com');
    console.log('- Case Manager: casemanager@example.com');
    console.log('- Clinician: clinician@example.com');
    console.log('- Employer: employer@example.com');
    console.log('- Worker 1: worker@example.com');
    console.log('- Worker 2: worker2@example.com');
    console.log('- Site Supervisor: supervisor@example.com');
    console.log('\nPassword for all users: password123');
    console.log('\nSample cases and rehabilitation plans created for testing.');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed function
seedData();
