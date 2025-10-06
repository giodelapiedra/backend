const cron = require('node-cron');
require('dotenv').config();

// Skip MongoDB in production
let mongoose;
if (process.env.NODE_ENV !== 'production' && process.env.USE_SUPABASE !== 'true') {
  mongoose = require('mongoose');
  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
} else {
  console.log('Skipping MongoDB connection in notificationScheduler - using Supabase only');
}

// Skip MongoDB imports in production
let Appointment, Notification, User;
if (process.env.NODE_ENV !== 'production' && process.env.USE_SUPABASE !== 'true') {
  Appointment = require('../models/Appointment');
  Notification = require('../models/Notification');
  User = require('../models/User');
} else {
  console.log('Skipping MongoDB model imports in notificationScheduler - using Supabase only');
  Appointment = {};
  Notification = {};
  User = {};
}
const NotificationService = require('./NotificationService');

class NotificationScheduler {
  constructor() {
    this.isRunning = false;
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      console.log('📅 Notification scheduler is already running');
      return;
    }

    console.log('🚀 Starting notification scheduler...');
    
    // Run daily at 8:00 AM to check for today's appointments
    cron.schedule('0 8 * * *', async () => {
      console.log('⏰ Checking for appointments scheduled for today...');
      await this.sendTodaysAppointmentNotifications();
    });

