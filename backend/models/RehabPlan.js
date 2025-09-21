const mongoose = require('mongoose');

const rehabPlanSchema = new mongoose.Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  clinician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'cancelled'],
    default: 'active'
  },
  goals: [{
    description: String,
    targetDate: Date,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'cancelled'],
      default: 'not_started'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    notes: String
  }],
  exercises: [{
    name: String,
    description: String,
    instructions: String,
    sets: Number,
    repetitions: Number,
    duration: Number,
    frequency: String,
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    },
    equipment: [String],
    videoUrl: String,
    imageUrl: String,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started'
    },
    startDate: Date,
    endDate: Date,
    notes: String
  }],
  activities: [{
    name: String,
    description: String,
    type: {
      type: String,
      enum: ['therapeutic', 'functional', 'work_simulation', 'education']
    },
    duration: Number,
    frequency: String,
    instructions: String,
    precautions: [String],
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started'
    },
    startDate: Date,
    endDate: Date,
    notes: String
  }],
  workSimulation: [{
    task: String,
    description: String,
    duration: Number,
    frequency: String,
    difficulty: {
      type: String,
      enum: ['light', 'moderate', 'heavy']
    },
    equipment: [String],
    safetyPrecautions: [String],
    progressNotes: String,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started'
    }
  }],
  education: [{
    topic: String,
    description: String,
    materials: [String],
    completionDate: Date,
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started'
    },
    notes: String
  }],
  progressTracking: {
    painLevel: [{
      date: Date,
      level: Number,
      notes: String
    }],
    functionalImprovement: [{
      date: Date,
      area: String,
      improvement: Number,
      notes: String
    }],
    workReadiness: [{
      date: Date,
      score: Number,
      notes: String
    }]
  },
  modifications: [{
    date: Date,
    type: String,
    description: String,
    reason: String,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  notes: String,
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('RehabPlan', rehabPlanSchema);
