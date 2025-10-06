/**
 * Centralized Notification Service
 * 
 * This service handles all notification-related functionality:
 * - Creating notifications
 * - Sending real-time updates
 * - Batch processing notifications
 * - Managing notification templates
 */

// Skip MongoDB imports in production
let Notification, User, mongoose;
if (process.env.NODE_ENV !== 'production' && process.env.USE_SUPABASE !== 'true') {
  Notification = require('../models/Notification');
  User = require('../models/User');
  mongoose = require('mongoose');
} else {
  console.log('Skipping MongoDB imports in NotificationService - using Supabase only');
  Notification = {};
  User = {};
}

// Store active SSE connections
const activeConnections = new Map();

class NotificationService {
  /**
   * Send notification updates to specific user
   * @param {string} userId - User ID to send notification to
   */
  static async sendNotificationUpdate(userId) {
    const unreadCount = await Notification.getUnreadCount(userId);
    const connections = activeConnections.get(userId.toString());
    
    if (connections) {
      const message = JSON.stringify({
        type: 'notification_count_update',
        unreadCount: unreadCount
      });
      
      connections.forEach(res => {
        try {
          res.write(`data: ${message}\n\n`);
        } catch (error) {
          console.error('Error sending SSE message:', error);
          // Remove broken connection
          const index = connections.indexOf(res);
          if (index > -1) {
            connections.splice(index, 1);
          }
        }
      });
      
      // Clean up empty connections
      if (connections.length === 0) {
        activeConnections.delete(userId.toString());
      }
    }
  }

