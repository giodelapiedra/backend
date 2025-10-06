// Skip MongoDB models in production
if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
  console.log('Skipping CheckIn model - using Supabase only');
  module.exports = {};
  return;
}

const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkInDate: {
    type: Date,
    default: Date.now
  },
  painLevel: {
    current: {
      type: Number,
      min: 0,
      max: 10,
      required: true
    },
    worst: {
      type: Number,
      min: 0,
      max: 10
    },
    average: {
      type: Number,
      min: 0,
      max: 10
    }
  },
  painLocation: [String],
  painQuality: String,
  painTriggers: [String],
  functionalStatus: {
    sleep: {
      type: Number,
      min: 0,
      max: 10
    },
    mood: {
      type: Number,
      min: 0,
      max: 10
    },
    energy: {
      type: Number,
      min: 0,
      max: 10
    },
    mobility: {
      type: Number,
      min: 0,
      max: 10
    },
    dailyActivities: {
      type: Number,
      min: 0,
      max: 10
    }
  },
  medicationCompliance: {
    taken: Boolean,
    sideEffects: [String],
    effectiveness: {
      type: Number,
      min: 0,
      max: 10
    }
  },
  exerciseCompliance: {
    completed: Boolean,
    exercises: [{
      name: String,
      completed: Boolean,
      difficulty: {
        type: Number,
        min: 1,
        max: 5
      },
      notes: String
    }],
    barriers: [String],
    modifications: String
  },
  workStatus: {
    workedToday: Boolean,
    hoursWorked: Number,
    tasksPerformed: [String],
    difficulties: [String],
    accommodations: [String],
    painAtWork: {
      type: Number,
      min: 0,
      max: 10
    }
  },
  symptoms: {
    swelling: Boolean,
    stiffness: Boolean,
    weakness: Boolean,
    numbness: Boolean,
    tingling: Boolean,
    other: String
  },
  activities: {
    household: String,
    social: String,
    recreational: String,
    other: String
  },
  concerns: String,
  questions: String,
  goals: String,
  notes: String,
  nextCheckIn: Date,
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String,
  reviewDate: Date
}, {
  timestamps: true
});

// Index for efficient querying
checkInSchema.index({ case: 1, checkInDate: -1 });
checkInSchema.index({ worker: 1, checkInDate: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
