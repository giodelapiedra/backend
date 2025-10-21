import React from 'react';
import { Card, CardContent, Typography, Box, Chip, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import { Notifications, Circle } from '@mui/icons-material';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsListProps {
  notifications: Notification[];
  unreadCount: number;
}

const NotificationsList: React.FC<NotificationsListProps> = React.memo(({ notifications, unreadCount }) => {
  return (
    <Card sx={{ 
      bgcolor: '#FFFFFF',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      borderRadius: 2,
      mb: 3
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: 2, 
            bgcolor: 'rgba(102, 126, 234, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Notifications sx={{ fontSize: 24, color: '#667eea' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
              Notifications
            </Typography>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              Recent updates and alerts
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Chip 
              label={unreadCount} 
              size="small" 
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              No notifications at this time
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.slice(0, 5).map((notification) => (
              <ListItem 
                key={notification.id} 
                sx={{ 
                  px: 0, 
                  py: 1,
                  borderBottom: '1px solid #f1f5f9',
                  '&:last-child': { borderBottom: 'none' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {!notification.is_read && (
                    <Circle sx={{ fontSize: 8, color: '#667eea' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: notification.is_read ? 400 : 600,
                        color: '#2d3748'
                      }}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="caption" 
                      sx={{ color: '#718096' }}
                    >
                      {new Date(notification.created_at).toLocaleDateString()}
                    </Typography>
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
