const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
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
  assessmentDate: {
    type: Date,
    default: Date.now
  },
  assessmentType: {
    type: String,
    enum: ['initial', 'follow_up', 'discharge', 'return_to_work'],
    required: true
  },
  painAssessment: {
    currentPain: {
      level: {
        type: Number,
        min: 0,
        max: 10
      },
      location: [String],
      quality: String,
      triggers: [String]
    },
    functionalLimitations: [String],
    impactOnWork: String,
    impactOnDailyLife: String
  },
  physicalExamination: {
    rangeOfMotion: {
      cervical: String,
      thoracic: String,
      lumbar: String,
      shoulders: String,
      elbows: String,
      wrists: String,
      hips: String,
      knees: String,
      ankles: String
    },
    strength: {
      cervical: String,
      shoulders: String,
      elbows: String,
      wrists: String,
      lumbar: String,
      hips: String,
      knees: String,
      ankles: String
    },
    specialTests: [{
      test: String,
      result: String,
      notes: String
    }],
    neurological: {
      sensation: String,
      reflexes: String,
      motor: String
    }
  },
  functionalCapacity: {
    lifting: {
      floorToWaist: Number,
      waistToShoulder: Number,
      shoulderToOverhead: Number
    },
    carrying: {
      distance: Number,
      weight: Number
    },
    pushing: {
      force: Number,
      distance: Number
    },
    pulling: {
      force: Number,
      distance: Number
    },
    climbing: {
      stairs: Boolean,
      ladders: Boolean,
      frequency: String
    },
    balancing: String,
    stooping: String,
    kneeling: String,
    crouching: String,
    crawling: String,
    reaching: String,
    handling: String,
    fingering: String,
    feeling: String,
    talking: String,
    hearing: String,
    seeing: String
  },
  workCapacity: {
    currentCapacity: {
      type: String,
      enum: ['no_work', 'light_duty', 'modified_duty', 'full_duty']
    },
    recommendedRestrictions: [String],
    recommendedAccommodations: [String],
    estimatedReturnDate: Date,
    workReadinessScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  treatmentPlan: {
    goals: [String],
    interventions: [String],
    frequency: String,
    duration: String,
    expectedOutcomes: [String]
  },
  recommendations: {
    workModifications: [String],
    equipmentNeeds: [String],
    trainingNeeds: [String],
    followUpRequired: Boolean,
    nextAssessmentDate: Date
  },
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

module.exports = mongoose.model('Assessment', assessmentSchema);