  /**
   * Register a new SSE connection
   * @param {string} userId - User ID
   * @param {object} res - Response object
   */
  static registerConnection(userId, res) {
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, []);
    }
    activeConnections.get(userId).push(res);
    
    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');
  }

  /**
   * Remove an SSE connection
   * @param {string} userId - User ID
   * @param {object} res - Response object
   */
  static removeConnection(userId, res) {
    const connections = activeConnections.get(userId);
    if (connections) {
      const index = connections.indexOf(res);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        activeConnections.delete(userId);
      }
    }
  }

  /**
   * Create a notification
   * @param {object} notificationData - Notification data
   * @returns {Promise<object>} Created notification
   */
  static async createNotification(notificationData) {
    const notification = new Notification(notificationData);
    await notification.save();
    
    // Send real-time update
    await this.sendNotificationUpdate(notification.recipient);
    
    return notification;
  }

  /**
   * Create multiple notifications in batch
   * @param {Array} notificationsData - Array of notification data objects
   * @returns {Promise<Array>} Created notifications
   */
  static async createBatchNotifications(notificationsData) {
    if (!Array.isArray(notificationsData) || notificationsData.length === 0) {
      return [];
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create all notifications in a single transaction
      const notifications = await Notification.insertMany(notificationsData, { session });
      
      // Commit the transaction
      await session.commitTransaction();
      
      // Send real-time updates to all recipients
      const uniqueRecipients = [...new Set(notificationsData.map(n => n.recipient.toString()))];
      
      // Send updates to each recipient
      for (const recipientId of uniqueRecipients) {
        await this.sendNotificationUpdate(recipientId);
      }
      
      return notifications;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create incident notification
   * @param {string} workerId - Worker ID
   * @param {string} incidentId - Incident ID
   * @param {object} incidentData - Incident data
   * @returns {Promise<object>} Created notification
   */
  static async createIncidentNotification(workerId, incidentId, incidentData) {
    const notificationData = {
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
    };
    
    return await this.createNotification(notificationData);
  }

  /**
   * Create clinician assignment notification
   * @param {string} clinicianId - Clinician ID
   * @param {string} caseId - Case ID
   * @param {object} caseData - Case data
   * @param {string} caseManagerId - Case manager ID
   * @returns {Promise<object>} Created notification
   */
  static async createClinicianAssignmentNotification(clinicianId, caseId, caseData, caseManagerId) {
    const notificationData = {
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
    };
    
    return await this.createNotification(notificationData);
  }

  /**
   * Create Zoom meeting notification
   * @param {string} workerId - Worker ID
   * @param {string} clinicianId - Clinician ID
   * @param {string} appointmentId - Appointment ID
   * @param {object} appointmentData - Appointment data
   * @param {object} zoomMeetingData - Zoom meeting data
   * @returns {Promise<object>} Created notification
   */
  static async createZoomMeetingNotification(workerId, clinicianId, appointmentId, appointmentData, zoomMeetingData) {
    const notificationData = {
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
    };
    
    return await this.createNotification(notificationData);
  }

  /**
   * Create case status change notification
   * @param {string} recipientId - Recipient ID
   * @param {string} senderId - Sender ID
   * @param {string} caseId - Case ID
   * @param {string} caseNumber - Case number
   * @param {string} oldStatus - Old status
   * @param {string} newStatus - New status
   * @returns {Promise<object>} Created notification
   */
  static async createCaseStatusChangeNotification(recipientId, senderId, caseId, caseNumber, oldStatus, newStatus) {
    const notificationData = {
      recipient: recipientId,
      sender: senderId,
      type: 'case_status_change',
      title: 'Case Status Updated',
      message: `Case #${caseNumber} status has been updated from ${oldStatus} to ${newStatus}.`,
      relatedEntity: {
        type: 'case',
        id: caseId
      },
      priority: 'medium',
      actionUrl: `/cases/${caseId}`,
      metadata: {
        caseNumber: caseNumber,
        oldStatus: oldStatus,
        newStatus: newStatus
      }
    };
    
    return await this.createNotification(notificationData);
  }

  /**
   * Create check-in reminder notification
   * @param {string} workerId - Worker ID
   * @param {string} caseId - Case ID
   * @param {string} caseNumber - Case number
   * @returns {Promise<object>} Created notification
   */
  static async createCheckInReminderNotification(workerId, caseId, caseNumber) {
    const notificationData = {
      recipient: workerId,
      sender: workerId, // System notification
      type: 'check_in_reminder',
      title: 'Daily Check-in Reminder',
      message: `Please complete your daily check-in for case #${caseNumber}. Your progress updates are important for your recovery plan.`,
      relatedEntity: {
        type: 'case',
        id: caseId
      },
      priority: 'high',
      actionUrl: `/check-in/${caseId}`,
      metadata: {
        caseNumber: caseNumber
      }
    };
    
    return await this.createNotification(notificationData);
  }

  /**
   * Create appointment reminder notification
   * @param {string} recipientId - Recipient ID
   * @param {string} appointmentId - Appointment ID
   * @param {object} appointmentData - Appointment data
   * @returns {Promise<object>} Created notification
   */
  static async createAppointmentReminderNotification(recipientId, appointmentId, appointmentData) {
    const notificationData = {
      recipient: recipientId,
      sender: appointmentData.clinician || recipientId, // Clinician or self if not available
      type: 'appointment_reminder',
      title: 'Upcoming Appointment Reminder',
      message: `You have a ${appointmentData.appointmentType} appointment scheduled for ${new Date(appointmentData.scheduledDate).toLocaleDateString()} at ${new Date(appointmentData.scheduledDate).toLocaleTimeString()}.`,
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
        location: appointmentData.location,
        isVirtual: appointmentData.isVirtual
      }
    };
    
    return await this.createNotification(notificationData);
  }
  
  /**
   * Create high pain notification for clinician
   * @param {string} clinicianId - Clinician ID
   * @param {string} workerId - Worker ID
   * @param {string} planId - Rehabilitation plan ID
   * @param {string} exerciseName - Exercise name
   * @param {number} painLevel - Pain level (0-10)
   * @param {string} painNotes - Pain notes
   * @returns {Promise<object>} Created notification
   */
  static async createHighPainNotification(clinicianId, workerId, planId, exerciseName, painLevel, painNotes) {
    try {
      console.log(`Creating high pain notification for clinician ${clinicianId} from worker ${workerId}`);
      
      const notificationData = {
        recipient: clinicianId,
        sender: workerId,
        type: 'high_pain',
        title: '⚠️ High Pain Level Reported',
        message: `Worker reported pain level ${painLevel}/10 during "${exerciseName}" exercise. ${painNotes ? `Notes: ${painNotes}` : ''}`,
        priority: 'high',
        actionUrl: `/clinician/activity-monitor`,
        relatedEntity: {
          type: 'rehabilitation_plan',
          id: planId
        },
        metadata: {
          planId: planId,
          exerciseName: exerciseName,
          painLevel: painLevel,
          painNotes: painNotes || '',
          workerId: workerId,
          reportedAt: new Date()
        }
      };
      
      // Create the notification
      const notification = await this.createNotification(notificationData);
      console.log('High pain notification created:', notification._id);
      return notification;
    } catch (error) {
      console.error('Error in createHighPainNotification:', error);
      throw error;
    }
  }

  /**
   * Get active connections count
   * @returns {number} Number of active connections
   */
  static getActiveConnectionsCount() {
    let count = 0;
    for (const connections of activeConnections.values()) {
      count += connections.length;
    }
    return count;
  }

  /**
   * Get active users count
   * @returns {number} Number of active users
   */
  static getActiveUsersCount() {
    return activeConnections.size;
  }
}

module.exports = NotificationService;
