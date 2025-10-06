import { dataClient } from '../lib/supabase';

export interface NotificationData {
  recipient_id: string;
  sender_id: string;
  type: 'case_assignment' | 'case_update' | 'appointment_reminder' | 'general';
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  related_case_id?: string;
  related_incident_id?: string;
}

export class NotificationService {
  /**
   * Send a notification to a user
   */
  static async sendNotification(notificationData: NotificationData) {
    try {
      const { data, error } = await dataClient
        .from('notifications')
        .insert([{
          recipient_id: notificationData.recipient_id,
          sender_id: notificationData.sender_id,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          priority: notificationData.priority || 'medium',
          related_case_id: notificationData.related_case_id,
          related_incident_id: notificationData.related_incident_id
        }])
        .select();

      if (error) {
        console.error('Error sending notification:', error);
        // If table doesn't exist, just log and continue
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('Notifications table does not exist yet, notification not sent');
          return null;
        }
        throw error;
      }

      console.log('Notification sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't throw error, just log it
      console.log('Notification not sent due to error:', error);
      return null;
    }
  }

  /**
   * Send case assignment notification to clinician
   */
  static async sendCaseAssignmentNotification(
    clinicianId: string,
    caseManagerId: string,
    caseId: string,
    caseNumber: string,
    workerName: string
  ) {
    try {
      console.log('Sending case assignment notification...');
      console.log('Clinician ID:', clinicianId);
      console.log('Case Manager ID:', caseManagerId);
      console.log('Case ID:', caseId);
      console.log('Case Number:', caseNumber);
      console.log('Worker Name:', workerName);

      const notificationData: NotificationData = {
        recipient_id: clinicianId,
        sender_id: caseManagerId,
        type: 'case_assignment',
        title: 'New Case Assigned',
        message: `You have been assigned case ${caseNumber} for worker ${workerName}. Please review and begin assessment.`,
        priority: 'high',
        related_case_id: caseId
      };

      console.log('Notification data to send:', notificationData);

      const result = await this.sendNotification(notificationData);
      console.log('Notification send result:', result);
      
      return result;
    } catch (error) {
      console.error('Failed to send case assignment notification:', error);
      return null;
    }
  }

  /**
   * Send case update notification
   */
  static async sendCaseUpdateNotification(
    recipientId: string,
    senderId: string,
    caseId: string,
    caseNumber: string,
    updateType: string,
    details: string
  ) {
    const notificationData: NotificationData = {
      recipient_id: recipientId,
      sender_id: senderId,
      type: 'case_update',
      title: `Case ${caseNumber} Updated`,
      message: `${updateType}: ${details}`,
      priority: 'medium',
      related_case_id: caseId
    };

    return this.sendNotification(notificationData);
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string, limit: number = 10) {
    try {
      // Check if notifications table exists
      const { data, error } = await dataClient
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Notifications table error:', error);
        // If table doesn't exist, return empty array
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('Notifications table does not exist yet, returning empty array');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string) {
    try {
      const { data, error } = await dataClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select();

      if (error) {
        console.error('Error marking notification as read:', error);
        // If table doesn't exist, just return null
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('Notifications table does not exist yet');
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return null;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    try {
      const { data, error } = await dataClient
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('is_read', false)
        .select();

      if (error) {
        console.error('Error marking all notifications as read:', error);
        // If table doesn't exist, just return null
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('Notifications table does not exist yet');
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return null;
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string) {
    try {
      const { count, error } = await dataClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        // If table doesn't exist, return 0
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('Notifications table does not exist yet, returning 0');
          return 0;
        }
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }
}
