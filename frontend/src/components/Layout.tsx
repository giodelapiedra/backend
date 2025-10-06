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
  const sidebarWidth = collapsed ? 80 : 280;

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
          const { data: notificationsData, error: notificationsError } = await dataClient
            .from('notifications')
            .select('*')
            .eq('recipient_id', user.id)
            .eq('is_read', false);
          
          if (!notificationsError && notificationsData) {
            console.log('Unread notifications count:', notificationsData.length);
            setUnreadNotificationCount(notificationsData.length);
          }
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
      
      {/* Enhanced Professional AppBar */}
      <AppBar
        position="fixed"
        sx={{
          left: { xs: 0, sm: `${sidebarWidth}px` },
          width: { xs: '100%', sm: `calc(100% - ${sidebarWidth}px)` },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          color: '#1a202c',
          borderBottom: '1px solid rgba(229, 231, 235, 0.6)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
          zIndex: 1200,
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, rgba(123, 104, 238, 0.02) 0%, rgba(32, 178, 170, 0.02) 100%)',
            pointerEvents: 'none',
            zIndex: -1
          }
        }}
      >
        <Toolbar sx={{ 
          justifyContent: 'space-between', 
          px: { xs: 2, sm: 3 },
          py: { xs: 1, sm: 1 },
          minHeight: { xs: '56px', sm: '64px' }
        }}>
          {/* Enhanced Mobile Menu Button */}
          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <IconButton
              onClick={toggleCollapsed}
              sx={{
                color: '#7B68EE',
                background: 'rgba(123, 104, 238, 0.08)',
                border: '1px solid rgba(123, 104, 238, 0.15)',
                borderRadius: '12px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  backgroundColor: 'rgba(123, 104, 238, 0.12)',
                  borderColor: 'rgba(123, 104, 238, 0.25)',
                  transform: 'scale(1.05)',
                  boxShadow: '0 2px 6px rgba(123, 104, 238, 0.2)'
                },
                '&:active': {
                  transform: 'scale(0.95)'
                }
              }}
            >
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>


          {/* Enhanced Right Side Actions */}
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 2 }, 
            justifyContent: 'flex-end',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              height: '24px',
              width: '1px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(123, 104, 238, 0.2) 20%, rgba(123, 104, 238, 0.3) 50%, rgba(123, 104, 238, 0.2) 80%, transparent 100%)',
              opacity: 0.6
            }
          }}>
            {/* Enhanced Notifications */}
            <Tooltip title="Notifications" arrow>
              <IconButton
                color="inherit"
                onClick={() => navigate('/notifications')}
                sx={{
                  color: '#6B7280',
                  borderRadius: '12px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'rgba(123, 104, 238, 0.08)',
                    color: '#7B68EE',
                    transform: 'scale(1.05)',
                    boxShadow: '0 2px 6px rgba(123, 104, 238, 0.15)'
                  },
                  '&:active': {
                    transform: 'scale(0.95)'
                  }
                }}
              >
                <Badge 
                  badgeContent={unreadNotificationCount} 
                  sx={{ 
                    '& .MuiBadge-badge': {
                      backgroundColor: '#FF6B6B',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      minWidth: '18px',
                      height: '18px',
                      borderRadius: '9px',
                      boxShadow: '0 2px 4px rgba(255, 107, 107, 0.3)',
                      '&.MuiBadge-anchorOriginTopRightCircle': {
                        transform: 'scale(1) translate(50%, -50%)'
                      }
                    }
                  }}
                >
                  <Notifications sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Enhanced Profile Menu */}
            <Tooltip title="Account settings" arrow>
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{
                  p: 0.5,
                  borderRadius: '12px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'rgba(123, 104, 238, 0.08)',
                    transform: 'scale(1.05)',
                    boxShadow: '0 2px 6px rgba(123, 104, 238, 0.15)'
                  },
                  '&:active': {
                    transform: 'scale(0.95)'
                  }
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      background: user?.profileImage 
                        ? undefined 
                        : 'linear-gradient(135deg, #7B68EE 0%, #5A4FCF 100%)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      border: '2px solid rgba(123, 104, 238, 0.2)',
                      boxShadow: '0 2px 4px rgba(123, 104, 238, 0.15)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    src={user?.profileImage}
                    alt={user?.firstName || 'User'}
                  >
                    {!user?.profileImage && user?.firstName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  
                  {/* Online Status Indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -1,
                      right: -1,
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      border: '2px solid rgba(255, 255, 255, 0.9)',
                      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                      animation: 'pulse-green 2s infinite',
                      '@keyframes pulse-green': {
                        '0%, 100%': {
                          transform: 'Scale(1)',
                          opacity: 1
                        },
                        '50%': {
                          transform: 'Scale(1.05)',
                          opacity: 0.8
                        }
                      }
                    }}
                  />
                </Box>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 200,
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(123, 104, 238, 0.2)',
                  boxShadow: '0 8px 25px rgba(123, 104, 238, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.02) 0%, rgba(32, 178, 170, 0.01) 100%)',
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                    zIndex: -1
                  }
                },
              }}
            >
              <Box sx={{ 
                px: 3, 
                py: 2,
                background: 'rgba(123, 104, 238, 0.04)',
                borderBottom: '1px solid rgba(123, 104, 238, 0.1)'
              }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#1a202c',
                    fontSize: '0.875rem',
                    mb: 0.5
                  }}
                >
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{
                    color: '#6b7280',
                    fontSize: '0.75rem',
                    fontWeight: 400
                  }}
                >
                  {user?.email}
                </Typography>
              </Box>
              
              <Divider sx={{ backgroundColor: 'rgba(123, 104, 238, 0.1)' }} />
              
              <Box sx={{ p: 1 }}>
                <MenuItem 
                  onClick={handleProfileMenuClose}
                  sx={{
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    mx: 0.5,
                    mb: 0.5,
                    '&:hover': {
                      background: 'rgba(123, 104, 238, 0.08)',
                      transform: 'translateX(4px)',
                      boxShadow: '0 2px 8px rgba(123, 104, 238, 0.15)'
                    },
                    '&:active': {
                      transform: 'translateX(2px) scale(0.98)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.1) 0%, rgba(32, 178, 170, 0.1) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AccountCircle sx={{ fontSize: 18, color: '#7B68EE' }} />
                    </Box>
                    <Typography sx={{ 
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151'
                    }}>
                      View Profile
                    </Typography>
                  </Box>
                </MenuItem>
                
                <MenuItem 
                  onClick={handleLogout}
                  sx={{
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    mx: 0.5,
                    '&:hover': {
                      background: 'rgba(231, 76, 60, 0.08)',
                      transform: 'translateX(4px)',
                      boxShadow: '0 2px 8px rgba(231, 76, 60, 0.15)'
                    },
                    '&:active': {
                      transform: 'translateX(2px) scale(0.98)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.1) 0%, rgba(207, 82, 61, 0.1) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 17L21 12L16 7M21 12H9M9 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H9" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Box>
                    <Typography sx={{ 
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151'
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
            xs: 0, // No margin on mobile
            sm: collapsed ? '80px' : '280px' // Dynamic sidebar width on desktop
          },
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          overflowX: 'hidden', // Prevent horizontal overflow
          width: { xs: '100%', sm: `calc(100vw - ${collapsed ? '80px' : '280px'})` }, // Use viewport width for max size
          maxWidth: { xs: '100%', sm: `calc(100vw - ${collapsed ? '80px' : '280px'})` }, // Maximum width
        }}
      >
        {/* Page Content */}
        <Box
          sx={{
            mt: '64px', // Account for AppBar height
            minHeight: 'calc(100vh - 64px)',
            paddingBottom: { xs: '80px', sm: 0 }, // Account for mobile bottom nav
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