    // Run every hour to check for appointments starting soon (within 1 hour)
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Checking for appointments starting soon...');
      await this.sendUpcomingAppointmentReminders();
    });

    this.isRunning = true;
    console.log('✅ Notification scheduler started successfully');
  }

  // Stop the scheduler
  stop() {
    if (!this.isRunning) {
      console.log('📅 Notification scheduler is not running');
      return;
    }

    cron.destroy();
    this.isRunning = false;
    console.log('🛑 Notification scheduler stopped');
  }

  // Send notifications for appointments scheduled for today
  async sendTodaysAppointmentNotifications() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log(`📅 Checking appointments scheduled for ${today.toLocaleDateString()}`);

      // Find all appointments scheduled for today
      const todaysAppointments = await Appointment.find({
        scheduledDate: {
          $gte: today,
          $lt: tomorrow
        },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .populate('worker', 'firstName lastName email')
      .populate('clinician', 'firstName lastName email')
      .populate('case', 'caseNumber');

      console.log(`📊 Found ${todaysAppointments.length} appointments scheduled for today`);

      // Prepare batch notifications
      const notifications = [];

      for (const appointment of todaysAppointments) {
        const appointmentTime = new Date(appointment.scheduledDate);
        const timeString = appointmentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Check if notification was already sent today for this appointment
        const existingNotification = await Notification.findOne({
          recipient: { $in: [appointment.worker._id, appointment.clinician._id] },
          'relatedEntity.id': appointment._id,
          type: { $in: ['appointment_reminder', 'zoom_meeting_reminder'] },
          createdAt: { $gte: today }
        });

        if (existingNotification) {
          console.log(`⏭️  Notification already sent today for appointment ${appointment._id}`);
          continue;
        }
        
        // Add worker notification to batch
        if (appointment.worker) {
          const isZoomMeeting = appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting;
          
          notifications.push({
            recipient: appointment.worker._id,
            sender: appointment.clinician._id,
            type: isZoomMeeting ? 'zoom_meeting_reminder' : 'appointment_reminder',
            title: isZoomMeeting ? '🔗 Zoom Meeting Today' : '📅 Appointment Today',
            message: isZoomMeeting 
              ? `You have a Zoom meeting scheduled for today at ${timeString}. Please join 5 minutes before the scheduled time.`
              : `You have an appointment scheduled for today at ${timeString}. Please arrive 10 minutes early.`,
            relatedEntity: {
              type: 'appointment',
              id: appointment._id
            },
            priority: 'high',
            actionUrl: '/appointments',
            metadata: {
              appointmentType: appointment.appointmentType,
              scheduledDate: appointment.scheduledDate,
              duration: appointment.duration,
              location: appointment.location,
              caseNumber: appointment.case.caseNumber,
              isZoomMeeting: isZoomMeeting,
              zoomJoinUrl: isZoomMeeting ? appointment.telehealthInfo.zoomMeeting.joinUrl : null
            }
          });
        }

        // Add clinician notification to batch
        if (appointment.clinician) {
          const isZoomMeeting = appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting;
          
          notifications.push({
            recipient: appointment.clinician._id,
            sender: appointment.clinician._id, // Self-notification
            type: isZoomMeeting ? 'zoom_meeting_reminder' : 'appointment_reminder',
            title: isZoomMeeting ? '🔗 Zoom Meeting Today' : '📅 Appointment Today',
            message: isZoomMeeting 
              ? `You have a Zoom meeting with ${appointment.worker.firstName} ${appointment.worker.lastName} scheduled for today at ${timeString}.`
              : `You have an appointment with ${appointment.worker.firstName} ${appointment.worker.lastName} scheduled for today at ${timeString}.`,
            relatedEntity: {
              type: 'appointment',
              id: appointment._id
            },
            priority: 'high',
            actionUrl: '/appointments',
            metadata: {
              appointmentType: appointment.appointmentType,
              scheduledDate: appointment.scheduledDate,
              duration: appointment.duration,
              location: appointment.location,
              caseNumber: appointment.case.caseNumber,
              workerName: `${appointment.worker.firstName} ${appointment.worker.lastName}`,
              isZoomMeeting: isZoomMeeting,
              zoomJoinUrl: isZoomMeeting ? appointment.telehealthInfo.zoomMeeting.joinUrl : null
            }
          });
        }
      }

      // Send batch notifications if any
      if (notifications.length > 0) {
        await NotificationService.createBatchNotifications(notifications);
        console.log(`✅ Sent ${notifications.length} notifications for appointments scheduled for today`);
      } else {
        console.log('ℹ️ No notifications to send for today\'s appointments');
      }
      
    } catch (error) {
      console.error('❌ Error sending today\'s appointment notifications:', error);
    }
  }

  // Send reminders for appointments starting soon (within 1 hour)
  async sendUpcomingAppointmentReminders() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Find appointments starting within the next hour
      const upcomingAppointments = await Appointment.find({
        scheduledDate: {
          $gte: now,
          $lte: oneHourFromNow
        },
        status: { $in: ['scheduled', 'confirmed'] }
      })
      .populate('worker', 'firstName lastName email')
      .populate('clinician', 'firstName lastName email')
      .populate('case', 'caseNumber');

      // Prepare batch notifications
      const notifications = [];

      for (const appointment of upcomingAppointments) {
        const appointmentTime = new Date(appointment.scheduledDate);
        const timeUntilAppointment = Math.round((appointmentTime - now) / (1000 * 60)); // minutes
        
        if (timeUntilAppointment <= 60 && timeUntilAppointment > 0) {
          const isZoomMeeting = appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting;
          
          // Add worker notification to batch
          notifications.push({
            recipient: appointment.worker._id,
            sender: appointment.clinician._id,
            type: isZoomMeeting ? 'zoom_meeting_reminder' : 'appointment_reminder',
            title: isZoomMeeting ? '🔗 Zoom Meeting Starting Soon' : '📅 Appointment Starting Soon',
            message: isZoomMeeting 
              ? `Your Zoom meeting starts in ${timeUntilAppointment} minutes. Please join now.`
              : `Your appointment starts in ${timeUntilAppointment} minutes. Please prepare to arrive.`,
            relatedEntity: {
              type: 'appointment',
              id: appointment._id
            },
            priority: 'urgent',
            actionUrl: '/appointments',
            metadata: {
              appointmentType: appointment.appointmentType,
              scheduledDate: appointment.scheduledDate,
              timeUntilAppointment: timeUntilAppointment,
              isZoomMeeting: isZoomMeeting,
              zoomJoinUrl: isZoomMeeting ? appointment.telehealthInfo.zoomMeeting.joinUrl : null
            }
          });

          // Add clinician notification to batch
          notifications.push({
            recipient: appointment.clinician._id,
            sender: appointment.clinician._id,
            type: isZoomMeeting ? 'zoom_meeting_reminder' : 'appointment_reminder',
            title: isZoomMeeting ? '🔗 Zoom Meeting Starting Soon' : '📅 Appointment Starting Soon',
            message: isZoomMeeting 
              ? `Your Zoom meeting with ${appointment.worker.firstName} ${appointment.worker.lastName} starts in ${timeUntilAppointment} minutes.`
              : `Your appointment with ${appointment.worker.firstName} ${appointment.worker.lastName} starts in ${timeUntilAppointment} minutes.`,
            relatedEntity: {
              type: 'appointment',
              id: appointment._id
            },
            priority: 'urgent',
            actionUrl: '/appointments',
            metadata: {
              appointmentType: appointment.appointmentType,
              scheduledDate: appointment.scheduledDate,
              timeUntilAppointment: timeUntilAppointment,
              workerName: `${appointment.worker.firstName} ${appointment.worker.lastName}`,
              isZoomMeeting: isZoomMeeting,
              zoomJoinUrl: isZoomMeeting ? appointment.telehealthInfo.zoomMeeting.joinUrl : null
            }
          });
        }
      }

      // Send batch notifications if any
      if (notifications.length > 0) {
        await NotificationService.createBatchNotifications(notifications);
        console.log(`⏰ Sent ${notifications.length} upcoming appointment reminders`);
      }
      
    } catch (error) {
      console.error('❌ Error sending upcoming appointment reminders:', error);
    }
  }

  // Manual trigger for testing
  async triggerTodaysNotifications() {
    console.log('🧪 Manually triggering today\'s appointment notifications...');
    await this.sendTodaysAppointmentNotifications();
  }

  async triggerUpcomingReminders() {
    console.log('🧪 Manually triggering upcoming reminders...');
    await this.sendUpcomingAppointmentReminders();
  }
}

module.exports = new NotificationScheduler();