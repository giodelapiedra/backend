const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    });
    console.log(`MongoDB connected: ${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [12, 'Password must be at least 12 characters']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['admin', 'worker', 'employer', 'site_supervisor', 'clinician', 'case_manager', 'gp_insurer', 'team_leader'],
    default: 'worker'
  },
  phone: {
    type: String,
    trim: true
  },
  team: {
    type: String,
    required: function() { return this.role === 'team_leader' || this.role === 'worker'; }
  },
  teamLeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.role === 'worker'; }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

// Create Team Leader Account
const createTeamLeaderAccount = async () => {
  try {
    await connectDB();

    // Check if team leader already exists
    const existingTeamLeader = await User.findOne({ email: 'teamleader@example.com' });
    if (existingTeamLeader) {
      console.log('Team Leader account already exists!');
      console.log('Email: teamleader@example.com');
      console.log('Password: TestPassword123!');
      console.log('Role: team_leader');
      console.log('Team: Safety Team A');
      return;
    }

    // Create team leader account
    const teamLeader = new User({
      firstName: 'John',
      lastName: 'TeamLeader',
      email: 'teamleader@example.com',
      password: 'TestPassword123!',
      role: 'team_leader',
      team: 'Safety Team A',
      defaultTeam: 'Safety Team A',
      managedTeams: ['Safety Team A'],
      phone: '+63 912 345 6789',
      isActive: true
    });

    await teamLeader.save();

    console.log('✅ Team Leader account created successfully!');
    console.log('📧 Email: teamleader@example.com');
    console.log('🔑 Password: TestPassword123!');
    console.log('👤 Role: team_leader');
    console.log('🏢 Team: Safety Team A');
    console.log('📱 Phone: +63 912 345 6789');
    console.log('');
    console.log('🚀 You can now login with these credentials!');

    // Create some sample workers for the team leader
    const sampleWorkers = [
      {
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria.santos@example.com',
        password: 'TestPassword123!',
        role: 'worker',
        team: 'Safety Team A',
        teamLeader: teamLeader._id,
        phone: '+63 912 345 6790'
      },
      {
        firstName: 'Juan',
        lastName: 'Cruz',
        email: 'juan.cruz@example.com',
        password: 'TestPassword123!',
        role: 'worker',
        team: 'Safety Team A',
        teamLeader: teamLeader._id,
        phone: '+63 912 345 6791'
      },
      {
        firstName: 'Ana',
        lastName: 'Reyes',
        email: 'ana.reyes@example.com',
        password: 'TestPassword123!',
        role: 'site_supervisor',
        team: 'Safety Team A',
        teamLeader: teamLeader._id,
        phone: '+63 912 345 6792'
      }
    ];

    console.log('👥 Creating sample team members...');
    
    for (const workerData of sampleWorkers) {
      const existingWorker = await User.findOne({ email: workerData.email });
      if (!existingWorker) {
        const worker = new User(workerData);
        await worker.save();
        console.log(`✅ Created ${workerData.role}: ${workerData.firstName} ${workerData.lastName}`);
      } else {
        console.log(`⚠️  ${workerData.role} ${workerData.firstName} ${workerData.lastName} already exists`);
      }
    }

    console.log('');
    console.log('🎉 Setup complete! You now have:');
    console.log('• 1 Team Leader account');
    console.log('• 2 Worker accounts');
    console.log('• 1 Site Supervisor account');
    console.log('');
    console.log('All accounts use password: TestPassword123!');

  } catch (error) {
    console.error('❌ Error creating team leader account:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script
createTeamLeaderAccount();
