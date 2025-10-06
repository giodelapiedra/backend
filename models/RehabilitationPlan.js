// Skip MongoDB models in production or if mongoose is not available
try {
  if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
    console.log('Skipping RehabilitationPlan model - using Supabase only');
    module.exports = {};
    return;
  }
} catch (error) {
  console.log('Skipping RehabilitationPlan model - mongoose not available');
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

const rehabilitationPlanSchema = new mongoose.Schema({
  // Case reference
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  
  // Worker reference
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Clinician who created the plan
  clinician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Plan details
  planName: {
    type: String,
    required: true,
    default: 'Recovery Plan'
  },
  
  planDescription: {
    type: String,
    default: 'Daily recovery exercises and activities'
  },
  
  // Plan status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Plan duration
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  endDate: {
    type: Date
  },
  
  // Daily exercises/activities
  exercises: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    duration: {
      type: Number, // in minutes
      required: true
    },
    instructions: {
      type: String
    },
    category: {
      type: String,
      enum: ['stretching', 'strengthening', 'cardio', 'flexibility', 'balance', 'other'],
      default: 'other'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy'
    },
    isRequired: {
      type: Boolean,
      default: true
    }
  }],
  
  // Daily completion tracking
  dailyCompletions: [{
    date: {
      type: Date,
      required: true
    },
    exercises: [{
      exerciseId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      status: {
        type: String,
        enum: ['completed', 'skipped', 'not_started'],
        default: 'not_started'
      },
      completedAt: {
        type: Date
      },
      skippedReason: {
        type: String,
        enum: ['pain', 'fatigue', 'time_constraint', 'equipment', 'other'],
        default: null
      },
      skippedNotes: {
        type: String
      },
      duration: {
        type: Number // actual duration completed
      },
      painLevel: {
        type: Number, // 0-10 pain scale
        min: 0,
        max: 10,
        default: null
      },
      painNotes: {
        type: String // Additional notes about pain experienced
      }
    }],
    overallStatus: {
      type: String,
      enum: ['completed', 'partial', 'skipped', 'not_started'],
      default: 'not_started'
    },
    completedAt: {
      type: Date
    },
    notes: {
      type: String
    }
  }],
  
  // Progress tracking
  progressStats: {
    totalDays: {
      type: Number,
      default: 0
    },
    completedDays: {
      type: Number,
      default: 0
    },
    skippedDays: {
      type: Number,
      default: 0
    },
    consecutiveCompletedDays: {
      type: Number,
      default: 0
    },
    consecutiveSkippedDays: {
      type: Number,
      default: 0
    },
    lastCompletedDate: {
      type: Date
    },
    lastSkippedDate: {
      type: Date
    },
    // Pain tracking statistics
    painStats: {
      averagePainLevel: {
        type: Number,
        default: 0
      },
      lastReportedPainLevel: {
        type: Number,
        default: 0
      },
      lastReportedPainDate: {
        type: Date
      },
      painTrend: {
        type: String,
        enum: ['increasing', 'decreasing', 'stable', 'fluctuating', 'unknown'],
        default: 'unknown'
      },
      painHistory: [{
        date: {
          type: Date
        },
        averagePainLevel: {
          type: Number
        },
        exerciseCount: {
          type: Number
        }
      }],
      highPainAlertTriggered: {
        type: Boolean,
        default: false
      },
      increasingPainAlertTriggered: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Notifications and alerts
  alerts: [{
    type: {
      type: String,
      enum: ['skipped_sessions', 'progress_milestone', 'plan_review_needed', 'high_pain_reported', 'increasing_pain_trend'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    triggeredAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  
  // Plan settings
  settings: {
    autoGenerateDaily: {
      type: Boolean,
      default: true
    },
    reminderTime: {
      type: String, // HH:MM format
      default: '09:00'
    },
    allowSkipping: {
      type: Boolean,
      default: true
    },
    maxConsecutiveSkips: {
      type: Number,
      default: 2
    },
    progressMilestoneDays: {
      type: Number,
      default: 5
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
rehabilitationPlanSchema.index({ case: 1, worker: 1 });
rehabilitationPlanSchema.index({ worker: 1, status: 1 });
rehabilitationPlanSchema.index({ 'dailyCompletions.date': 1 });

// Virtual for today's completion status
rehabilitationPlanSchema.virtual('todaysCompletion').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  console.log('Getting today\'s completion for date:', today.toISOString());
  
  const todaysCompletion = this.dailyCompletions.find(completion => {
    const completionDate = new Date(completion.date);
    completionDate.setHours(0, 0, 0, 0);
    console.log('Checking completion date:', completionDate.toISOString(), 'matches:', completionDate.getTime() === today.getTime());
    return completionDate.getTime() === today.getTime();
  });
  
  console.log('Found today\'s completion:', todaysCompletion ? 'Yes' : 'No');
  return todaysCompletion;
});

// Method to get today's exercises
rehabilitationPlanSchema.methods.getTodaysExercises = function() {
  console.log('Getting today\'s exercises, total exercises:', this.exercises.length);
  console.log('Today\'s completion:', this.todaysCompletion);
  
  const exercises = this.exercises.map(exercise => {
    const completion = this.todaysCompletion?.exercises.find(e => 
      e.exerciseId.toString() === exercise._id.toString()
    ) || { status: 'not_started' };
    
    console.log(`Exercise ${exercise.name}: status = ${completion.status}`);
    
    return {
      ...exercise.toObject(),
      completion
    };
  });
  
  console.log('Returning exercises:', exercises.length);
  return exercises;
};

// Method to mark exercise as completed
rehabilitationPlanSchema.methods.markExerciseCompleted = function(exerciseId, duration, painLevel = null, painNotes = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let todaysCompletion = this.dailyCompletions.find(completion => {
    const completionDate = new Date(completion.date);
    completionDate.setHours(0, 0, 0, 0);
    return completionDate.getTime() === today.getTime();
  });
  
  if (!todaysCompletion) {
    todaysCompletion = {
      date: today,
      exercises: [],
      overallStatus: 'not_started'
    };
    this.dailyCompletions.push(todaysCompletion);
  }
  
  const exerciseCompletion = todaysCompletion.exercises.find(e => 
    e.exerciseId.toString() === exerciseId.toString()
  );
  
  if (exerciseCompletion) {
    exerciseCompletion.status = 'completed';
    exerciseCompletion.completedAt = new Date();
    exerciseCompletion.duration = duration;
    
    // Add pain tracking information if provided
    if (painLevel !== null && painLevel >= 0 && painLevel <= 10) {
      exerciseCompletion.painLevel = painLevel;
      if (painNotes) {
        exerciseCompletion.painNotes = painNotes;
      }
    }
  } else {
    const completionData = {
      exerciseId,
      status: 'completed',
      completedAt: new Date(),
      duration: duration
    };
    
    // Add pain tracking information if provided
    if (painLevel !== null && painLevel >= 0 && painLevel <= 10) {
      completionData.painLevel = painLevel;
      if (painNotes) {
        completionData.painNotes = painNotes;
      }
    }
    
    todaysCompletion.exercises.push(completionData);
  }
  
  // Update overall status
  const completedExercises = todaysCompletion.exercises.filter(e => e.status === 'completed').length;
  const totalExercises = this.exercises.length;
  
  console.log(`Exercise completion: ${completedExercises}/${totalExercises} completed`);
  
  if (completedExercises === totalExercises) {
    todaysCompletion.overallStatus = 'completed';
    todaysCompletion.completedAt = new Date();
    console.log('All exercises completed for today!');
  } else if (completedExercises > 0) {
    todaysCompletion.overallStatus = 'partial';
    console.log('Partial completion for today');
  }
  
  console.log('Today\'s overall status:', todaysCompletion.overallStatus);
  
  // Update progress stats and pain trends
  this.updateProgressStats();
  this.updatePainStats();
  
  return this.save();
};

  // Method to mark exercise as skipped
rehabilitationPlanSchema.methods.markExerciseSkipped = function(exerciseId, reason, notes) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let todaysCompletion = this.dailyCompletions.find(completion => {
    const completionDate = new Date(completion.date);
    completionDate.setHours(0, 0, 0, 0);
    return completionDate.getTime() === today.getTime();
  });
  
  if (!todaysCompletion) {
    todaysCompletion = {
      date: today,
      exercises: [],
      overallStatus: 'not_started'
    };
    this.dailyCompletions.push(todaysCompletion);
  }
  
  const exerciseCompletion = todaysCompletion.exercises.find(e => 
    e.exerciseId.toString() === exerciseId.toString()
  );
  
  if (exerciseCompletion) {
    exerciseCompletion.status = 'skipped';
    exerciseCompletion.skippedReason = reason;
    exerciseCompletion.skippedNotes = notes;
    exerciseCompletion.skippedAt = new Date();
  } else {
    todaysCompletion.exercises.push({
      exerciseId,
      status: 'skipped',
      skippedReason: reason,
      skippedNotes: notes,
      skippedAt: new Date()
    });
  }
  
  // Update overall status based on all exercises
  const totalExercises = this.exercises.length;
  const skippedExercises = todaysCompletion.exercises.filter(e => e.status === 'skipped').length;
  const completedExercises = todaysCompletion.exercises.filter(e => e.status === 'completed').length;
  
  console.log('Exercise status counts:', {
    total: totalExercises,
    skipped: skippedExercises,
    completed: completedExercises
  });
  
  // If all exercises are skipped, mark the day as skipped
  if (skippedExercises === totalExercises) {
    todaysCompletion.overallStatus = 'skipped';
    console.log('All exercises skipped - marking day as skipped');
  }
  // If some exercises are completed and some are skipped, mark as partial
  else if ((skippedExercises > 0 || completedExercises > 0) && (skippedExercises + completedExercises === totalExercises)) {
    todaysCompletion.overallStatus = 'partial';
    console.log('Mix of skipped/completed - marking day as partial');
  }
  // If at least one exercise is skipped and not all exercises are accounted for
  else if (skippedExercises > 0) {
    todaysCompletion.overallStatus = 'partial';
    console.log('Some exercises skipped - marking day as partial');
  }
  
  // Update progress stats
  this.updateProgressStats();
  
  return this.save();
};

// Method to update progress statistics
rehabilitationPlanSchema.methods.updateProgressStats = function() {
  const completions = this.dailyCompletions.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  console.log('Updating progress stats...');
  console.log('Total daily completions:', completions.length);
  console.log('Completions:', completions.map(c => ({
    date: c.date,
    overallStatus: c.overallStatus,
    exercises: c.exercises.length
  })));
  
  // Count days with any activity (completed, skipped, or partial)
  this.progressStats.totalDays = completions.filter(c => 
    c.overallStatus === 'completed' || 
    c.overallStatus === 'skipped' || 
    c.overallStatus === 'partial'
  ).length;
  
  // Count fully completed days
  this.progressStats.completedDays = completions.filter(c => 
    c.overallStatus === 'completed'
  ).length;
  
  // Count days where any exercise was skipped
  this.progressStats.skippedDays = completions.filter(c => 
    c.exercises.some(e => e.status === 'skipped')
  ).length;
  
  console.log('Days with skipped exercises:', this.progressStats.skippedDays);
  console.log('Skipped exercise details:', completions
    .filter(c => c.exercises.some(e => e.status === 'skipped'))
    .map(c => ({
      date: c.date,
      skippedExercises: c.exercises.filter(e => e.status === 'skipped').length,
      totalExercises: c.exercises.length
    })));
  
  console.log('Calculated stats:', {
    totalDays: this.progressStats.totalDays,
    completedDays: this.progressStats.completedDays,
    skippedDays: this.progressStats.skippedDays
  });
  
  // Calculate consecutive days - fix the logic
  let consecutiveCompleted = 0;
  let consecutiveSkipped = 0;
  
  // For consecutive completed days, count from the most recent day backwards
  for (let i = completions.length - 1; i >= 0; i--) {
    if (completions[i].overallStatus === 'completed') {
      consecutiveCompleted++;
    } else if (completions[i].overallStatus === 'skipped' || completions[i].overallStatus === 'partial') {
      // Stop counting if we hit a skipped or partial day
      break;
    } else {
      // Stop counting if we hit a not_started day
      break;
    }
  }
  
  // For consecutive skipped days, count from the most recent day backwards
  for (let i = completions.length - 1; i >= 0; i--) {
    if (completions[i].overallStatus === 'skipped') {
      consecutiveSkipped++;
    } else if (completions[i].overallStatus === 'completed' || completions[i].overallStatus === 'partial') {
      // Stop counting if we hit a completed or partial day
      break;
    } else {
      // Stop counting if we hit a not_started day
      break;
    }
  }
  
  this.progressStats.consecutiveCompletedDays = consecutiveCompleted;
  this.progressStats.consecutiveSkippedDays = consecutiveSkipped;
  
  console.log('Consecutive stats:', {
    consecutiveCompletedDays: this.progressStats.consecutiveCompletedDays,
    consecutiveSkippedDays: this.progressStats.consecutiveSkippedDays
  });
  
  // Update last completed/skipped dates
  const lastCompleted = completions.filter(c => c.overallStatus === 'completed').pop();
  const lastSkipped = completions.filter(c => c.overallStatus === 'skipped').pop();
  
  if (lastCompleted) {
    this.progressStats.lastCompletedDate = lastCompleted.date;
  }
  if (lastSkipped) {
    this.progressStats.lastSkippedDate = lastSkipped.date;
  }
  
  console.log('Final progress stats:', this.progressStats);
};

// Method to get current progress stats (with debugging)
rehabilitationPlanSchema.methods.getProgressStats = function() {
  console.log('Getting progress stats...');
  console.log('Current stats:', this.progressStats);
  console.log('Daily completions count:', this.dailyCompletions.length);
  
  return this.progressStats;
};

// Method to ensure progress stats are properly initialized
rehabilitationPlanSchema.methods.ensureProgressStats = function() {
  if (!this.progressStats) {
    this.progressStats = {
      totalDays: 0,
      completedDays: 0,
      skippedDays: 0,
      consecutiveCompletedDays: 0,
      consecutiveSkippedDays: 0
    };
  }
  
  // Initialize pain stats if they don't exist
  if (!this.progressStats.painStats) {
    this.progressStats.painStats = {
      averagePainLevel: 0,
      lastReportedPainLevel: 0,
      painTrend: 'unknown',
      painHistory: [],
      highPainAlertTriggered: false,
      increasingPainAlertTriggered: false
    };
  }
  
  // Always update stats to ensure they're current
  this.updateProgressStats();
  
  return this.progressStats;
};

// Method to check for alerts
rehabilitationPlanSchema.methods.checkForAlerts = async function() {
  const alerts = [];
  
  console.log('Checking for alerts...');
  console.log('Consecutive completed days:', this.progressStats.consecutiveCompletedDays);
  console.log('Consecutive skipped days:', this.progressStats.consecutiveSkippedDays);
  
  // Ensure pain stats are available
  if (!this.progressStats.painStats) {
    this.updatePainStats();
  }
  
  console.log('Pain trend:', this.progressStats.painStats?.painTrend);
  console.log('Last reported pain level:', this.progressStats.painStats?.lastReportedPainLevel);
  
  // Check for consecutive skipped sessions
  if (this.progressStats.consecutiveSkippedDays >= (this.settings?.maxConsecutiveSkips || 3)) {
    alerts.push({
      type: 'skipped_sessions',
      message: `Worker has skipped ${this.progressStats.consecutiveSkippedDays} consecutive sessions. Plan review may be needed.`,
      metadata: {
        consecutiveSkippedDays: this.progressStats.consecutiveSkippedDays,
        workerId: this.worker,
        caseId: this.case
      }
    });
  }
  
  // Check for high pain level reported (pain level 7 or higher)
  if (this.progressStats.painStats && 
      this.progressStats.painStats.lastReportedPainLevel >= 7 && 
      !this.progressStats.painStats.highPainAlertTriggered) {
    
    alerts.push({
      type: 'high_pain_reported',
      message: `Worker has reported a high pain level (${this.progressStats.painStats.lastReportedPainLevel.toFixed(1)}/10). Immediate plan review recommended.`,
      metadata: {
        painLevel: this.progressStats.painStats.lastReportedPainLevel,
        reportedAt: this.progressStats.painStats.lastReportedPainDate,
        workerId: this.worker,
        caseId: this.case
      }
    });
    
    // Set flag to avoid duplicate alerts for the same high pain event
    this.progressStats.painStats.highPainAlertTriggered = true;
  } else if (this.progressStats.painStats && this.progressStats.painStats.lastReportedPainLevel < 7) {
    // Reset the flag if pain level drops below threshold
    this.progressStats.painStats.highPainAlertTriggered = false;
  }
  
  // Check for increasing pain trend
  if (this.progressStats.painStats && 
      this.progressStats.painStats.painTrend === 'increasing' && 
      !this.progressStats.painStats.increasingPainAlertTriggered) {
    
    alerts.push({
      type: 'increasing_pain_trend',
      message: `Worker is showing an increasing pain trend over the last several sessions. Consider reviewing and adjusting the rehabilitation plan.`,
      metadata: {
        painTrend: this.progressStats.painStats.painTrend,
        averagePainLevel: this.progressStats.painStats.averagePainLevel,
        workerId: this.worker,
        caseId: this.case
      }
    });
    
    // Set flag to avoid duplicate alerts for the same trend
    this.progressStats.painStats.increasingPainAlertTriggered = true;
  } else if (this.progressStats.painStats && this.progressStats.painStats.painTrend !== 'increasing') {
    // Reset the flag if trend changes
    this.progressStats.painStats.increasingPainAlertTriggered = false;
  }
  
  // Check for 5-day consecutive completion milestone
  if (this.progressStats.consecutiveCompletedDays === 5) {
    // Check if we already sent a notification for this milestone
    const existingAlert = this.alerts.find(a => 
      a.type === 'five_day_milestone' && 
      a.metadata?.consecutiveCompletedDays === 5
    );
    
    if (!existingAlert) {
      alerts.push({
        type: 'five_day_milestone',
        message: `🎉 Amazing! You've completed all exercises for 5 consecutive days! Your dedication to recovery is inspiring. Keep up the excellent work!`,
        metadata: {
          consecutiveCompletedDays: this.progressStats.consecutiveCompletedDays,
          milestone: 'five_days',
          workerId: this.worker,
          caseId: this.case
        }
      });
    }
  }
  
  // Check for other progress milestones
  if (this.progressStats.consecutiveCompletedDays === 10) {
    const existingAlert = this.alerts.find(a => 
      a.type === 'ten_day_milestone' && 
      a.metadata?.consecutiveCompletedDays === 10
    );
    
    if (!existingAlert) {
      alerts.push({
        type: 'ten_day_milestone',
        message: `🌟 Outstanding! 10 consecutive days of completed exercises! You're building incredible momentum in your recovery journey.`,
        metadata: {
          consecutiveCompletedDays: this.progressStats.consecutiveCompletedDays,
          milestone: 'ten_days',
          workerId: this.worker,
          caseId: this.case
        }
      });
    }
  }
  
  if (this.progressStats.consecutiveCompletedDays === 15) {
    const existingAlert = this.alerts.find(a => 
      a.type === 'fifteen_day_milestone' && 
      a.metadata?.consecutiveCompletedDays === 15
    );
    
    if (!existingAlert) {
      alerts.push({
        type: 'fifteen_day_milestone',
        message: `🏆 Phenomenal! 15 consecutive days! You've developed a strong recovery routine. Your commitment is truly remarkable!`,
        metadata: {
          consecutiveCompletedDays: this.progressStats.consecutiveCompletedDays,
          milestone: 'fifteen_days',
          workerId: this.worker,
          caseId: this.case
        }
      });
    }
  }
  
  if (this.progressStats.consecutiveCompletedDays === 30) {
    const existingAlert = this.alerts.find(a => 
      a.type === 'thirty_day_milestone' && 
      a.metadata?.consecutiveCompletedDays === 30
    );
    
    if (!existingAlert) {
      alerts.push({
        type: 'thirty_day_milestone',
        message: `🎊 Incredible! A full month of consecutive exercise completion! You've transformed your recovery into a powerful habit. Congratulations!`,
        metadata: {
          consecutiveCompletedDays: this.progressStats.consecutiveCompletedDays,
          milestone: 'thirty_days',
          workerId: this.worker,
          caseId: this.case
        }
      });
    }
  }
  
  // Check for general progress milestone (if different from specific milestones)
  if (this.progressStats.consecutiveCompletedDays >= (this.settings?.progressMilestoneDays || 7) && 
      ![5, 10, 15, 30].includes(this.progressStats.consecutiveCompletedDays)) {
    alerts.push({
      type: 'progress_milestone',
      message: `Great progress! Worker has completed ${this.progressStats.consecutiveCompletedDays} consecutive sessions.`,
      metadata: {
        consecutiveCompletedDays: this.progressStats.consecutiveCompletedDays,
        workerId: this.worker,
        caseId: this.case
      }
    });
  }
  
  // Add new alerts
  if (alerts.length > 0) {
    console.log('Adding alerts:', alerts.length);
    this.alerts.push(...alerts);
    await this.save();
  }
  
  return alerts;
};

// Method to update pain statistics and analyze trends
rehabilitationPlanSchema.methods.updatePainStats = function() {
  console.log('Updating pain statistics...');
  
  // Ensure pain stats are initialized
  if (!this.progressStats.painStats) {
    this.progressStats.painStats = {
      averagePainLevel: 0,
      lastReportedPainLevel: 0,
      painTrend: 'unknown',
      painHistory: [],
      highPainAlertTriggered: false,
      increasingPainAlertTriggered: false
    };
  }
  
  // Get all exercise completions with pain levels reported
  const painReports = [];
  this.dailyCompletions.forEach(completion => {
    const completionDate = new Date(completion.date);
    completionDate.setHours(0, 0, 0, 0);
    
    // Filter exercises with pain levels reported
    const exercisesWithPain = completion.exercises.filter(e => 
      e.status === 'completed' && e.painLevel !== null && e.painLevel !== undefined
    );
    
    if (exercisesWithPain.length > 0) {
      // Calculate average pain for the day
      const totalPain = exercisesWithPain.reduce((sum, e) => sum + e.painLevel, 0);
      const avgPain = totalPain / exercisesWithPain.length;
      
      painReports.push({
        date: completionDate,
        averagePainLevel: avgPain,
        exerciseCount: exercisesWithPain.length
      });
    }
  });
  
  // Sort pain reports by date (oldest to newest)
  painReports.sort((a, b) => a.date - b.date);
  
  // Update pain history (keep last 30 days)
  this.progressStats.painStats.painHistory = painReports.slice(-30);
  
  // Calculate overall average pain level
  if (painReports.length > 0) {
    const totalPain = painReports.reduce((sum, report) => sum + report.averagePainLevel, 0);
    this.progressStats.painStats.averagePainLevel = totalPain / painReports.length;
    
    // Update last reported pain level
    const lastReport = painReports[painReports.length - 1];
    this.progressStats.painStats.lastReportedPainLevel = lastReport.averagePainLevel;
    this.progressStats.painStats.lastReportedPainDate = lastReport.date;
  }
  
  // Analyze pain trend (need at least 3 data points)
  if (painReports.length >= 3) {
    // Get the last 7 days of pain reports or all if less than 7
    const recentReports = painReports.slice(-7);
    
    // Simple trend analysis
    let increasing = 0;
    let decreasing = 0;
    let stable = 0;
    
    for (let i = 1; i < recentReports.length; i++) {
      const diff = recentReports[i].averagePainLevel - recentReports[i-1].averagePainLevel;
      
      if (diff > 0.5) {  // Pain increased by more than 0.5 points
        increasing++;
      } else if (diff < -0.5) {  // Pain decreased by more than 0.5 points
        decreasing++;
      } else {  // Pain relatively stable
        stable++;
      }
    }
    
    // Determine trend
    if (increasing > decreasing && increasing > stable) {
      this.progressStats.painStats.painTrend = 'increasing';
    } else if (decreasing > increasing && decreasing > stable) {
      this.progressStats.painStats.painTrend = 'decreasing';
    } else if (stable > increasing && stable > decreasing) {
      this.progressStats.painStats.painTrend = 'stable';
    } else {
      this.progressStats.painStats.painTrend = 'fluctuating';
    }
  } else {
    this.progressStats.painStats.painTrend = 'unknown';
  }
  
  console.log('Pain trend analysis:', this.progressStats.painStats.painTrend);
  console.log('Average pain level:', this.progressStats.painStats.averagePainLevel);
  
  return this.progressStats.painStats;
};

// Method to get pain trend data for visualization
rehabilitationPlanSchema.methods.getPainTrendData = function(days = 30) {
  // Ensure pain stats exist
  if (!this.progressStats.painStats || !this.progressStats.painStats.painHistory) {
    return [];
  }
  
  // Get the most recent X days of pain data
  const painData = this.progressStats.painStats.painHistory.slice(-days);
  
  return painData.map(entry => ({
    date: entry.date,
    painLevel: entry.averagePainLevel,
    exerciseCount: entry.exerciseCount
  }));
};

// Method to get milestone progress information
rehabilitationPlanSchema.methods.getMilestoneProgress = function() {
  const milestones = [
    { days: 5, name: 'five_days', emoji: '🎉', message: '5-Day Streak!' },
    { days: 10, name: 'ten_days', emoji: '🌟', message: '10-Day Streak!' },
    { days: 15, name: 'fifteen_days', emoji: '🏆', message: '15-Day Streak!' },
    { days: 30, name: 'thirty_days', emoji: '🎊', message: '30-Day Streak!' }
  ];
  
  const currentStreak = this.progressStats.consecutiveCompletedDays;
  
  return milestones.map(milestone => ({
    ...milestone,
    achieved: currentStreak >= milestone.days,
    next: currentStreak < milestone.days && 
          (milestone.days === 5 || currentStreak >= milestones[milestones.indexOf(milestone) - 1]?.days || milestones.indexOf(milestone) === 0),
    progress: Math.min((currentStreak / milestone.days) * 100, 100)
  }));
};

module.exports = mongoose.model('RehabilitationPlan', rehabilitationPlanSchema);
