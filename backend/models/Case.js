const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  caseNumber: {
    type: String,
    unique: true,
    required: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caseManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clinician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  incident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  injuryDetails: {
    bodyPart: {
      type: String,
      required: [true, 'Body part is required']
    },
    injuryType: {
      type: String,
      required: [true, 'Injury type is required']
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe'],
      required: [true, 'Severity is required']
    },
    description: String,
    dateOfInjury: Date,
    mechanismOfInjury: String
  },
  workRestrictions: {
    lifting: {
      maxWeight: Number,
      frequency: String,
      duration: String
    },
    standing: {
      maxDuration: Number,
      breaks: Number
    },
    sitting: {
      maxDuration: Number,
      breaks: Number
    },
    bending: Boolean,
    twisting: Boolean,
    climbing: Boolean,
    driving: Boolean,
    other: String
  },
  expectedReturnDate: Date,
  actualReturnDate: Date,
  notes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Generate case number before saving
caseSchema.pre('save', async function(next) {
  try {
    if (!this.caseNumber) {
      console.log('Generating case number...');
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      
      // Generate a timestamp-based unique ID to avoid race conditions
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      
      // Format: CASE-YYYY-TIMESTAMP-RRR (e.g., CASE-2025-1695020154321-123)
      this.caseNumber = `CASE-${year}-${timestamp}-${random}`;
      console.log('Generated case number:', this.caseNumber);
    }
    next();
  } catch (error) {
    console.error('Error in Case pre-save hook:', error);
    next(error);
  }
});

// Database indexes for better performance
caseSchema.index({ caseNumber: 1 });
caseSchema.index({ worker: 1 });
caseSchema.index({ employer: 1 });
caseSchema.index({ caseManager: 1 });
caseSchema.index({ clinician: 1 });
caseSchema.index({ status: 1 });
caseSchema.index({ priority: 1 });
caseSchema.index({ createdAt: -1 });
caseSchema.index({ updatedAt: -1 });
caseSchema.index({ worker: 1, status: 1 }); // Compound index for worker cases
caseSchema.index({ caseManager: 1, status: 1 }); // Compound index for case manager workload
caseSchema.index({ clinician: 1, status: 1 }); // Compound index for clinician workload

module.exports = mongoose.model('Case', caseSchema);
