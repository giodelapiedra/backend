// Skip MongoDB models in production or if mongoose is not available
try {
  if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
    console.log('Skipping Incident model - using Supabase only');
    module.exports = {};
    return;
  }
} catch (error) {
  console.log('Skipping Incident model - mongoose not available');
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

const incidentSchema = new mongoose.Schema({
  incidentNumber: {
    type: String,
    unique: true,
    required: false
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  incidentDate: {
    type: Date,
    required: true
  },
  reportDate: {
    type: Date,
    default: Date.now
  },
  location: {
    site: String,
    department: String,
    specificLocation: String
  },
  incidentType: {
    type: String,
    enum: ['slip_fall', 'struck_by', 'struck_against', 'overexertion', 'cut_laceration', 'burn', 'crush', 'other'],
    required: true
  },
  severity: {
    type: String,
    enum: ['near_miss', 'first_aid', 'medical_treatment', 'lost_time', 'fatality'],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  immediateCause: String,
  rootCause: String,
  witnesses: [{
    name: String,
    contact: String,
    statement: String
  }],
  immediateActions: [String],
  correctiveActions: [String],
  preventiveActions: [String],
  photos: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['reported', 'investigating', 'investigated', 'closed'],
    default: 'reported'
  },
  investigationNotes: String,
  closedDate: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Generate incident number before saving
incidentSchema.pre('save', async function(next) {
  if (!this.incidentNumber) {
    try {
      // Use a more reliable method to get the next incident number
      const lastIncident = await mongoose.model('Incident').findOne({}, {}, { sort: { 'incidentNumber': -1 } });
      let nextNumber = 1;
      
      if (lastIncident && lastIncident.incidentNumber) {
        // Extract number from last incident number (e.g., "INC-000001" -> 1)
        const match = lastIncident.incidentNumber.match(/INC-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      
      // Check if this number already exists and increment if needed
      let incidentNumber;
      let attempts = 0;
      do {
        incidentNumber = `INC-${String(nextNumber).padStart(6, '0')}`;
        const existing = await mongoose.model('Incident').findOne({ incidentNumber });
        if (!existing) break;
        nextNumber++;
        attempts++;
      } while (attempts < 100); // Prevent infinite loop
      
      this.incidentNumber = incidentNumber;
    } catch (error) {
      console.error('Error generating incident number:', error);
      // Fallback to timestamp-based number
      this.incidentNumber = `INC-${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

module.exports = mongoose.model('Incident', incidentSchema);
