// Skip MongoDB models in production or if mongoose is not available
try {
  if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
    console.log('Skipping Notification model - using Supabase only');
    module.exports = {};
    return;
  }
} catch (error) {
  console.log('Skipping Notification model - mongoose not available');
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

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['incident_reported', 'case_created', 'appointment_scheduled', 'check_in_reminder', 'task_assigned', 'case_status_change', 'general', 'high_pain', 'rtw_review', 'fatigue_resource', 'rehab_plan_assigned', 'rehab_plan_review', 'progress_encouragement', 'exercise_completed', 'exercise_skipped', 'daily_check_in', 'activity_log_created', 'case_closed', 'return_to_work', 'case_assigned', 'zoom_meeting_scheduled', 'appointment_reminder', 'zoom_meeting_reminder', 'work_readiness_followup', 'work_readiness_submitted'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['incident', 'case', 'appointment', 'task', 'check_in', 'rehabilitation_plan']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  actionUrl: String, // URL to navigate to when notification is clicked
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Virtual for notification age
notificationSchema.virtual('age').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  }
  return `${diffDays}d ago`;
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to create incident notification
notificationSchema.statics.createIncidentNotification = async function(workerId, incidentId, incidentData) {
  const notification = new this({
    recipient: workerId,
    sender: incidentData.reportedBy,
    type: 'incident_reported',
    title: 'New Incident Report',
    message: `A workplace incident involving you has been reported. Please complete your daily check-in to provide updates on your condition and recovery progress.`,
    relatedEntity: {
      type: 'incident',
      id: incidentId
    },
    priority: incidentData.severity === 'fatality' || incidentData.severity === 'lost_time' ? 'urgent' : 
              incidentData.severity === 'medical_treatment' ? 'high' : 'medium',
    actionUrl: '/cases',
    metadata: {
      incidentNumber: incidentData.incidentNumber,
      severity: incidentData.severity,
      incidentType: incidentData.incidentType,
      incidentDate: incidentData.incidentDate
    }
  });
  
  return await notification.save();
};

// Static method to create clinician assignment notification
notificationSchema.statics.createClinicianAssignmentNotification = async function(clinicianId, caseId, caseData, caseManagerId) {
  const notification = new this({
    recipient: clinicianId,
    sender: caseManagerId,
    type: 'case_created',
    title: 'New Case Assignment',
    message: `You have been assigned to a new case. Please review the case details and schedule an initial assessment.`,
    relatedEntity: {
      type: 'case',
      id: caseId
    },
    priority: caseData.priority === 'urgent' ? 'urgent' : 
              caseData.priority === 'high' ? 'high' : 'medium',
    actionUrl: `/cases/${caseId}`,
    metadata: {
      caseNumber: caseData.caseNumber,
      priority: caseData.priority,
      workerName: caseData.workerName,
      injuryType: caseData.injuryType
    }
  });
  
  return await notification.save();
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ recipient: userId, isRead: false });
};

// Static method to create Zoom meeting notification
notificationSchema.statics.createZoomMeetingNotification = async function(workerId, clinicianId, appointmentId, appointmentData, zoomMeetingData) {
  const notification = new this({
    recipient: workerId,
    sender: clinicianId,
    type: 'zoom_meeting_scheduled',
    title: '🔗 Zoom Meeting Scheduled',
    message: `Your ${appointmentData.appointmentType} appointment has been scheduled for ${new Date(appointmentData.scheduledDate).toLocaleDateString()} at ${new Date(appointmentData.scheduledDate).toLocaleTimeString()}. A Zoom meeting has been created for this telehealth session.`,
    relatedEntity: {
      type: 'appointment',
      id: appointmentId
    },
    priority: 'high',
    actionUrl: '/appointments',
    metadata: {
      appointmentType: appointmentData.appointmentType,
      scheduledDate: appointmentData.scheduledDate,
      duration: appointmentData.duration,
      zoomMeetingId: zoomMeetingData.meetingId,
      zoomJoinUrl: zoomMeetingData.joinUrl,
      zoomPassword: zoomMeetingData.password,
      caseNumber: appointmentData.caseNumber
    }
  });
  
  return await notification.save();
};

// Static method to get notifications for user
notificationSchema.statics.getUserNotifications = async function(userId, limit = 20, skip = 0) {
  return await this.find({ recipient: userId })
    .populate('sender', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Notification', notificationSchema);
