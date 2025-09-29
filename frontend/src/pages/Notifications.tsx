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
} from '@mui/icons-material';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import api from '../utils/api';
import { createImageProps } from '../utils/imageUtils';
import '../styles/print.css';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  actionUrl?: string;
}

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  priority: string;
  createdAt: string;
  injuryDetails: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  incident?: {
    incidentNumber: string;
    incidentDate: string;
    description: string;
    severity: string;
    incidentType: string;
    photos?: Array<{
      url: string;
      caption: string;
      uploadedAt: string;
    }>;
  };
}

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Case viewing state
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseDetailDialog, setCaseDetailDialog] = useState(false);
  const [loadingCase, setLoadingCase] = useState(false);


  useEffect(() => {
    fetchNotifications();
    
    // Completely disable all notification polling to stop repeated requests
    // TODO: Re-enable with proper SSE authentication later
  }, []);

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
      const notificationDate = new Date(notification.createdAt);
      
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
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
    } catch (err: any) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Handle case viewing
  const handleViewCase = async (actionUrl: string) => {
    try {
      setLoadingCase(true);
      // Extract case ID from actionUrl (assuming format like /cases/123)
      const caseId = actionUrl.split('/').pop();
      if (caseId) {
        const response = await api.get(`/cases/${caseId}`);
        setSelectedCase(response.data.case);
        setCaseDetailDialog(true);
      }
    } catch (error) {
      console.error('Error fetching case details:', error);
    } finally {
      setLoadingCase(false);
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
                <div class="info-value">${selectedCase?.worker.firstName} ${selectedCase?.worker.lastName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Email Address</div>
                <div class="info-value">${selectedCase?.worker.email}</div>
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
            <span class="badge ${selectedCase?.priority}">${selectedCase?.priority?.toUpperCase() || 'UNKNOWN'}</span>
          </div>
        </div>
        
        <div class="section">
          <h3>Injury Details</h3>
          <div class="injury-details">
            <div class="info-item">
              <div class="info-label">Body Part & Injury Type</div>
              <div class="info-value">${selectedCase?.injuryDetails.bodyPart} - ${selectedCase?.injuryDetails.injuryType}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Severity Level</div>
              <div class="info-value">${selectedCase?.injuryDetails.severity?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Description</div>
              <div class="info-value">${selectedCase?.injuryDetails.description || 'No description provided'}</div>
            </div>
          </div>
        </div>
        
        ${selectedCase?.incident ? `
        <div class="section">
          <h3>Incident Information</h3>
          <div class="incident-details">
            <div class="info-item">
              <div class="info-label">Incident Number</div>
              <div class="info-value">${selectedCase.incident.incidentNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Incident Date</div>
              <div class="info-value">${new Date(selectedCase.incident.incidentDate).toLocaleDateString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Incident Type</div>
              <div class="info-value">${selectedCase.incident.incidentType?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Severity</div>
              <div class="info-value">${selectedCase.incident.severity?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Description</div>
              <div class="info-value">${selectedCase.incident.description || 'No description provided'}</div>
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

  // Notification Item Component
  const NotificationItem: React.FC<{
    notification: Notification;
    onMarkAsRead: (id: string) => void;
    onDelete: (id: string) => void;
    getTimeAgo: (dateString: string) => string;
  }> = ({ notification, onMarkAsRead, onDelete, getTimeAgo }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleOptionsClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleOptionsClose = () => {
      setAnchorEl(null);
    };

    return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: notification.isRead ? 'transparent' : '#f8f9fa',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        border: '1px solid transparent',
        '&:hover': {
          backgroundColor: notification.isRead ? '#f8f9fa' : '#f1f3f4',
          borderColor: '#e5e7eb'
        }
      }}
    >
      {/* User Avatar */}
      <Box sx={{ marginRight: '16px', position: 'relative' }}>
        {notification.sender.profileImage ? (
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
            {notification.sender.firstName.charAt(0)}{notification.sender.lastName.charAt(0)}
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
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
            fontWeight: notification.isRead ? 500 : 600,
            color: notification.isRead ? '#6b7280' : '#111827',
            marginBottom: '4px',
            fontSize: '0.875rem',
            lineHeight: 1.4
          }}
        >
          {notification.title}
        </Typography>
        
        <Typography
          variant="body2"
          sx={{
            color: notification.isRead ? '#9ca3af' : '#6b7280',
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
          {getTimeAgo(notification.createdAt)}
        </Typography>
      </Box>

      {/* Status and Options */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Unread Indicator */}
        {!notification.isRead && (
          <Box
            sx={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#9c27b0',
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
        <MenuItem
          onClick={() => {
            onMarkAsRead(notification._id);
            handleOptionsClose();
          }}
          sx={{ fontSize: '0.875rem' }}
        >
          <MarkEmailRead sx={{ mr: 1, fontSize: '1rem' }} />
          Mark as Read
        </MenuItem>
        <MenuItem
          onClick={() => {
            onDelete(notification._id);
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

  const unreadCount = notifications.filter(n => !n.isRead).length;
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
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
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
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
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
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
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
                          {selectedCase.worker.firstName} {selectedCase.worker.lastName}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                          {selectedCase.worker.email}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Chip 
                            icon={<Assignment />}
                            label={selectedCase.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                            color={getPriorityColor(selectedCase.status)}
                            variant="filled"
                            sx={{ fontWeight: 600 }}
                          />
                          <Chip 
                            icon={<Warning />}
                            label={selectedCase.priority?.toUpperCase() || 'UNKNOWN'}
                            color={getPriorityColor(selectedCase.priority)}
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
                            {new Date(selectedCase.createdAt).toLocaleDateString()}
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
                        
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                            Injury Details
                          </Typography>
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: '#f8fafc', 
                            borderRadius: 2,
                            border: '1px solid #e2e8f0'
                          }}>
                            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                              {selectedCase.injuryDetails.bodyPart} - {selectedCase.injuryDetails.injuryType}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {selectedCase.injuryDetails.description}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                            Severity Level
                          </Typography>
                          <Chip 
                            label={selectedCase.injuryDetails.severity?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                            color={getPriorityColor(selectedCase.injuryDetails.severity)}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
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
                                {selectedCase.incident.incidentNumber}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                <CalendarToday sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                {new Date(selectedCase.incident.incidentDate).toLocaleDateString()}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <Description sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                {selectedCase.incident.description}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                              Incident Classification
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip 
                                label={selectedCase.incident.incidentType?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                color="info"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                              <Chip 
                                label={selectedCase.incident.severity?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                color={getPriorityColor(selectedCase.incident.severity)}
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
                        Incident Photos ({selectedCase.incident.photos.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {selectedCase.incident.photos.map((photo, index) => (
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
      </Box>
    </LayoutWithSidebar>
  );
};

export default NotificationsPage;

