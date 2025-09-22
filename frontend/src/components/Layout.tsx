import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  TextField,
  InputAdornment,
  Chip,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Assignment,
  Assessment,
  CalendarToday,
  Report,
  Settings,
  Logout,
  Notifications,
  AccountCircle,
  Search,
  LocalHospital,
  TrendingUp,
  Map,
  Business,
  History,
  MoreVert,
  ExpandMore,
  Timeline,
  Security,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { createImageProps } from '../utils/imageUtils';
import Cookies from 'js-cookie';

const drawerWidth = 280;
const mobileDrawerWidth = 320;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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

  const getMenuItems = () => {
    const baseItems = [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    ];

    if (!user) return baseItems;

    switch (user.role) {
      case 'admin':
        return [
          ...baseItems,
          { text: 'Admin Panel', icon: <Settings />, path: '/admin' },
          { text: 'Analytics', icon: <TrendingUp />, path: '/admin/analytics' },
          { text: 'Auth Logs', icon: <Security />, path: '/admin/auth-logs' },
          { text: 'Users', icon: <People />, path: '/users' },
          { text: 'Cases', icon: <Assignment />, path: '/cases' },
          { text: 'Reports', icon: <Report />, path: '/reports' },
        ];
      case 'case_manager':
        return [
          ...baseItems,
          { text: 'Case Manager', icon: <Assignment />, path: '/case-manager' },
          { text: 'Cases', icon: <Assignment />, path: '/cases' },
          { text: 'Users', icon: <People />, path: '/users' },
        ];
      case 'clinician':
        return [
          ...baseItems,
          { text: 'Clinician', icon: <Assessment />, path: '/clinician' },
          { text: 'Worker Activity Monitor', icon: <Timeline />, path: '/clinician/activity-monitor' },
          { text: 'Cases', icon: <Assignment />, path: '/cases' },
          { text: 'Daily Check-ins', icon: <History />, path: '/check-ins' },
          { text: 'Appointments', icon: <CalendarToday />, path: '/appointments' },
        ];
      case 'worker':
        return [
          ...baseItems,
          { text: 'My Dashboard', icon: <Dashboard />, path: '/worker' },
          { text: 'My Cases', icon: <Assignment />, path: '/cases' },
          { text: 'Appointments', icon: <CalendarToday />, path: '/appointments' },
        ];
      case 'employer':
        return [
          ...baseItems,
          { text: 'Employer', icon: <Dashboard />, path: '/employer' },
          { text: 'Cases', icon: <Assignment />, path: '/cases' },
          { text: 'Analytics', icon: <TrendingUp />, path: '/analytics' },
          { text: 'Reports', icon: <Report />, path: '/reports' },
        ];
      case 'site_supervisor':
        return [
          ...baseItems,
          { text: 'Site Supervisor', icon: <Dashboard />, path: '/site-supervisor' },
          { text: 'Cases', icon: <Assignment />, path: '/cases' },
        ];
      case 'gp_insurer':
        return [
          ...baseItems,
          { text: 'GP/Insurer', icon: <Dashboard />, path: '/gp-insurer' },
          { text: 'Cases', icon: <Assignment />, path: '/cases' },
          { text: 'Reports', icon: <Report />, path: '/reports' },
        ];
      default:
        return baseItems;
    }
  };

  const menuItems = getMenuItems();

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced Logo Section */}
      <Box sx={{ 
        p: { xs: 2.5, sm: 3 }, 
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.05) 0%, rgba(32, 178, 170, 0.05) 100%)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: { xs: 36, sm: 44 },
              height: { xs: 36, sm: 44 },
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #7B68EE 0%, #20B2AA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(123, 104, 238, 0.3)',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit',
                padding: '1px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'xor',
                WebkitMaskComposite: 'xor',
              }
            }}
          >
            <LocalHospital sx={{ 
              color: 'white', 
              fontSize: { xs: 22, sm: 28 },
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            }} />
          </Box>
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 800, 
                fontSize: { xs: '1.3rem', sm: '1.6rem' },
                background: 'linear-gradient(135deg, #7B68EE 0%, #20B2AA 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              MSK
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#7B68EE',
                fontWeight: 600,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Rehabilitation Platform
            </Typography>
          </Box>
        </Box>
      </Box>


      {/* Enhanced Navigation Menu */}
      <Box sx={{ flex: 1, px: { xs: 1.5, sm: 2 } }}>
        <List sx={{ '& .MuiListItem-root': { mb: 0.5 } }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false); // Close mobile drawer after navigation
                }}
                sx={{
                  borderRadius: 2.5,
                  mb: 0.5,
                  py: { xs: 1.25, sm: 1.5 },
                  px: { xs: 1.5, sm: 2 },
                  position: 'relative',
                  overflow: 'hidden',
                  '&.Mui-selected': {
                    backgroundColor: '#7B68EE',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(123, 104, 238, 0.3)',
                    transform: 'translateX(4px)',
                    '&:hover': {
                      backgroundColor: '#6A5ACD',
                      transform: 'translateX(6px)',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      borderRadius: '0 2px 2px 0',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(123, 104, 238, 0.08)',
                    transform: 'translateX(2px)',
                    boxShadow: '0 2px 8px rgba(123, 104, 238, 0.15)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: { xs: 40, sm: 44 },
                  color: location.pathname === item.path ? 'white' : '#7B68EE',
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 700 : 600,
                    fontSize: { xs: '0.85rem', sm: '0.9rem' },
                    letterSpacing: '0.01em',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Enhanced Mobile App Section */}
      <Box sx={{ 
        p: { xs: 2.5, sm: 3 }, 
        borderTop: '1px solid rgba(0,0,0,0.05)',
        background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.03) 0%, rgba(32, 178, 170, 0.03) 100%)',
      }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, rgba(123, 104, 238, 0.08) 0%, rgba(32, 178, 170, 0.08) 100%)',
            borderRadius: 3,
            p: { xs: 2, sm: 2.5 },
            textAlign: 'center',
            border: '1px solid rgba(123, 104, 238, 0.1)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(123, 104, 238, 0.3), transparent)',
            }
          }}
        >
          <Typography variant="body2" sx={{ 
            fontWeight: 700, 
            mb: 1.5, 
            fontSize: { xs: '0.7rem', sm: '0.8rem' },
            color: '#7B68EE',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: 'center',
            lineHeight: 1.3,
          }}>
            DEVELOP BY PHYSIOWARD SPORTS & REHAB 2025
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: '#1a1a1a',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
        }}
      >
        <Toolbar sx={{ 
          px: { xs: 2, sm: 3, md: 4 }, 
          justifyContent: 'space-between', 
          minHeight: { xs: '64px', sm: '72px' },
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 1, 
                display: { sm: 'none' }, 
                color: '#1a1a1a',
                backgroundColor: 'rgba(0,0,0,0.04)',
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.08)',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <MenuIcon />
            </IconButton>
            
            {/* Enhanced Search Bar */}
            <TextField
              placeholder="Search patients, cases, reports..."
              variant="outlined"
              size="small"
              sx={{
                maxWidth: { xs: 140, sm: 240, md: 360, lg: 480 },
                mr: { xs: 0.5, sm: 1, md: 2 },
                display: { xs: 'none', sm: 'block' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  transition: 'all 0.3s ease',
                  '& fieldset': {
                    borderColor: 'transparent',
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    transform: 'translateY(-1px)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255,255,255,1)',
                    boxShadow: '0 4px 20px rgba(123, 104, 238, 0.15)',
                    borderColor: '#7B68EE',
                    transform: 'translateY(-1px)',
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ 
                      color: '#7B68EE', 
                      fontSize: { xs: '1rem', sm: '1.1rem' },
                      filter: 'drop-shadow(0 1px 2px rgba(123, 104, 238, 0.3))',
                    }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          {/* Right side - Enhanced Notifications and User Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Enhanced Notifications */}
            <IconButton 
              onClick={() => navigate('/notifications')}
              sx={{ 
                color: '#1a1a1a',
                backgroundColor: 'rgba(0,0,0,0.04)',
                borderRadius: 2,
                width: 44,
                height: 44,
                '&:hover': {
                  backgroundColor: 'rgba(123, 104, 238, 0.1)',
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 12px rgba(123, 104, 238, 0.2)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Badge 
                badgeContent={unreadNotificationCount} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: '#ff4757',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    minWidth: 18,
                    height: 18,
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(255, 71, 87, 0.3)',
                  }
                }}
              >
                <Notifications sx={{ fontSize: '1.2rem' }} />
              </Badge>
            </IconButton>
            
            {/* Enhanced User Profile */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              backgroundColor: 'rgba(0,0,0,0.04)',
              borderRadius: 3,
              px: 1.5,
              py: 0.5,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(123, 104, 238, 0.08)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(123, 104, 238, 0.15)',
              }
            }}
            onClick={handleProfileMenuOpen}
            >
              {user?.profileImage ? (
                <img
                  {...createImageProps(user.profileImage)}
                  alt={`${user.firstName} ${user.lastName}`}
                  style={{
                    width: window.innerWidth < 600 ? 36 : 40,
                    height: window.innerWidth < 600 ? 36 : 40,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    boxShadow: '0 4px 12px rgba(123, 104, 238, 0.3)',
                    border: '2px solid rgba(255,255,255,0.8)',
                  }}
                />
              ) : (
                <Avatar 
                  sx={{ 
                    width: { xs: 36, sm: 40 }, 
                    height: { xs: 36, sm: 40 },
                    background: 'linear-gradient(135deg, #7B68EE 0%, #20B2AA 100%)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(123, 104, 238, 0.3)',
                    border: '2px solid rgba(255,255,255,0.8)',
                  }}
                >
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </Avatar>
              )}
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    color: '#1a1a1a',
                    fontSize: '0.9rem',
                    lineHeight: 1.2,
                  }}
                >
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#7B68EE',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    textTransform: 'capitalize',
                  }}
                >
                  {user?.role?.replace('_', ' ')}
                </Typography>
              </Box>
              <ExpandMore sx={{ 
                color: '#7B68EE',
                fontSize: '1.2rem',
                transition: 'transform 0.2s ease',
                transform: Boolean(anchorEl) ? 'rotate(180deg)' : 'rotate(0deg)',
              }} />
            </Box>
          </Box>
          
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            sx={{
              '& .MuiPaper-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
                minWidth: 200,
                mt: 1,
              }
            }}
          >
            <MenuItem 
              onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}
              sx={{
                borderRadius: 2,
                mx: 1,
                my: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(123, 104, 238, 0.08)',
                  transform: 'translateX(4px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <ListItemIcon sx={{ color: '#7B68EE' }}>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              <Typography sx={{ fontWeight: 500 }}>Profile</Typography>
            </MenuItem>
            <Divider sx={{ mx: 2, my: 0.5 }} />
            <MenuItem 
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                mx: 1,
                my: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(255, 71, 87, 0.08)',
                  transform: 'translateX(4px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <ListItemIcon sx={{ color: '#ff4757' }}>
                <Logout fontSize="small" />
              </ListItemIcon>
              <Typography sx={{ fontWeight: 500 }}>Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: mobileDrawerWidth,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
              borderRight: '1px solid rgba(0,0,0,0.05)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 0, sm: 1, md: 2 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: '64px', sm: '72px' } }} />
        <Box sx={{ p: { xs: 0, sm: 1, md: 2 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
