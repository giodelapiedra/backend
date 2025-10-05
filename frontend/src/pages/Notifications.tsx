import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Notifications,
  LocalHospital,
  Work,
  Assessment,
  CheckCircle,
  Warning,
  Info,
  Delete,
  MarkEmailRead,
  Visibility,
  Assignment,
  Person,
  PhotoCamera,
  Print,
  Close,
  CalendarToday,
  Description,
  Image as ImageIcon,
  VideoCall,
  MoreVert,
  Refresh,
} from '@mui/icons-material';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { dataClient } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext.supabase';
import { createImageProps } from '../utils/imageUtils';
import { useGetCaseByIdQuery } from '../store/api/casesApi';
import '../styles/print.css';

// Add CSS animations for high severity notifications
const highSeverityStyles = `
  @keyframes pulse {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.05);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = highSeverityStyles;
  document.head.appendChild(styleSheet);
}

interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  severity?: string;
  priority?: string;
  sender?: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  related_incident_id?: string;
  related_case_id?: string;
}

interface Case {
  id?: string;
  _id?: string;
  case_number?: string;
  caseNumber?: string;
  worker_id?: string;
  employer_id?: string;
  case_manager_id?: string;
  status?: string;
  priority?: string;
  injury_type?: string;
  created_at?: string;
  createdAt?: string;
  incident_id?: string;
  worker?: {
    id?: string;
    _id?: string;
    first_name?: string;
    firstName?: string;
    last_name?: string;
    lastName?: string;
    email?: string;
  };
  case_manager?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  incident?: {
    id?: string;
    incident_type?: string;
    incidentType?: string;
    severity?: string;
    description?: string;
    reported_by?: string;
    incidentNumber?: string;
    incidentDate?: string;
    photos?: Array<{
      url: string;
      caption: string;
      uploadedAt: string;
    }>;
  };
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Case viewing state
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseDetailDialog, setCaseDetailDialog] = useState(false);
  const [loadingCase, setLoadingCase] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [incidentDetailDialog, setIncidentDetailDialog] = useState(false);
  const [loadingIncident, setLoadingIncident] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id]);

  // Add real-time subscription for notifications
  useEffect(() => {
    if (!user?.id) return;

    const subscription = dataClient
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          // Refresh notifications when new one is added
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification updated:', payload);
          // Refresh notifications when one is updated
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Add window focus listener to refresh notifications
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id) {
        fetchNotifications();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id]);

  // Helper function to categorize notifications by time
  const categorizeNotificationsByTime = (notifications: Notification[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const categorized = {
      today: [] as Notification[],
      yesterday: [] as Notification[],
      older: [] as Notification[]
    };

    notifications.forEach(notification => {
      const notificationDate = new Date(notification.created_at);
      
      if (notificationDate >= today) {
        categorized.today.push(notification);
      } else if (notificationDate >= yesterday) {
        categorized.yesterday.push(notification);
      } else {
        categorized.older.push(notification);
      }
    });

    return categorized;
  };

  // Helper function to format time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };


  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      console.log('Fetching notifications for user:', user.id);
      console.log('User email:', user.email);

      const { data: notificationsData, error: notificationsError } = await dataClient
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        throw notificationsError;
      }

      console.log('Fetched notifications:', notificationsData);
      console.log('Total notifications found:', notificationsData?.length || 0);

      setNotifications(notificationsData || []);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      console.log('🔄 Marking notification as read:', notificationId);

      const { error: updateError } = await dataClient
        .from('notifications')
        .update({ 
          is_read: true
        })
        .eq('id', notificationId);

      if (updateError) {
        throw updateError;
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );

      // Trigger global notification refresh event
      console.log('📢 Triggering global notification refresh for single notification...');
      const refreshEvent = new CustomEvent('notificationsMarkedAsRead', {
        detail: { 
          userId: user?.id,
          notificationId: notificationId,
          timestamp: Date.now(),
          allRead: false
        }
      });
      window.dispatchEvent(refreshEvent);

      console.log('✅ Notification marked as read and cache cleared');
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!user?.id) return;

      console.log('🔄 Marking all notifications as read...');

      const { error: updateError } = await dataClient
        .from('notifications')
        .update({ 
          is_read: true
        })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (updateError) {
        throw updateError;
      }

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );

      // Trigger global notification refresh event
      console.log('📢 Triggering global notification refresh...');
      const refreshEvent = new CustomEvent('notificationsMarkedAsRead', {
        detail: { 
          userId: user.id,
          timestamp: Date.now(),
          allRead: true
        }
      });
      window.dispatchEvent(refreshEvent);

      // Clear browser cache for notifications
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('🧹 Browser cache cleared for notifications');
      }

      // Clear localStorage cache
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('rtk') || key.includes('cache') || key.includes('supabase') || key.includes('notification'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log('✅ All notifications marked as read and cache cleared');
    } catch (err: any) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error: deleteError } = await dataClient
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) {
        throw deleteError;
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Handle case viewing
  const handleViewCase = async (notification: Notification) => {
    try {
      setLoadingCase(true);
      
      // Try to get case ID from notification
      let caseId = notification.related_case_id;
      
      if (!caseId && notification.related_incident_id) {
        // Get case ID from incident
        const { data: caseData, error: caseError } = await dataClient
          .from('cases')
          .select('id')
          .eq('incident_id', notification.related_incident_id)
          .single();
        
        if (!caseError && caseData) {
          caseId = caseData.id;
        }
      }
      
      if (!caseId) {
        // Try to extract case number from message
        const caseNumberMatch = notification.message.match(/Case:\s*([A-Z0-9-]+)/i);
        if (caseNumberMatch) {
          const caseNumber = caseNumberMatch[1];
          const { data: caseData, error: caseError } = await dataClient
            .from('cases')
            .select('id')
            .eq('case_number', caseNumber)
            .single();
          
          if (!caseError && caseData) {
            caseId = caseData.id;
          }
        }
      }
      
      if (caseId) {
        const { data, error } = await dataClient
          .from('cases')
          .select(`
            *,
            worker:users!worker_id(id, first_name, last_name, email),
            case_manager:users!case_manager_id(id, first_name, last_name, email),
            incident:incidents!incident_id(id, severity, incident_type, description, reported_by)
          `)
          .eq('id', caseId)
          .single();
        
        if (error) throw error;
        console.log('Case data loaded:', data);
        console.log('Incident data:', data.incident);
        setSelectedCase(data);
        setCaseDetailDialog(true);
      } else {
        console.error('Could not find case ID for notification');
        alert('Case details not available');
      }
    } catch (error) {
      console.error('Error fetching case details:', error);
      alert('Error loading case details');
    } finally {
      setLoadingCase(false);
    }
  };

  // Handle incident viewing
  const handleViewIncident = async (notification: Notification) => {
    try {
      setLoadingIncident(true);
      
      // Try to get incident ID from notification message or case
      let incidentId = notification.related_incident_id;
      
      if (!incidentId && notification.related_case_id) {
        // Get incident ID from case
        const { data: caseData, error: caseError } = await dataClient
          .from('cases')
          .select('incident_id')
          .eq('id', notification.related_case_id)
          .single();
        
        if (!caseError && caseData) {
          incidentId = caseData.incident_id;
        }
      }
      
      if (!incidentId) {
        // Try to extract from message or find by description
        const { data: incidents, error: incidentError } = await dataClient
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!incidentError && incidents) {
          // Find incident that matches the notification time and type
          const matchingIncident = incidents.find(incident => 
            incident.severity === notification.severity &&
            Math.abs(new Date(incident.created_at).getTime() - new Date(notification.created_at).getTime()) < 60000 // Within 1 minute
          );
          
          if (matchingIncident) {
            incidentId = matchingIncident.id;
          }
        }
      }
      
      if (incidentId) {
        const { data, error } = await dataClient
          .from('incidents')
          .select(`
            *,
            reported_by_user:users!reported_by(id, first_name, last_name, email)
          `)
          .eq('id', incidentId)
          .single();
        
        if (error) throw error;
        setSelectedIncident(data);
        setIncidentDetailDialog(true);
      } else {
        console.error('Could not find incident ID for notification');
        alert('Incident details not available');
      }
    } catch (error) {
      console.error('Error fetching incident details:', error);
      alert('Error loading incident details');
    } finally {
      setLoadingIncident(false);
    }
  };

  // Handle print functionality
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      alert('Please allow popups to print the case details');
      return;
    }

    // Get the case details content
    const caseContent = document.querySelector('.case-details-content');
    if (!caseContent) {
      printWindow.close();
      return;
    }

    // Create professional print layout
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Case Details - ${selectedCase?.caseNumber}</title>
        <meta charset="utf-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1.7;
            color: #2c3e50;
            background: white;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 0;
            border-bottom: 3px solid #34495e;
          }
          
          .print-header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          
          .print-header h2 {
            font-size: 18px;
            color: #7f8c8d;
            font-weight: 400;
            letter-spacing: 2px;
          }
          
          .print-timestamp {
            text-align: right;
            margin-bottom: 30px;
            font-size: 11px;
            color: #95a5a6;
            font-style: italic;
          }
          
          .case-summary {
            background: #ecf0f1;
            border-left: 5px solid #3498db;
            padding: 30px;
            margin-bottom: 35px;
            border-radius: 0 8px 8px 0;
          }
          
          .case-summary h3 {
            color: #2c3e50;
            font-size: 22px;
            margin-bottom: 20px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-bottom: 25px;
          }
          
          .info-item {
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 1px dotted #bdc3c7;
          }
          
          .info-label {
            font-weight: 700;
            color: #34495e;
            margin-bottom: 6px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-value {
            color: #2c3e50;
            font-size: 16px;
            font-weight: 500;
          }
          
          .status-badges {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 20px;
            justify-content: center;
          }
          
          .badge {
            background: #ecf0f1;
            color: #2c3e50;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            border: 2px solid #bdc3c7;
            letter-spacing: 1px;
          }
          
          .badge.high { background: #f39c12; color: white; border-color: #e67e22; }
          .badge.urgent { background: #e74c3c; color: white; border-color: #c0392b; }
          .badge.medium { background: #3498db; color: white; border-color: #2980b9; }
          .badge.low { background: #27ae60; color: white; border-color: #229954; }
          .badge.new { background: #9b59b6; color: white; border-color: #8e44ad; }
          .badge.triaged { background: #f39c12; color: white; border-color: #e67e22; }
          .badge.assessed { background: #3498db; color: white; border-color: #2980b9; }
          .badge.in_rehab { background: #e67e22; color: white; border-color: #d35400; }
          .badge.return_to_work { background: #27ae60; color: white; border-color: #229954; }
          .badge.closed { background: #95a5a6; color: white; border-color: #7f8c8d; }
          
          .section {
            margin-bottom: 35px;
            page-break-inside: avoid;
          }
          
          .section h3 {
            color: #2c3e50;
            font-size: 20px;
            margin-bottom: 20px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 2px solid #34495e;
            padding-bottom: 10px;
          }
          
          .injury-details {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 25px;
          }
          
          .incident-details {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 25px;
          }
          
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            font-style: italic;
          }
          
          @media print {
            body { 
              padding: 20px; 
              font-size: 14px;
            }
            .print-header { margin-bottom: 25px; }
            .section { margin-bottom: 25px; }
            .info-grid { grid-template-columns: 1fr; gap: 15px; }
            .case-summary, .injury-details, .incident-details {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-timestamp">
          Generated on: ${new Date().toLocaleString()}
        </div>
        
        <div class="print-header">
          <h1>Case Details Report</h1>
          <h2>${selectedCase?.caseNumber}</h2>
        </div>
        
        <div class="case-summary">
          <h3>Case Summary</h3>
          <div class="info-grid">
            <div>
              <div class="info-item">
                <div class="info-label">Worker Name</div>
                <div class="info-value">${selectedCase?.worker?.firstName || selectedCase?.worker?.first_name || 'N/A'} ${selectedCase?.worker?.lastName || selectedCase?.worker?.last_name || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email Address</div>
                <div class="info-value">${selectedCase?.worker?.email || 'N/A'}</div>
              </div>
            </div>
            <div>
              <div class="info-item">
                <div class="info-label">Case Created</div>
                <div class="info-value">${new Date(selectedCase?.createdAt || '').toLocaleDateString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Current Status</div>
                <div class="info-value">${selectedCase?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</div>
              </div>
            </div>
          </div>
          <div class="status-badges">
            <span class="badge ${selectedCase?.status}">${selectedCase?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</span>
            <span class="badge ${selectedCase?.incident?.severity}">${selectedCase?.incident?.severity?.toUpperCase() || 'UNKNOWN'}</span>
          </div>
        </div>
        
        <div class="section">
          <h3>Case Information</h3>
          <div class="case-details">
            <div class="info-item">
              <div class="info-label">Case Number</div>
              <div class="info-value">${selectedCase?.case_number || selectedCase?.caseNumber || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status</div>
              <div class="info-value">${selectedCase?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</div>
            </div>
            ${selectedCase?.injury_type ? `
            <div class="info-item">
              <div class="info-label">Injury Type</div>
              <div class="info-value">${selectedCase.injury_type}</div>
            </div>
            ` : ''}
          </div>
        </div>
        
        ${selectedCase?.incident ? `
        <div class="section">
          <h3>Incident Information</h3>
          <div class="incident-details">
            <div class="info-item">
              <div class="info-label">Incident Number</div>
              <div class="info-value">${selectedCase.incident?.id || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Incident Date</div>
              <div class="info-value">${selectedCase.incident?.incidentDate ? new Date(selectedCase.incident.incidentDate).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Incident Type</div>
              <div class="info-value">${selectedCase.incident?.incident_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Severity</div>
              <div class="info-value">${selectedCase.incident?.severity?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Description</div>
              <div class="info-value">${selectedCase.incident?.description || 'No description provided'}</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>This document was generated automatically by the Case Management System</p>
          <p>For official use only - Confidential Document</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'high_pain':
        return <LocalHospital sx={{ color: '#ef4444' }} />;
      case 'rtw_review':
        return <Work sx={{ color: '#f59e0b' }} />;
      case 'case_created':
        return <Assessment sx={{ color: '#3b82f6' }} />;
      case 'case_closed':
        return <CheckCircle sx={{ color: '#22c55e' }} />;
      case 'return_to_work':
        return <Work sx={{ color: '#f59e0b' }} />;
      case 'case_assigned':
        return <Assignment sx={{ color: '#3b82f6' }} />;
      case 'incident_reported':
        return <Warning sx={{ color: '#f59e0b' }} />;
    case 'zoom_meeting_scheduled':
      return <VideoCall sx={{ color: '#2D8CFF' }} />;
    case 'appointment_reminder':
      return <CalendarToday sx={{ color: '#f59e0b' }} />;
    case 'zoom_meeting_reminder':
      return <VideoCall sx={{ color: '#f59e0b' }} />;
    case 'appointment_scheduled':
      return <CalendarToday sx={{ color: '#3b82f6' }} />;
      default:
        return <Info sx={{ color: '#6b7280' }} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const isHighSeverity = (notification: Notification) => {
    // Check direct severity field - only high severity levels
    if (notification.severity === 'medical_treatment' || 
        notification.severity === 'lost_time' || 
        notification.severity === 'fatality') {
      return true;
    }

    // Check priority field - only high/urgent priority
    if (notification.priority === 'high' || notification.priority === 'urgent') {
      return true;
    }

    // Check message content for high severity keywords only
    const highSeverityKeywords = ['medical_treatment', 'lost_time', 'fatality', 'high', 'urgent', 'critical'];
    const messageLower = notification.message.toLowerCase();
    if (highSeverityKeywords.some(keyword => messageLower.includes(keyword))) {
      return true;
    }

    // Only return true for actual high severity cases
    return false;
  };

  // Notification Item Component
  const NotificationItem: React.FC<{
    notification: Notification;
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
    onViewIncident: (notification: Notification) => void;
    onViewCase: (notification: Notification) => void;
    getTimeAgo: (dateString: string) => string;
  }> = ({ notification, onMarkAsRead, onDelete, onViewIncident, onViewCase, getTimeAgo }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOptionsClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleOptionsClose = () => {
      setAnchorEl(null);
    };

    const isHigh = isHighSeverity(notification);
    
    return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: isHigh 
          ? (notification.is_read ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.1)')
          : (notification.is_read ? 'transparent' : '#f8f9fa'),
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        border: isHigh 
          ? `2px solid ${notification.is_read ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.5)'}`
          : '1px solid transparent',
        position: 'relative',
        '&:hover': {
          backgroundColor: isHigh 
            ? (notification.is_read ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)')
            : (notification.is_read ? '#f8f9fa' : '#f1f3f4'),
          borderColor: isHigh ? 'rgba(239, 68, 68, 0.7)' : '#e5e7eb',
          transform: isHigh ? 'translateY(-1px)' : 'none',
          boxShadow: isHigh ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none'
        },
        ...(isHigh && !notification.is_read && {
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #ef4444, #dc2626, #b91c1c)',
            borderRadius: '12px 12px 0 0',
            animation: 'pulse 2s infinite'
          }
        })
      }}
    >
      {/* User Avatar */}
      <Box sx={{ marginRight: '16px', position: 'relative' }}>
        {notification.sender?.profileImage ? (
          <img
            {...createImageProps(notification.sender.profileImage)}
            alt={`${notification.sender.firstName} ${notification.sender.lastName}`}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Avatar
            sx={{
              width: '48px',
              height: '48px',
              backgroundColor: '#7B68EE',
              fontSize: '1.25rem',
              fontWeight: '600',
            }}
          >
            {notification.sender ? `${notification.sender.firstName.charAt(0)}${notification.sender.lastName.charAt(0)}` : 'N'}
          </Avatar>
        )}
        
        {/* Notification Type Icon Overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: isHigh ? '#ef4444' : 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${isHigh ? '#dc2626' : 'white'}`,
            boxShadow: isHigh 
              ? '0 2px 8px rgba(239, 68, 68, 0.4)' 
              : '0 2px 4px rgba(0,0,0,0.1)',
            ...(isHigh && !notification.is_read && {
              animation: 'pulse 1.5s infinite'
            })
          }}
        >
          {getNotificationIcon(notification.type)}
        </Box>
      </Box>

      {/* Notification Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: notification.is_read ? 500 : 600,
            color: isHigh 
              ? (notification.is_read ? '#dc2626' : '#b91c1c')
              : (notification.is_read ? '#6b7280' : '#111827'),
            marginBottom: '4px',
            fontSize: isHigh ? '0.9rem' : '0.875rem',
            lineHeight: 1.4,
            ...(isHigh && !notification.is_read && {
              textShadow: '0 1px 2px rgba(239, 68, 68, 0.1)'
            })
          }}
        >
          {isHigh && !notification.is_read && '🚨 '}{notification.title}
        </Typography>
        
        <Typography
          variant="body2"
          sx={{
            color: notification.is_read ? '#9ca3af' : '#6b7280',
            fontSize: '0.75rem',
            lineHeight: 1.4,
            marginBottom: '4px'
          }}
        >
          {notification.message}
        </Typography>
        
        <Typography
          variant="caption"
          sx={{
            color: '#9ca3af',
            fontSize: '0.75rem'
          }}
        >
          {getTimeAgo(notification.created_at)}
        </Typography>
      </Box>

      {/* Status and Options */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Unread Indicator */}
        {!notification.is_read && (
          <Box
            sx={{
              width: isHigh ? '12px' : '8px',
              height: isHigh ? '12px' : '8px',
              borderRadius: '50%',
              backgroundColor: isHigh ? '#ef4444' : '#9c27b0',
              ...(isHigh && {
                animation: 'pulse 1s infinite',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
              })
            }}
          />
        )}
        
        {/* Options Menu */}
        <IconButton
          size="small"
          onClick={handleOptionsClick}
          sx={{
            color: '#6b7280',
            '&:hover': {
              backgroundColor: '#f3f4f6',
              color: '#374151'
            }
          }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>

      {/* Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleOptionsClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e5e7eb'
          }
        }}
      >
        {(notification.type === 'incident_reported' || notification.type === 'incident_case_created') && (
          <MenuItem
            onClick={() => {
              onViewIncident(notification);
              handleOptionsClose();
            }}
            sx={{ fontSize: '0.875rem' }}
          >
            <Warning sx={{ mr: 1, fontSize: '1rem' }} />
            View Incident Details
          </MenuItem>
        )}
        {(notification.type === 'incident_reported' || notification.type === 'incident_case_created' || notification.message.includes('Case:')) && (
          <MenuItem
            onClick={() => {
              onViewCase(notification);
              handleOptionsClose();
            }}
            sx={{ fontSize: '0.875rem' }}
          >
            <Assignment sx={{ mr: 1, fontSize: '1rem' }} />
            View Case Details
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            onMarkAsRead(notification.id);
            handleOptionsClose();
          }}
          sx={{ fontSize: '0.875rem' }}
        >
          <MarkEmailRead sx={{ mr: 1, fontSize: '1rem' }} />
          Mark as Read
        </MenuItem>
        <MenuItem
          onClick={() => {
            onDelete(notification.id);
            handleOptionsClose();
          }}
          sx={{ fontSize: '0.875rem', color: '#dc2626' }}
        >
          <Delete sx={{ mr: 1, fontSize: '1rem' }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const categorizedNotifications = categorizeNotificationsByTime(notifications);

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ p: 3, maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1, color: '#1f2937' }}>
              Notifications
            </Typography>
            <Typography variant="body1" sx={{ color: '#6b7280' }}>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All notifications read'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchNotifications}
              sx={{ 
                borderRadius: 2,
                borderColor: '#d1d5db',
                color: '#374151',
                '&:hover': {
                  borderColor: '#9ca3af',
                  backgroundColor: '#f9fafb'
                }
              }}
            >
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outlined"
                startIcon={<MarkEmailRead />}
                onClick={markAllAsRead}
                sx={{ 
                  borderRadius: 2,
                  borderColor: '#d1d5db',
                  color: '#374151',
                  '&:hover': {
                    borderColor: '#9ca3af',
                    backgroundColor: '#f9fafb'
                  }
                }}
              >
                Mark All as Read
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Notifications sx={{ fontSize: 64, color: '#e5e7eb', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1, color: '#6b7280' }}>
                No notifications yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                You'll see important updates and alerts here
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box>
            {/* TODAY Section */}
            {categorizedNotifications.today.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: '#374151', 
                  mb: 2, 
                  textTransform: 'uppercase',
                  fontSize: '0.875rem',
                  letterSpacing: '0.5px'
                }}>
                  TODAY
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {categorizedNotifications.today.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                      onViewIncident={handleViewIncident}
                      onViewCase={handleViewCase}
                      getTimeAgo={getTimeAgo}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* YESTERDAY Section */}
            {categorizedNotifications.yesterday.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: '#374151', 
                  mb: 2, 
                  textTransform: 'uppercase',
                  fontSize: '0.875rem',
                  letterSpacing: '0.5px'
                }}>
                  YESTERDAY
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {categorizedNotifications.yesterday.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                      onViewIncident={handleViewIncident}
                      onViewCase={handleViewCase}
                      getTimeAgo={getTimeAgo}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* OLDER Section */}
            {categorizedNotifications.older.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: '#374151', 
                  mb: 2, 
                  textTransform: 'uppercase',
                  fontSize: '0.875rem',
                  letterSpacing: '0.5px'
                }}>
                  OLDER
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {categorizedNotifications.older.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                      onViewIncident={handleViewIncident}
                      onViewCase={handleViewCase}
                      getTimeAgo={getTimeAgo}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}


        {/* Enhanced Case Detail Dialog */}
        <Dialog 
          open={caseDetailDialog} 
          onClose={() => setCaseDetailDialog(false)} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            p: 3
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  📋 Case Details
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  {selectedCase?.caseNumber}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Print />}
                  onClick={handlePrint}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.3)'
                    }
                  }}
                >
                  Print
                </Button>
                <IconButton
                  onClick={() => setCaseDetailDialog(false)}
                  sx={{ color: 'white' }}
                >
                  <Close />
                </IconButton>
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            {loadingCase ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <Box textAlign="center">
                  <CircularProgress size={60} sx={{ color: '#667eea', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Loading case details...
                  </Typography>
                </Box>
              </Box>
            ) : selectedCase ? (
              <Box className="case-details-content" sx={{ p: 3 }}>
                {/* Header Summary */}
                <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', border: 'none' }}>
                  <CardContent>
                    <Grid container spacing={3} alignItems="center">
                      <Grid item xs={12} md={8}>
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                          {selectedCase.worker?.firstName || selectedCase.worker?.first_name || 'N/A'} {selectedCase.worker?.lastName || selectedCase.worker?.last_name || 'N/A'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                          {selectedCase.worker?.email || 'N/A'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Chip 
                            icon={<Assignment />}
                            label={selectedCase.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                            color={getPriorityColor(selectedCase.status || 'unknown')}
                            variant="filled"
                            sx={{ fontWeight: 600 }}
                          />
                          <Chip 
                            icon={<Warning />}
                            label={selectedCase.incident?.severity?.toUpperCase() || 'UNKNOWN'}
                            color={getPriorityColor(selectedCase.incident?.severity || 'unknown')}
                            variant="filled"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Case Created
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {new Date(selectedCase.createdAt || selectedCase.created_at || '').toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Grid container spacing={3}>
                  {/* Case Information */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          color: '#1e293b',
                          fontWeight: 600,
                          mb: 3
                        }}>
                          <Assignment sx={{ mr: 1.5, color: '#667eea' }} />
                          Case Information
                        </Typography>
                        
                        {/* Case Information */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                            Case Information
                          </Typography>
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: '#f8fafc', 
                            borderRadius: 2,
                            border: '1px solid #e2e8f0'
                          }}>
                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                              Case Number: {selectedCase.case_number || selectedCase.caseNumber || 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Status: {selectedCase.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                            </Typography>
                            {selectedCase.injury_type && (
                              <Typography variant="body2" color="text.secondary">
                                Injury Type: {selectedCase.injury_type}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Incident Information */}
                  {selectedCase.incident && (
                    <Grid item xs={12} md={6}>
                      <Card sx={{ height: '100%', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" gutterBottom sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            color: '#1e293b',
                            fontWeight: 600,
                            mb: 3
                          }}>
                            <Warning sx={{ mr: 1.5, color: '#f59e0b' }} />
                            Incident Information
                          </Typography>
                          
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                              Incident Details
                            </Typography>
                            <Box sx={{ 
                              p: 2, 
                              backgroundColor: '#fef3c7', 
                              borderRadius: 2,
                              border: '1px solid #fbbf24'
                            }}>
                              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                                Incident ID: {selectedCase.incident.id}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <Description sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                {selectedCase.incident.description || 'No description provided'}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                              Incident Classification
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip 
                                label={selectedCase.incident.incident_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                color="info"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                              <Chip 
                                label={selectedCase.incident.severity?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                color={getPriorityColor(selectedCase.incident.severity || 'unknown')}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>

                {/* Incident Photos */}
                {selectedCase.incident?.photos && selectedCase.incident.photos.length > 0 && (
                  <Card sx={{ mt: 3, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: '#1e293b',
                        fontWeight: 600,
                        mb: 3
                      }}>
                        <PhotoCamera sx={{ mr: 1.5, color: '#10b981' }} />
                        Incident Photos ({selectedCase.incident?.photos?.length || 0})
                      </Typography>
                      <Grid container spacing={2}>
                        {selectedCase.incident?.photos?.map((photo: any, index: number) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card sx={{ 
                              border: '2px solid #e2e8f0',
                              borderRadius: 2,
                              overflow: 'hidden',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                borderColor: '#667eea',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.15)'
                              }
                            }}>
                              <Box sx={{ position: 'relative' }}>
                                <img
                                  {...createImageProps(photo.url)}
                                  alt={photo.caption || `Incident photo ${index + 1}`}
                                  style={{
                                    width: '100%',
                                    height: 200,
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => window.open(createImageProps(photo.url).src, '_blank')}
                                />
                                <Box sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  color: 'white',
                                  borderRadius: 1,
                                  px: 1,
                                  py: 0.5
                                }}>
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {index + 1}
                                  </Typography>
                                </Box>
                              </Box>
                              {photo.caption && (
                                <CardContent sx={{ p: 2 }}>
                                  <Typography variant="body2" color="text.secondary" sx={{ 
                                    fontSize: '0.875rem',
                                    lineHeight: 1.4
                                  }}>
                                    {photo.caption}
                                  </Typography>
                                </CardContent>
                              )}
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                )}
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Alert severity="error">
                  Failed to load case details
                </Alert>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, backgroundColor: '#f8fafc' }}>
            <Button
              onClick={() => setCaseDetailDialog(false)}
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 600
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Incident Detail Dialog */}
        <Dialog
          open={incidentDetailDialog}
          onClose={() => setIncidentDetailDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <DialogTitle sx={{ 
            p: 3, 
            backgroundColor: '#f8fafc', 
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Warning color="warning" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                Incident Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Complete incident information and reporting details
              </Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            {loadingIncident ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress size={40} />
              </Box>
            ) : selectedIncident ? (
              <Box className="incident-details-content" sx={{ p: 3 }}>
                {/* Incident Header */}
                <Card sx={{ mb: 3, border: '1px solid #e5e7eb' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 1 }}>
                          Incident Report
                        </Typography>
                        <Chip
                          label={selectedIncident.incident_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                          color="primary"
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      </Box>
                      <Chip
                        label={selectedIncident.severity?.toUpperCase() || 'UNKNOWN'}
                        color={
                          selectedIncident.severity === 'high' ? 'error' :
                          selectedIncident.severity === 'medium' ? 'warning' : 'success'
                        }
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      <strong>Reported:</strong> {new Date(selectedIncident.created_at).toLocaleString()}
                    </Typography>
                    
                    {selectedIncident.reported_by_user && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        <strong>Reported by:</strong> {selectedIncident.reported_by_user.first_name} {selectedIncident.reported_by_user.last_name}
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* Incident Description */}
                <Card sx={{ mb: 3, border: '1px solid #e5e7eb' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 2 }}>
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      lineHeight: 1.6,
                      color: '#374151',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {selectedIncident.description || 'No description provided'}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Incident Details */}
                <Card sx={{ border: '1px solid #e5e7eb' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 2 }}>
                      Incident Information
                    </Typography>
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Incident Type
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {selectedIncident.incident_type?.replace('_', ' ').toUpperCase() || 'Not specified'}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Severity Level
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {selectedIncident.severity?.toUpperCase() || 'Not specified'}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Incident ID
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                          {selectedIncident.id}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Date Reported
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {new Date(selectedIncident.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Alert severity="error">
                  Failed to load incident details
                </Alert>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, backgroundColor: '#f8fafc' }}>
            <Button
              onClick={() => setIncidentDetailDialog(false)}
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                px: 3,
                py: 1,
                fontWeight: 600
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default NotificationsPage;


