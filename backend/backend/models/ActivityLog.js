const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  // Worker who performed the activity
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Case this activity is related to
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  
  // Clinician assigned to this case
  clinician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Rehabilitation plan this activity is related to
  rehabilitationPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RehabilitationPlan',
    required: false // Made optional since not all activities require a rehabilitation plan
  },
  
  // Type of activity
  activityType: {
    type: String,
    enum: [
      'exercise_completed',
      'exercise_skipped', 
      'daily_check_in',
      'pain_level_update',
      'work_status_update',
      'goal_achieved',
      'milestone_reached',
      'plan_review',
      'appointment_attended',
      'incident_reported'
    ],
    required: true
  },
  
  // Title of the activity
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  // Description of what happened
  description: {
    type: String,
    required: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Additional details specific to the activity type
  details: {
    // For exercise activities
    exercise: {
      name: String,
      duration: Number,
      difficulty: String,
      category: String
    },
    
    // For check-in activities
    checkIn: {
      painLevel: Number,
      sleepQuality: String,
      mood: String,
      energy: String,
      mobility: String,
      dailyActivities: String,
      workedToday: Boolean,
      hoursWorked: Number,
      difficulties: [String],
      painAtWork: Boolean,
      symptoms: {
        swelling: Boolean,
        stiffness: Boolean,
        weakness: Boolean,
        numbness: Boolean,
        tingling: Boolean,
        other: String
      }
    },
    
    // For work status updates
    workStatus: {
      status: String,
      hoursWorked: Number,
      restrictions: [String],
      difficulties: [String]
    },
    
    // For goal achievements
    goal: {
      description: String,
      targetDate: Date,
      achievedDate: Date,
      progress: Number
    },
    
    // For milestones
    milestone: {
      type: String,
      description: String,
      achievedDate: Date
    },
    
    // For appointments
    appointment: {
      type: String,
      scheduledDate: Date,
      duration: Number,
      location: String,
      purpose: String
    },
    
    // For incidents
    incident: {
      type: String,
      severity: String,
      description: String,
      location: String,
      witnesses: [String]
    }
  },
  
  // Priority level for clinician attention
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Status of the activity
  status: {
    type: String,
    enum: ['completed', 'in_progress', 'pending', 'cancelled'],
    default: 'completed'
  },
  
  // Whether the clinician has reviewed this activity
  isReviewed: {
    type: Boolean,
    default: false
  },
  
  // When the clinician reviewed this activity
  reviewedAt: Date,
  
  // Clinician's notes about this activity
  clinicianNotes: String,
  
  // Tags for categorization
  tags: [String],
  
  // Metadata for additional information
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
activityLogSchema.index({ worker: 1, createdAt: -1 });
activityLogSchema.index({ clinician: 1, isReviewed: 1, createdAt: -1 });
activityLogSchema.index({ case: 1, createdAt: -1 });
activityLogSchema.index({ rehabilitationPlan: 1, createdAt: -1 });
activityLogSchema.index({ activityType: 1, createdAt: -1 });
activityLogSchema.index({ priority: 1, createdAt: -1 });

// Virtual for formatted date
activityLogSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Method to mark as reviewed
activityLogSchema.methods.markAsReviewed = function(notes) {
  this.isReviewed = true;
  this.reviewedAt = new Date();
  if (notes) {
    this.clinicianNotes = notes;
  }
  return this.save();
};

// Static method to get logs for a clinician
activityLogSchema.statics.getClinicianLogs = function(clinicianId, options = {}) {
  const query = { clinician: clinicianId };
  
  if (options.caseId) {
    query.case = options.caseId;
  }
  
  if (options.workerId) {
    query.worker = options.workerId;
  }
  
  if (options.activityType) {
    query.activityType = options.activityType;
  }
  
  if (options.isReviewed !== undefined) {
    query.isReviewed = options.isReviewed;
  }
  
  if (options.priority) {
    query.priority = options.priority;
  }
  
  if (options.startDate && options.endDate) {
    query.createdAt = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  return this.find(query)
    .populate('worker', 'firstName lastName email')
    .populate('case', 'caseNumber status')
    .populate('rehabilitationPlan', 'planName status')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to get logs for a worker
activityLogSchema.statics.getWorkerLogs = function(workerId, options = {}) {
  const query = { worker: workerId };
  
  if (options.caseId) {
    query.case = options.caseId;
  }
  
  if (options.activityType) {
    query.activityType = options.activityType;
  }
  
  if (options.startDate && options.endDate) {
    query.createdAt = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }
  
  return this.find(query)
    .populate('case', 'caseNumber status')
    .populate('rehabilitationPlan', 'planName status')
    .populate('clinician', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);

