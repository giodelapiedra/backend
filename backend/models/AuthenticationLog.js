const mongoose = require('mongoose');

const authenticationLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'password_reset', 'account_locked', 'account_unlocked']
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  success: {
    type: Boolean,
    required: true,
    default: true
  },
  failureReason: {
    type: String,
    enum: ['invalid_credentials', 'account_deactivated', 'account_locked', 'invalid_token', 'session_expired']
  },
  sessionId: {
    type: String
  },
  deviceInfo: {
    deviceType: String, // mobile, desktop, tablet
    browser: String,
    os: String
  },
  additionalData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for better performance
authenticationLogSchema.index({ userId: 1, createdAt: -1 });
authenticationLogSchema.index({ action: 1, createdAt: -1 });
authenticationLogSchema.index({ userRole: 1, createdAt: -1 });
authenticationLogSchema.index({ success: 1, createdAt: -1 });
authenticationLogSchema.index({ ipAddress: 1, createdAt: -1 });
authenticationLogSchema.index({ createdAt: -1 });

// Virtual for formatted timestamp
authenticationLogSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
});

// Static method to get recent login attempts
authenticationLogSchema.statics.getRecentLogins = function(limit = 50) {
  return this.find({ action: 'login' })
    .populate('userId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get failed login attempts (deprecated - no longer logging failed attempts)
authenticationLogSchema.statics.getFailedLogins = function(limit = 50) {
  return this.find({ success: false })
    .populate('userId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get user activity summary
authenticationLogSchema.statics.getUserActivitySummary = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$createdAt' }
      }
    },
    { $sort: { lastOccurrence: -1 } }
  ]);
};

module.exports = mongoose.model('AuthenticationLog', authenticationLogSchema);
