const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    minlength: [12, 'Password must be at least 12 characters'],
    validate: {
      validator: function(v) {
        // Password must contain: uppercase, lowercase, number, special character
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(v);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
    }
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['admin', 'worker', 'employer', 'site_supervisor', 'clinician', 'case_manager', 'gp_insurer'],
    default: 'worker'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  medicalInfo: {
    bloodType: String,
    allergies: [String],
    medications: [String],
    medicalConditions: [String]
  },
  // Clinician-specific fields
  specialty: {
    type: String,
    required: function() { return this.role === 'clinician'; }
  },
  licenseNumber: {
    type: String,
    required: function() { return this.role === 'clinician'; }
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  availabilityReason: {
    type: String
  },
  lastAvailabilityUpdate: {
    type: Date
  },
  // Security fields
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  emailVerificationToken: {
    type: String
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
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

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Account lockout methods
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incLoginAttempts = function() {
  // DISABLED: Account lockout feature removed
  // Just increment login attempts for logging purposes only
  return this.updateOne({
    $inc: { loginAttempts: 1 }
  });
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Database indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ employer: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, isActive: 1 }); // Compound index for role-based queries

module.exports = mongoose.model('User', userSchema);
