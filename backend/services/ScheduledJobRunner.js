const cron = require('node-cron');
const SmartNotificationService = require('./SmartNotificationService');

// Scheduled job runner for smart notifications
class ScheduledJobRunner {
  
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }
  
  // Start all scheduled jobs
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduled jobs already running');
      return;
    }
    
    console.log('🚀 Starting scheduled jobs...');
    
    // Check for missed check-ins every day at 9 AM
    this.jobs.set('checkInReminders', cron.schedule('0 9 * * *', async () => {
      console.log('⏰ Running daily check-in reminders...');
      await SmartNotificationService.checkMissedCheckIns();
    }, {
      scheduled: true,
      timezone: 'Asia/Manila'
    }));
    
    // Check for overdue cases every day at 10 AM
    this.jobs.set('overdueCases', cron.schedule('0 10 * * *', async () => {
      console.log('⏰ Running overdue case checks...');
      await SmartNotificationService.checkOverdueCases();
    }, {
      scheduled: true,
      timezone: 'Asia/Manila'
    }));
    
    // Check for rehab milestones every day at 11 AM
    this.jobs.set('rehabMilestones', cron.schedule('0 11 * * *', async () => {
      console.log('⏰ Running rehabilitation milestone checks...');
      await SmartNotificationService.checkRehabMilestones();
    }, {
      scheduled: true,
      timezone: 'Asia/Manila'
    }));
    
    // Check for upcoming appointments every day at 2 PM
    this.jobs.set('appointmentReminders', cron.schedule('0 14 * * *', async () => {
      console.log('⏰ Running appointment reminders...');
      await SmartNotificationService.checkUpcomingAppointments();
    }, {
      scheduled: true,
      timezone: 'Asia/Manila'
    }));
    
    // Run all checks every 6 hours for critical notifications
    this.jobs.set('allChecks', cron.schedule('0 */6 * * *', async () => {
      console.log('⏰ Running all smart notification checks...');
      await SmartNotificationService.runAllChecks();
    }, {
      scheduled: true,
      timezone: 'Asia/Manila'
    }));
    
    this.isRunning = true;
    console.log(`✅ Started ${this.jobs.size} scheduled jobs`);
    
    // Log job schedule
    console.log('📅 Job Schedule:');
    console.log('  - Check-in reminders: Daily at 9:00 AM');
    console.log('  - Overdue cases: Daily at 10:00 AM');
    console.log('  - Rehab milestones: Daily at 11:00 AM');
    console.log('  - Appointment reminders: Daily at 2:00 PM');
    console.log('  - All checks: Every 6 hours');
  }
  
  // Stop all scheduled jobs
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ No scheduled jobs running');
      return;
    }
    
    console.log('🛑 Stopping scheduled jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`  - Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ All scheduled jobs stopped');
  }
  
  // Get job status
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: []
    };
    
    this.jobs.forEach((job, name) => {
      status.jobs.push({
        name: name,
        running: job.running,
        scheduled: job.scheduled
      });
    });
    
    return status;
  }
  
  // Run a specific job immediately
  async runJob(jobName) {
    console.log(`🚀 Running job immediately: ${jobName}`);
    
    switch (jobName) {
      case 'checkInReminders':
        await SmartNotificationService.checkMissedCheckIns();
        break;
      case 'overdueCases':
        await SmartNotificationService.checkOverdueCases();
        break;
      case 'rehabMilestones':
        await SmartNotificationService.checkRehabMilestones();
        break;
      case 'appointmentReminders':
        await SmartNotificationService.checkUpcomingAppointments();
        break;
      case 'allChecks':
        await SmartNotificationService.runAllChecks();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
    
    console.log(`✅ Job completed: ${jobName}`);
  }
  
  // Add custom job
  addJob(name, schedule, callback) {
    if (this.jobs.has(name)) {
      throw new Error(`Job ${name} already exists`);
    }
    
    const job = cron.schedule(schedule, callback, {
      scheduled: true,
      timezone: 'Asia/Manila'
    });
    
    this.jobs.set(name, job);
    console.log(`✅ Added custom job: ${name} (schedule: ${schedule})`);
    
    return job;
  }
  
  // Remove job
  removeJob(name) {
    if (!this.jobs.has(name)) {
      throw new Error(`Job ${name} does not exist`);
    }
    
    const job = this.jobs.get(name);
    job.stop();
    this.jobs.delete(name);
    
    console.log(`✅ Removed job: ${name}`);
  }
}

// Create singleton instance
const jobRunner = new ScheduledJobRunner();

module.exports = jobRunner;
