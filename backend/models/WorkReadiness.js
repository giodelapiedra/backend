// Skip MongoDB models in production or if mongoose is not available
try {
  if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
    console.log('Skipping WorkReadiness model - using Supabase only');
    module.exports = {};
    return;
  }
} catch (error) {
  console.log('Skipping WorkReadiness model - mongoose not available');
  module.exports = {};
  return;
}

let mongoose;
try {
  mongoose = require('mongoose');
} catch (error) {
  console.log('Mongoose not available - using Supabase only');
  module.exports = {};
  return;
}

const workReadinessSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Worker is required']
  },
  teamLeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Team Leader is required']
  },
  team: {
    type: String,
    required: [true, 'Team is required']
  },
  fatigueLevel: {
    type: Number,
    required: [true, 'Fatigue level is required'],
    min: [1, 'Fatigue level must be at least 1'],
    max: [5, 'Fatigue level must be at most 5']
  },
  painDiscomfort: {
    type: String,
    required: [true, 'Pain/discomfort status is required'],
    enum: ['yes', 'no']
  },
  painAreas: [{
    type: String,
    enum: ['Head', 'Neck', 'Shoulders', 'Arms', 'Back', 'Chest', 'Abdomen', 'Hips', 'Legs', 'Feet']
  }],
  readinessLevel: {
    type: String,
    required: [true, 'Readiness level is required'],
    enum: ['fit', 'minor', 'not_fit']
  },
  mood: {
    type: String,
    required: [true, 'Mood is required'],
    enum: ['excellent', 'good', 'okay', 'poor', 'terrible']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'followed_up'],
    default: 'submitted'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  followUpReason: {
    type: String
  },
  followUpNotes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
workReadinessSchema.index({ worker: 1, submittedAt: -1 });
workReadinessSchema.index({ teamLeader: 1, submittedAt: -1 });
workReadinessSchema.index({ team: 1, submittedAt: -1 });
workReadinessSchema.index({ submittedAt: -1 });

// Virtual for formatted submission date
workReadinessSchema.virtual('formattedSubmittedAt').get(function() {
  return this.submittedAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for readiness level display
workReadinessSchema.virtual('readinessLevelDisplay').get(function() {
  const levels = {
    'fit': 'Fit for Work',
    'minor': 'Minor Concerns',
    'not_fit': 'Not Fit for Work'
  };
  return levels[this.readinessLevel] || this.readinessLevel;
});

// Virtual for mood display
workReadinessSchema.virtual('moodDisplay').get(function() {
  const moods = {
    'excellent': '😊 Excellent',
    'good': '😌 Good',
    'okay': '😐 Okay',
    'poor': '😔 Poor',
    'terrible': '😢 Terrible'
  };
  return moods[this.mood] || this.mood;
});

// Ensure virtual fields are serialized
workReadinessSchema.set('toJSON', { virtuals: true });
workReadinessSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('WorkReadiness', workReadinessSchema);
