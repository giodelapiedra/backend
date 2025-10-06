// Skip MongoDB models in production
if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
  console.log('Skipping Appointment model - using Supabase only');
  module.exports = {};
  return;
}

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentType: {
    type: String,
    enum: ['assessment', 'treatment', 'follow_up', 'consultation', 'telehealth'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 60 // minutes
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  location: {
    type: String,
    enum: ['clinic', 'telehealth', 'workplace', 'home'],
    default: 'clinic'
  },
  telehealthInfo: {
    platform: String,
    meetingId: String,
    meetingUrl: String,
    password: String,
    instructions: String,
    zoomMeeting: {
      id: String,
      topic: String,
      startTime: Date,
      duration: Number,
      joinUrl: String,
      password: String,
      meetingId: String,
      hostId: String,
      createdAt: Date,
      status: String
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    notes: String
  },
  purpose: String,
  agenda: [String],
  preparation: [String],
  notes: String,
  reminders: {
    email: {
      sent: Boolean,
      sentAt: Date
    },
    sms: {
      sent: Boolean,
      sentAt: Date
    },
    phone: {
      called: Boolean,
      calledAt: Date
    }
  },
  followUp: {
    required: Boolean,
    nextAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    notes: String
  },
  outcome: {
    goals: [String],
    progress: String,
    recommendations: [String],
    nextSteps: [String],
    restrictions: [String],
    accommodations: [String]
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String,
  cancellationDate: Date,
  rescheduledTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    notes: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
appointmentSchema.index({ clinician: 1, scheduledDate: 1 });
appointmentSchema.index({ worker: 1, scheduledDate: 1 });
appointmentSchema.index({ case: 1, scheduledDate: 1 });
appointmentSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
