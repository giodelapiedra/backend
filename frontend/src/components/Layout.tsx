import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  IconButton,
} from '@mui/material';
  import {
    Notifications,
    AccountCircle,
    Menu as MenuIcon,
  } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.supabase';
import { useSidebar } from '../contexts/SidebarContext';
import { dataClient } from '../lib/supabase';
import NotificationService from '../utils/notificationService';
import { getProfileImageProps } from '../utils/imageUtils';
import ModernSidebar from './ModernSidebar';
import MobileBottomNavigation from './MobileBottomNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { collapsed, toggleCollapsed } = useSidebar();
  
  // Calculate sidebar width based on collapsed state and screen size
  const sidebarWidth = collapsed ? 64 : 240;

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    // Dispatch custom event for admin logout
    window.dispatchEvent(new CustomEvent('adminLogout'));
    navigate('/login');
    handleProfileMenuClose();
  };

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (user?.id) {
        try {
          console.log('Fetching unread notifications for layout badge...');
          const count = await NotificationService.fetchUnreadCount(user.id);
          console.log('Unread notifications count:', count);
          setUnreadNotificationCount(count);
        } catch (err) {
          console.error('Error fetching unread notifications:', err);
        }
      }
    };

    // Listen for global notification refresh events
    const handleNotificationRefresh = (event: CustomEvent) => {
      const { userId, allRead } = event.detail;
      console.log('Layout received notification refresh event:', { userId, allRead });
      
      if (userId === user?.id) {
        console.log('🔄 Refreshing notification badge for current user...');
        fetchUnreadNotifications();
      }
    };

    // Add event listener
    window.addEventListener('notificationsMarkedAsRead', handleNotificationRefresh as EventListener);

    fetchUnreadNotifications();
    
    // Auto-refresh notification count every 30 seconds
    const interval = setInterval(fetchUnreadNotifications, 30000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsMarkedAsRead', handleNotificationRefresh as EventListener);
    };
  }, [user?.id]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Clean Modern AppBar */}
      <AppBar
        position="fixed"
        sx={{
          left: { xs: 0, sm: `${sidebarWidth}px` },
          width: { xs: '100%', sm: `calc(100% - ${sidebarWidth}px)` },
          backgroundColor: '#FFFFFF',
          backdropFilter: 'blur(8px)',
          color: '#111827',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          zIndex: 1200,
          transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <Toolbar sx={{ 
          justifyContent: 'space-between', 
          px: { xs: 2, sm: 3 },
          py: 1,
          minHeight: { xs: '56px', sm: '60px' }
        }}>
          {/* Mobile Menu Button */}
          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <IconButton
              onClick={toggleCollapsed}
              sx={{
                color: '#6B7280',
                '&:hover': {
                  backgroundColor: '#F3F4F6',
                  color: '#4F46E5'
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Right Side Actions */}
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            justifyContent: 'flex-end'
          }}>
            {/* Notifications */}
            <Tooltip title="Notifications" arrow>
              <IconButton
                onClick={() => navigate('/notifications')}
                sx={{
                  color: '#6B7280',
                  '&:hover': {
                    backgroundColor: '#F3F4F6',
                    color: '#4F46E5'
                  }
                }}
              >
                <Badge 
                  badgeContent={unreadNotificationCount} 
                  sx={{ 
                    '& .MuiBadge-badge': {
                      backgroundColor: '#EF4444',
                      color: 'white',
                      fontSize: '0.625rem',
                      fontWeight: 600,
                      minWidth: '16px',
                      height: '16px'
                    }
                  }}
                >
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Profile Menu */}
            <Tooltip title="Account" arrow>
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{
                  p: 0.5,
                  '&:hover': {
                    backgroundColor: '#F3F4F6'
                  }
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    background: user?.profileImage 
                      ? undefined 
                      : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                  src={user?.profileImage}
                  alt={user?.firstName || 'User'}
                >
                  {!user?.profileImage && user?.firstName?.charAt(0)?.toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  minWidth: 220,
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #E5E7EB'
                },
              }}
            >
              <Box sx={{ 
                px: 2.5, 
                py: 2,
                borderBottom: '1px solid #E5E7EB'
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#111827',
                    fontSize: '0.875rem',
                    mb: 0.5
                  }}
                >
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{
                    color: '#6B7280',
                    fontSize: '0.75rem'
                  }}
                >
                  {user?.email}
                </Typography>
              </Box>
              
              <Box sx={{ p: 1 }}>
                <MenuItem 
                  onClick={() => {
                    navigate('/profile');
                    handleProfileMenuClose();
                  }}
                  sx={{
                    borderRadius: '8px',
                    px: 2,
                    py: 1.5,
                    mb: 0.5,
                    '&:hover': {
                      backgroundColor: '#F3F4F6'
                    }
                  }}
                >
                  <AccountCircle sx={{ fontSize: 20, color: '#6B7280', mr: 1.5 }} />
                  <Typography sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#374151'
                  }}>
                    View Profile
                  </Typography>
                </MenuItem>
                
                <MenuItem 
                  onClick={handleLogout}
                  sx={{
                    borderRadius: '8px',
                    px: 2,
                    py: 1.5,
                    '&:hover': {
                      backgroundColor: '#FEE2E2'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '12px' }}>
                      <path d="M16 17L21 12L16 7M21 12H9M9 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H9" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <Typography sx={{ 
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#DC2626'
                    }}>
                      Sign Out
                    </Typography>
                  </Box>
                </MenuItem>
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Modern Sidebar - Connected to Navbar */}
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: 1100,
        display: { xs: collapsed ? 'none' : 'block', sm: 'block' }
      }}>
        <ModernSidebar />
      </Box>

      {/* Mobile Overlay */}
      {!collapsed && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1050,
            display: { xs: 'block', sm: 'none' }
          }}
          onClick={toggleCollapsed}
        />
      )}

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { 
            xs: 0,
            sm: collapsed ? '64px' : '240px'
          },
          transition: 'margin-left 0.2s ease',
          minHeight: '100vh',
          backgroundColor: '#FAFAFA',
          overflowX: 'hidden',
          width: { xs: '100%', sm: `calc(100vw - ${collapsed ? '64px' : '240px'})` },
          maxWidth: { xs: '100%', sm: `calc(100vw - ${collapsed ? '64px' : '240px'})` }
        }}
      >
        {/* Page Content */}
        <Box
          sx={{
            mt: '60px',
            minHeight: 'calc(100vh - 60px)',
            paddingBottom: { xs: '80px', sm: 0 }
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNavigation />
    </Box>
  );
};

export default Layout;