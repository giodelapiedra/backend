import { dataClient } from '../lib/supabase';

export const NotificationService = {
  // Send notification for work readiness assignment
  async sendWorkReadinessNotification(
    workerId: string,
    teamLeaderId: string,
    assignmentId: string,
    dueTime: string,
    notes?: string
  ) {
    try {
      const { error } = await dataClient
        .from('notifications')
        .insert({
          recipient_id: workerId,
          sender_id: teamLeaderId,
          type: 'case_assignment', // Fixed: use 'case_assignment' instead of 'case_assigned'
          title: 'New Work Readiness Assignment',
          message: `You have been assigned to complete a work readiness assessment. Due within 24 hours (${new Date(dueTime).toLocaleString()}).${notes ? ` Note: ${notes}` : ''}`,
          priority: 'high',
          metadata: {
            assignment_id: assignmentId,
            due_time: dueTime,
            task_type: 'work_readiness'
          }
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending work readiness notification:', error);
      return false;
    }
  },

  // Send notification for case assignment
  async sendCaseAssignmentNotification(
    clinicianId: string,
    caseManagerId: string,
    caseId: string
  ) {
    try {
      console.log('🔔 Creating case assignment notification...');
      console.log('Clinician ID:', clinicianId);
      console.log('Case Manager ID:', caseManagerId);
      console.log('Case ID:', caseId);

      const { data, error } = await dataClient
        .from('notifications')
        .insert({
          recipient_id: clinicianId,
          sender_id: caseManagerId,
          type: 'case_assignment', // Fixed: use 'case_assignment' instead of 'case_assigned'
          title: 'New Case Assigned',
          message: `A new case has been assigned to you. Case ID: ${caseId}`,
          priority: 'high',
          metadata: {
            case_id: caseId,
            task_type: 'case_assignment'
          },
          is_read: false,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('❌ Error creating case assignment notification:', error);
        throw error;
      }

      console.log('✅ Case assignment notification created successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error sending case assignment notification:', error);
      return false;
    }
  },

  // Send notification for case updates
  async sendCaseUpdateNotification(
    recipientId: string,
    senderId: string,
    caseId: string,
    status: string,
    notes?: string
  ) {
    try {
      const { error } = await dataClient
        .from('notifications')
        .insert({
          recipient_id: recipientId,
          sender_id: senderId,
          type: 'case_assignment', // Fixed: use 'case_assignment' instead of 'case_assigned'
          title: 'Case Update',
          message: `Case status updated to: ${status}${notes ? `. Notes: ${notes}` : ''}`,
          priority: 'medium',
          metadata: {
            case_id: caseId,
            status: status,
            task_type: 'case_update'
          }
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending case update notification:', error);
      return false;
    }
  },
  async fetchNotifications(userId: string) {
    try {
      const { data, error } = await dataClient
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
  },

  async fetchUnreadCount(userId: string) {
    try {
      const { data, error } = await dataClient
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
  },

  async markAsRead(notificationId: string) {
    try {
      const { error } = await dataClient
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
  },

  async markAllAsRead(userId: string) {
    try {
      const { error } = await dataClient
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
  },

  async subscribeToNotifications(userId: string, onNewNotification: (notification: any) => void) {
    return dataClient
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          onNewNotification(payload.new);
        }
      )
      .subscribe();
  }
};

export default NotificationService;