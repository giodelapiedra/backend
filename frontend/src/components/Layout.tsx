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
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Notifications,
  AccountCircle,
  Search,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import api from '../utils/api';
import { createImageProps } from '../utils/imageUtils';
import ModernSidebar from './ModernSidebar';

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
    const fetchNotificationCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        setUnreadNotificationCount(response.data.unreadCount);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    if (user) {
      fetchNotificationCount();
      
      // Completely disable all notification polling to stop repeated requests
      // TODO: Re-enable with proper SSE authentication later
    }
  }, [user]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Top App Bar - Right Side Only */}
      <AppBar
        position="fixed"
        sx={{
          left: { xs: 0, sm: `${sidebarWidth}px` },
          width: { xs: '100%', sm: `calc(100% - ${sidebarWidth}px)` },
          backgroundColor: '#ffffff',
          color: '#2d3748',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          zIndex: 1200,
          transition: 'left 0.3s ease, width 0.3s ease',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 3 } }}>
          {/* Mobile Menu Button */}
          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <IconButton
              onClick={toggleCollapsed}
              sx={{
                color: '#666',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Center - Search Bar */}
          <Box sx={{ flexGrow: 1, maxWidth: 400, display: { xs: 'none', sm: 'block' } }}>
            <TextField
              size="small"
              placeholder="Search..."
              variant="outlined"
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#f7fafc',
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: '#e2e8f0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#cbd5e0',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7B68EE',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#a0aec0', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Right Side Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                onClick={() => navigate('/notifications')}
                sx={{
                  color: '#666',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <Badge badgeContent={unreadNotificationCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Profile Menu */}
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{
                  p: 0,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                {user?.profileImage ? (
                  <img
                    {...createImageProps(user.profileImage)}
                    alt={user.firstName}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: '#7B68EE',
                      fontSize: '0.875rem',
                    }}
                  >
                    {user?.firstName?.charAt(0)}
                  </Avatar>
                )}
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
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <AccountCircle sx={{ mr: 2 }} />
                Logout
              </MenuItem>
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
          ml: { xs: 0, sm: `${sidebarWidth}px` }, // Account for sidebar width
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Page Content */}
        <Box
          sx={{
            mt: '64px', // Account for AppBar height
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;