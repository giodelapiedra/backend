import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Assignment,
  Timeline,
} from '@mui/icons-material';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsListProps {
  notifications: Notification[];
  unreadCount: number;
}

/**
 * Sanitize notification content to prevent XSS
 * Note: For production, install and use DOMPurify
 */
const sanitizeText = (text: string): string => {
  if (!text) return '';
  
  // Remove HTML tags and escape special characters
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const NotificationsList: React.FC<NotificationsListProps> = React.memo(({
  notifications,
  unreadCount,
}) => {
  return (
    <Card sx={{ 
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      borderRadius: 2
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
            Recent Notifications
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} unread`}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Timeline sx={{ fontSize: 48, color: '#a0aec0', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#718096', mb: 1 }}>
              No notifications
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0aec0' }}>
              You'll receive notifications for new case assignments
            </Typography>
          </Box>
        ) : (
          <List>
            {notifications.slice(0, 5).map((notification) => (
              <ListItem key={notification.id} sx={{ px: 0 }}>
                <ListItemIcon>
                  <Avatar sx={{ 
                    width: 32, 
                    height: 32, 
                    backgroundColor: notification.is_read ? '#e2e8f0' : '#667eea',
                    color: notification.is_read ? '#718096' : 'white'
                  }}>
                    {notification.is_read ? <CheckCircle /> : <Assignment />}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ 
                      fontWeight: notification.is_read ? 400 : 600,
                      color: notification.is_read ? '#718096' : '#2d3748'
                    }}>
                      {sanitizeText(notification.title)}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ color: '#718096', mb: 0.5 }}>
                        {sanitizeText(notification.message)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                        {new Date(notification.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
});

NotificationsList.displayName = 'NotificationsList';

export default NotificationsList;

