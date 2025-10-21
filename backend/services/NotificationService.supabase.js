const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin Client with service role key and fallback configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

class NotificationService {
  /**
   * Create a notification
   * @param {object} notificationData - Notification data
   * @returns {Promise<object>} Created notification
   */
  static async createNotification(notificationData) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          recipient_id: notificationData.recipient,
          sender_id: notificationData.sender,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          priority: notificationData.priority || 'medium',
          metadata: notificationData.metadata || {},
          is_read: false
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create work readiness notification
   * @param {string} workerId - Worker ID
   * @param {string} teamLeaderId - Team Leader ID
   * @param {string} assignmentId - Assignment ID
   * @param {string} dueTime - Due time
   * @param {string} notes - Optional notes
   * @returns {Promise<object>} Created notification
   */
  static async createWorkReadinessNotification(workerId, teamLeaderId, assignmentId, dueTime, notes) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          recipient_id: workerId,
          sender_id: teamLeaderId,
          type: 'work_readiness_submitted',
          title: 'New Work Readiness Assignment',
          message: `You have been assigned to complete a work readiness assessment. Due by ${new Date(dueTime).toLocaleString()}.${notes ? ` Note: ${notes}` : ''}`,
          priority: 'high',
          metadata: {
            assignment_id: assignmentId,
            due_time: dueTime,
            task_type: 'work_readiness'
          },
          is_read: false
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating work readiness notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of notifications
   */
  static async getNotifications(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select(`
          *,
          sender:users!sender_id(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  static async markAsRead(notificationId) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async markAllAsRead(userId) {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Create rehabilitation plan assignment notification
   * @param {string} workerId - Worker ID
   * @param {string} clinicianId - Clinician ID
   * @param {string} planId - Rehabilitation Plan ID
   * @param {string} planName - Plan name
   * @param {string} caseNumber - Case number
   * @returns {Promise<object>} Created notification
   */
  static async createRehabPlanAssignmentNotification(workerId, clinicianId, planId, planName, caseNumber) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          recipient_id: workerId,
          sender_id: clinicianId,
          type: 'rehab_plan_assigned',
          title: 'New Rehabilitation Plan Assigned',
          message: `Your clinician has assigned you a new rehabilitation plan: "${planName}" for case ${caseNumber}. Please review and start your exercises.`,
          priority: 'high',
          metadata: {
            plan_id: planId,
            plan_name: planName,
            case_number: caseNumber,
            task_type: 'rehabilitation_plan'
          },
          is_read: false
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating rehabilitation plan assignment notification:', error);
      throw error;
    }
  }

  /**
   * Create rehabilitation plan completion notification
   * @param {string} clinicianId - Clinician ID
   * @param {string} workerId - Worker ID
   * @param {string} planId - Rehabilitation Plan ID
   * @param {string} planName - Plan name
   * @param {string} caseNumber - Case number
   * @param {string} workerName - Worker name
   * @returns {Promise<object>} Created notification
   */
  static async createRehabPlanCompletionNotification(clinicianId, workerId, planId, planName, caseNumber, workerName) {
    try {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          recipient_id: clinicianId,
          sender_id: workerId,
          type: 'rehab_plan_completed',
          title: 'Rehabilitation Plan Completed',
          message: `${workerName} has completed their rehabilitation plan "${planName}" for case ${caseNumber}. Please review their progress and consider next steps.`,
          priority: 'medium',
          metadata: {
            plan_id: planId,
            plan_name: planName,
            case_number: caseNumber,
            worker_name: workerName,
            task_type: 'rehabilitation_plan'
          },
          is_read: false
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating rehabilitation plan completion notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
