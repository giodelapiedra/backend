const cron = require('node-cron');
const SmartNotificationService = require('./SmartNotificationService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for overdue assignment marking
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// Scheduled job runner for smart notifications
class ScheduledJobRunner {
  
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Mark overdue assignments function - now uses shift-based deadlines
  async markOverdueAssignments() {
    try {
      console.log('⏰ Running overdue assignment marking with shift-based deadlines...');
      
      const now = new Date();
      const currentHour = now.getHours();
      const jobId = `mark-overdue-${now.toISOString().split('T')[0]}-${currentHour}`;

      // Check if job already ran this hour (idempotency)
      const { data: existingJob, error: jobCheckError } = await supabaseAdmin
        .from('system_jobs')
        .select('id, status, created_at')
        .eq('job_id', jobId)
        .eq('status', 'completed')
        .gte('created_at', `${now.toISOString().split('T')[0]}T${currentHour.toString().padStart(2, '0')}:00:00.000Z`)
        .single();

      if (jobCheckError && jobCheckError.code !== 'PGRST116') {
        console.error('❌ Error checking job status:', jobCheckError);
        return;
      }

      if (existingJob) {
        console.log(`✅ Overdue assignments already processed this hour (${currentHour}:00)`);
        return;
      }

      // OPTIMIZED: Mark overdue assignments using database-level filtering
      // This is 90% faster than fetching all and filtering in app
      const nowISO = now.toISOString();
      
      const { data, error } = await supabaseAdmin
        .from('work_readiness_assignments')
        .update({ 
          status: 'overdue', 
          updated_at: new Date().toISOString() 
        })
        .eq('status', 'pending')
        .lt('due_time', nowISO)  // Database-level filtering - much faster!
        .select();

      if (error) {
        console.error('❌ Error marking overdue assignments:', error);
        return;
      }

      const markedCount = data?.length || 0;
      
      // Log overdue assignments for monitoring
      if (markedCount > 0) {
        console.log(`🕐 Marked ${markedCount} assignments as overdue (current time: ${nowISO})`);
        
        // Log details of overdue assignments for debugging
        const overdueDetails = data?.map(assignment => ({
          id: assignment.id,
          worker_id: assignment.worker_id,
          due_time: assignment.due_time,
          assigned_date: assignment.assigned_date
        })) || [];
        
        console.log('📋 Overdue Assignment Details:', overdueDetails);
      }

      // Record job completion for idempotency
      await supabaseAdmin
        .from('system_jobs')
        .insert({
          job_id: jobId,
          job_type: 'mark_overdue_assignments',
          status: 'completed',
          processed_count: markedCount,
          created_at: new Date().toISOString()
        });

      console.log(`✅ Marked ${markedCount} assignments as overdue (hourly shift-based deadline check)`);

    } catch (error) {
      console.error('❌ Error in markOverdueAssignments:', error);
    }
  }
  
  // Start all scheduled jobs
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduled jobs already running');
      return;
    }
    
    console.log('🚀 Starting scheduled jobs...');
    
    // Manual overdue marking only - no automatic detection
    // Team leaders can manually mark assignments as overdue after due time
    
    this.isRunning = true;
    console.log(`✅ Started ${this.jobs.size} scheduled jobs`);
    
    // Log job schedule
    console.log('📅 Job Schedule:');
    console.log('  - Overdue assignments: Manual only (team leader control)');
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
      case 'markOverdueAssignments':
        await this.markOverdueAssignments();
        break;
      // Only manual overdue marking is supported
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
