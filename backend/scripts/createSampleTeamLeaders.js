const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function createSampleTeamLeaders() {
  try {
    console.log('Creating sample team leaders and teams...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Sample team leaders data
    const teamLeadersData = [
      {
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria.santos@example.com',
        password: 'Password123',
        role: 'team_leader',
        phone: '+1-555-0101',
        team: 'TEAM ALPHA',
        defaultTeam: 'TEAM ALPHA',
        managedTeams: ['TEAM ALPHA'],
        package: 'package2',
        isActive: true
      },
      {
        firstName: 'John',
        lastName: 'Rodriguez',
        email: 'john.rodriguez@example.com',
        password: 'Password123',
        role: 'team_leader',
        phone: '+1-555-0102',
        team: 'TEAM BETA',
        defaultTeam: 'TEAM BETA',
        managedTeams: ['TEAM BETA'],
        package: 'package2',
        isActive: true
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        password: 'Password123',
        role: 'team_leader',
        phone: '+1-555-0103',
        team: 'TEAM GAMMA',
        defaultTeam: 'TEAM GAMMA',
        managedTeams: ['TEAM GAMMA'],
        package: 'package2',
        isActive: true
      },
      {
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.chen@example.com',
        password: 'Password123',
        role: 'team_leader',
        phone: '+1-555-0104',
        team: 'TEAM DELTA',
        defaultTeam: 'TEAM DELTA',
        managedTeams: ['TEAM DELTA'],
        package: 'package2',
        isActive: true
      }
    ];

    // Sample workers data for each team
    const workersData = {
      'TEAM ALPHA': [
        { firstName: 'Carlos', lastName: 'Mendez', email: 'carlos.mendez@example.com', phone: '+1-555-0201' },
        { firstName: 'Ana', lastName: 'Garcia', email: 'ana.garcia@example.com', phone: '+1-555-0202' },
        { firstName: 'Luis', lastName: 'Fernandez', email: 'luis.fernandez@example.com', phone: '+1-555-0203' },
        { firstName: 'Elena', lastName: 'Vargas', email: 'elena.vargas@example.com', phone: '+1-555-0204' },
        { firstName: 'Roberto', lastName: 'Silva', email: 'roberto.silva@example.com', phone: '+1-555-0205' }
      ],
      'TEAM BETA': [
        { firstName: 'David', lastName: 'Wilson', email: 'david.wilson@example.com', phone: '+1-555-0301' },
        { firstName: 'Lisa', lastName: 'Brown', email: 'lisa.brown@example.com', phone: '+1-555-0302' },
        { firstName: 'James', lastName: 'Taylor', email: 'james.taylor@example.com', phone: '+1-555-0303' },
        { firstName: 'Jennifer', lastName: 'Davis', email: 'jennifer.davis@example.com', phone: '+1-555-0304' },
        { firstName: 'Robert', lastName: 'Miller', email: 'robert.miller@example.com', phone: '+1-555-0305' }
      ],
      'TEAM GAMMA': [
        { firstName: 'Amanda', lastName: 'White', email: 'amanda.white@example.com', phone: '+1-555-0401' },
        { firstName: 'Christopher', lastName: 'Harris', email: 'christopher.harris@example.com', phone: '+1-555-0402' },
        { firstName: 'Michelle', lastName: 'Martin', email: 'michelle.martin@example.com', phone: '+1-555-0403' },
        { firstName: 'Daniel', lastName: 'Thompson', email: 'daniel.thompson@example.com', phone: '+1-555-0404' },
        { firstName: 'Ashley', lastName: 'Garcia', email: 'ashley.garcia@example.com', phone: '+1-555-0405' }
      ],
      'TEAM DELTA': [
        { firstName: 'Kevin', lastName: 'Martinez', email: 'kevin.martinez@example.com', phone: '+1-555-0501' },
        { firstName: 'Nicole', lastName: 'Anderson', email: 'nicole.anderson@example.com', phone: '+1-555-0502' },
        { firstName: 'Brandon', lastName: 'Jackson', email: 'brandon.jackson@example.com', phone: '+1-555-0503' },
        { firstName: 'Stephanie', lastName: 'Lee', email: 'stephanie.lee@example.com', phone: '+1-555-0504' },
        { firstName: 'Ryan', lastName: 'Perez', email: 'ryan.perez@example.com', phone: '+1-555-0505' }
      ]
    };

    // Create team leaders
    const createdTeamLeaders = [];
    for (const leaderData of teamLeadersData) {
      // Check if team leader already exists
      const existingLeader = await User.findOne({ email: leaderData.email });
      if (existingLeader) {
        console.log(`✅ Team leader already exists: ${leaderData.firstName} ${leaderData.lastName}`);
        createdTeamLeaders.push(existingLeader);
        continue;
      }

      const teamLeader = new User(leaderData);
      await teamLeader.save();
      createdTeamLeaders.push(teamLeader);
      console.log(`✅ Created team leader: ${leaderData.firstName} ${leaderData.lastName} (${leaderData.team})`);
    }

    // Create workers for each team
    for (const teamLeader of createdTeamLeaders) {
      const teamName = teamLeader.team;
      const workers = workersData[teamName] || [];
      
      console.log(`\n📋 Creating workers for ${teamName}...`);
      
      for (const workerData of workers) {
        // Check if worker already exists
        const existingWorker = await User.findOne({ email: workerData.email });
        if (existingWorker) {
          console.log(`  ✅ Worker already exists: ${workerData.firstName} ${workerData.lastName}`);
          continue;
        }

        const worker = new User({
          firstName: workerData.firstName,
          lastName: workerData.lastName,
          email: workerData.email,
          password: 'Password123',
          role: 'worker',
          phone: workerData.phone,
          team: teamName,
          teamLeader: teamLeader._id,
          package: 'package1',
          isActive: true
        });

        await worker.save();
        console.log(`  ✅ Created worker: ${workerData.firstName} ${workerData.lastName}`);
      }
    }

    // Set some random login times to make it more realistic
    console.log('\n🕐 Setting random login times...');
    const allUsers = await User.find({ 
      role: { $in: ['team_leader', 'worker'] },
      email: { $regex: /@example\.com$/ }
    });

    for (const user of allUsers) {
      // Random login time within the last 7 days
      const randomDaysAgo = Math.floor(Math.random() * 7);
      const randomHoursAgo = Math.floor(Math.random() * 24);
      const randomMinutesAgo = Math.floor(Math.random() * 60);
      
      const lastLogin = new Date();
      lastLogin.setDate(lastLogin.getDate() - randomDaysAgo);
      lastLogin.setHours(lastLogin.getHours() - randomHoursAgo);
      lastLogin.setMinutes(lastLogin.getMinutes() - randomMinutesAgo);
      
      user.lastLogin = lastLogin;
      await user.save();
    }

    console.log('\n🎉 Sample team leaders and workers created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${createdTeamLeaders.length} Team Leaders created`);
    
    for (const leader of createdTeamLeaders) {
      const workerCount = await User.countDocuments({ 
        teamLeader: leader._id, 
        role: 'worker' 
      });
      console.log(`  - ${leader.firstName} ${leader.lastName} (${leader.team}): ${workerCount} workers`);
    }

    console.log('\n🔑 Login credentials for team leaders:');
    for (const leader of createdTeamLeaders) {
      console.log(`  - ${leader.email} / Password123`);
    }

  } catch (error) {
    console.error('❌ Error creating sample team leaders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createSampleTeamLeaders();
