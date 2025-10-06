import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Dashboard,
  Assessment,
  Assignment,
  CalendarToday,
  People,
  TrendingUp,
  History,
  Event,
  Settings,
  Security,
  Group,
  Report,
  Notifications,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.supabase';
import { useSidebar } from '../contexts/SidebarContext';
import api from '../utils/api';

interface SidebarItem {
  text: string;
  icon: React.ReactElement;
  path?: string;
  badge?: number;
  children?: SidebarItem[];
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
  collapsible?: boolean;
}

const ModernSidebar: React.FC = () => {
  const { collapsed, toggleCollapsed } = useSidebar();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    general: true,
    sisyphus: true,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleSectionToggle = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  // Fetch unread notification count - DISABLED TO PREVENT CORS ERRORS
  useEffect(() => {
    // Completely disabled to prevent CORS errors
    console.log('Notification count fetch completely disabled');
    setUnreadNotificationCount(0);
  }, [user]);

  const getSidebarSections = (): SidebarSection[] => {
    if (!user) return [];

    const getBaseSection = (): SidebarSection => ({
      title: 'MAIN',
      items: [
        { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
        { text: 'Notifications', icon: <Notifications />, path: '/notifications', badge: unreadNotificationCount },
      ]
    });

    const getBaseSectionForTeamLeader = (): SidebarSection => ({
      title: 'MAIN',
      items: [
        { text: 'Notifications', icon: <Notifications />, path: '/notifications', badge: unreadNotificationCount },
      ]
    });

    switch (user.role) {
      case 'admin':
        return [
          getBaseSection(),
          {
            title: 'ADMIN',
            items: [
              { text: 'Users', icon: <People />, path: '/users' },
              { text: 'Security', icon: <Security />, path: '/admin/auth-logs' },
              { text: 'Payments', icon: <CreditCard /> },
              { text: 'Analytics', icon: <TrendingUp />, path: '/admin/analytics' },
            ]
          },
          {
            title: 'MANAGEMENT',
            items: [
              { text: 'Cases', icon: <Assignment />, path: '/cases' },
              { text: 'Reports', icon: <Report />, path: '/reports' },
            ]
          }
        ];

      case 'case_manager':
        return [
          getBaseSection(),
          {
            title: 'MANAGEMENT',
            items: [
              { text: 'Cases', icon: <Assignment />, path: '/cases' },
              { text: 'Users', icon: <People />, path: '/users' },
              { text: 'Reports', icon: <Report />, path: '/reports' },
            ]
          }
        ];

      case 'clinician':
        return [
          getBaseSection(),
          {
            title: 'CLINICAL',
            items: [
              { text: 'Dashboard', icon: <Assessment />, path: '/clinician' },
              { text: 'Analytics', icon: <TrendingUp />, path: '/clinician/analytics' },
              { text: 'Tasks', icon: <Assignment />, path: '/clinician/tasks' },
              { text: 'Cases', icon: <Assignment />, path: '/cases' },
              { text: 'Appointments', icon: <CalendarToday />, path: '/appointments' },
              { text: 'Calendar View', icon: <Event />, path: '/clinician/calendar' },
              { text: 'Check-ins', icon: <History />, path: '/check-ins' },
            ]
          }
        ];

      case 'employer':
        return [
          getBaseSection(),
          {
            title: 'EMPLOYER',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/employer' },
              { text: 'Analytics', icon: <TrendingUp />, path: '/analytics' },
              { text: 'My Workers', icon: <People />, path: '/employer/workers' },
              { text: 'Reports', icon: <Report />, path: '/employer/reports' },
            ]
          }
        ];

      case 'worker':
        return [
          getBaseSection(),
          {
            title: 'WORKER',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/worker' },
              { text: 'My Cases', icon: <Assignment />, path: '/cases' },
              { text: 'Appointments', icon: <CalendarToday />, path: '/appointments' },
              { text: 'Check-ins', icon: <History />, path: '/check-ins' },
            ]
          }
        ];

      case 'team_leader':
        return [
          getBaseSectionForTeamLeader(),
          {
            title: 'TEAM LEADER',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/team-leader' },
              { text: 'Analytics', icon: <TrendingUp />, path: '/team-leader/analytics' },
              { text: 'Work Readiness', icon: <Assessment />, path: '/team-leader/work-readiness' },
              { text: 'Assessment Logs', icon: <Report />, path: '/team-leader/assessment-logs' },
            ]
          }
        ];

      case 'site_supervisor':
        return [
          getBaseSection(),
          {
            title: 'SITE SUPERVISOR',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/site-supervisor' },
              { text: 'Team Monitoring', icon: <Group />, path: '/site-supervisor/team-monitoring' },
            ]
          }
        ];

      case 'gp_insurer':
        return [
          getBaseSection(),
          {
            title: 'GP INSURER',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/gp-insurer' },
            ]
          }
        ];

      default:
        return [
          getBaseSection()
        ];
    }
  };

  const sidebarSections = getSidebarSections();

  const renderSidebarItem = (item: SidebarItem, index: number) => {
    const isActive = item.path === location.pathname;
    const itemKey = `${item.text}-${index}`;
    const isHovered = hoveredItem === itemKey;
    
    return (
      <ListItem 
        key={index} 
        disablePadding 
        sx={{ 
          mb: 1,
          opacity: 0,
          animation: `slideInLeft 0.3s ease ${index * 0.05}s forwards`,
          '@keyframes slideInLeft': {
            '0%': {
              opacity: 0,
              transform: 'translateX(-20px)'
            },
            '100%': {
              opacity: 1,
              transform: 'translateX(0)'
            }
          }
        }}
      >
        <ListItemButton
          onClick={() => handleItemClick(item)}
          onMouseEnter={() => setHoveredItem(itemKey)}
          onMouseLeave={() => setHoveredItem(null)}
          sx={{
            borderRadius: collapsed ? '16px' : '12px',
            mx: collapsed ? 0.5 : 0.75,
            my: 0.5,
            py: collapsed ? 1.5 : 1.25,
            px: collapsed ? 2 : 2.5,
            position: 'relative',
            background: isActive 
              ? 'linear-gradient(135deg, rgba(123, 104, 238, 0.15) 0%, rgba(123, 104, 238, 0.1) 50%, rgba(123, 104, 238, 0.08) 100%)'
              : 'transparent',
            border: isActive 
              ? '1px solid rgba(123, 104, 238, 0.25)' 
              : '1px solid transparent',
            boxShadow: isActive 
              ? '0 4px 12px rgba(123, 104, 238, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: collapsed ? 0 : 4,
              bottom: 0,
              width: collapsed ? 0 : '4px',
              background: 'linear-gradient(180deg, #7B68EE 0%, #5A4FCF 50%, #4C46A8 100%)',
              borderRadius: '0 3px 3px 0',
              opacity: isActive ? 1 : 0,
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 0 8px rgba(123, 104, 238, 0.4)' : 'none'
            },
            '&:hover': {
              background: isActive 
                ? 'linear-gradient(135deg, rgba(123, 104, 238, 0.18) 0%, rgba(123, 104, 238, 0.12) 100%)'
                : 'linear-gradient(135deg, rgba(123, 104, 238, 0.08) 0%, rgba(123, 104, 238, 0.04) 100%)',
              transform: collapsed ? 'scale(1.05)' : 'translateX(2px)',
              borderColor: isActive ? 'rgba(123, 104, 238, 0.3)' : 'rgba(123, 104, 238, 0.15)',
              boxShadow: collapsed 
                ? '0 4px 12px rgba(123, 104, 238, 0.15)'
                : '0 2px 8px rgba(123, 104, 238, 0.1)',
              '&::before': {
                opacity: 1,
                width: collapsed ? 0 : '4px',
                background: 'linear-gradient(180deg, #7B68EE 0%, #5A4FCF 50%, #4C46A8 100%)',
                boxShadow: '0 0 8px rgba(123, 104, 238, 0.3)'
              }
            },
            '&:active': {
              transform: collapsed ? 'scale(0.95)' : 'translateX(1px) scale(0.98)'
            }
          }}
        >
          <ListItemIcon
            sx={{
              color: isActive ? '#7B68EE' : '#6B7280',
              minWidth: collapsed ? 'auto' : 44,
              transition: 'color 0.2s ease',
              justifyContent: collapsed ? 'center' : 'flex-start',
              position: 'relative',
              zIndex: 1
            }}
          >
            {item.badge ? (
              <Badge 
                badgeContent={item.badge} 
                sx={{ 
                  '& .MuiBadge-badge': {
                    backgroundColor: '#FF6B6B',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    boxShadow: '0 2px 4px rgba(255, 107, 107, 0.3)'
                  }
                }}
              >
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>
          {!collapsed && (
            <ListItemText
              primary={item.text}
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#5A4FCF' : '#374151',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  zIndex: 1,
                  letterSpacing: '-0.01em'
                },
              }}
            />
          )}
          {/* Enhanced Active Indicator */}
          {isActive && (
            <Box
              sx={{
                position: 'absolute',
                right: collapsed ? 4 : -12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: collapsed ? '4px' : '3px',
                height: collapsed ? '20px' : '16px',
                background: 'linear-gradient(180deg, #7B68EE 0%, #5A4FCF 100%)',
                borderRadius: '2px',
                boxShadow: '0 1px 4px rgba(123, 104, 238, 0.3)',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': {
                    opacity: 1,
                    transform: 'translateY(-50%) scale(1)'
                  },
                  '50%': {
                    opacity: 0.7,
                    transform: 'translateY(-50%) scale(1.1)'
                  }
                }
              }}
            />
          )}
          
          {/* Glow Effect */}
          {isActive && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(ellipse at center, rgba(123, 104, 238, 0.1) 0%, transparent 70%)',
                borderRadius: 'inherit',
                pointerEvents: 'none',
                zIndex: -1,
                animation: 'glow 3s infinite',
                '@keyframes glow': {
                  '0%, 100%': {
                    opacity: 0.3
                  },
                  '50%': {
                    opacity: 0.6
                  }
                }
              }}
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const renderSection = (section: SidebarSection, sectionKey: string) => {
    return (
      <Box key={sectionKey} sx={{ mb: 3 }}>
        <Box
          sx={{
            position: 'relative',
            px: collapsed ? 0.5 : 1.5,
            py: collapsed ? 1 : 1.5,
            mb: 2,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: collapsed ? '50%' : 16,
              transform: collapsed ? 'translateX(-50%)' : 'none',
              width: collapsed ? '32px' : 'calc(100% - 32px)',
              height: '1px',
              background: collapsed 
                ? 'linear-gradient(90deg, transparent 0%, rgba(123, 104, 238, 0.3) 50%, transparent 100%)'
                : 'linear-gradient(90deg, rgba(123, 104, 238, 0.2) 0%, rgba(123, 104, 238, 0.3) 20%, rgba(123, 104, 238, 0.4) 50%, rgba(123, 104, 238, 0.3) 80%, rgba(123, 104, 238, 0.2) 100%)',
              borderRadius: '1px'
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: collapsed ? '50%' : 16,
              transform: collapsed ? 'translateX(-50%)' : 'none',
              width: collapsed ? '24px' : 'calc(100% - 32px)',
              height: '1px',
              background: collapsed 
                ? 'linear-gradient(90deg, transparent 0%, rgba(32, 178, 170, 0.2) 50%, transparent 100%)'
                : 'linear-gradient(90deg, rgba(32, 178, 170, 0.1) 0%, rgba(32, 178, 170, 0.2) 30%, rgba(32, 178, 170, 0.25) 50%, rgba(32, 178, 170, 0.2) 70%, rgba(32, 178, 170, 0.1) 100%)',
              borderRadius: '1px'
            }
          }}
        >
          {!collapsed && (
            <Typography
              variant="caption"
              sx={{
                color: '#9CA3AF',
                fontWeight: 500,
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'block',
                mb: 1.5,
                textAlign: 'center',
                px: 1.5,
                py: 0.25,
                borderRadius: '6px',
                background: 'rgba(156, 163, 175, 0.05)',
                border: '1px solid rgba(156, 163, 175, 0.1)',
                boxShadow: 'none'
              }}
            >
              {section.title}
            </Typography>
          )}
          {collapsed && (
            <Box sx={{ 
              width: '100%', 
              height: '8px',
              background: 'linear-gradient(180deg, rgba(123, 104, 238, 0.1) 0%, rgba(255, 255, 255, 0) 100%)',
              borderRadius: '1px'
            }} />
          )}
        </Box>
        
        {(!section.collapsible || expandedSections[sectionKey] || collapsed) && (
          <List disablePadding>
            {section.items.map((item, index) => renderSidebarItem(item, index))}
          </List>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: { xs: collapsed ? 0 : '100vw', sm: collapsed ? 80 : 280 },
        height: '100vh',
        background: collapsed 
          ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)'
          : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
        borderRight: { xs: 'none', sm: '1px solid rgba(229, 231, 235, 0.6)' },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1100,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)',
        boxShadow: collapsed 
          ? '2px 0 8px rgba(0, 0, 0, 0.04), 1px 0 4px rgba(0, 0, 0, 0.02)' 
          : '4px 0 12px rgba(0, 0, 0, 0.06), 2px 0 6px rgba(0, 0, 0, 0.03)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: collapsed 
            ? 'linear-gradient(180deg, rgba(123, 104, 238, 0.02) 0%, rgba(32, 178, 170, 0.02) 100%)'
            : 'linear-gradient(180deg, rgba(123, 104, 238, 0.01) 0%, rgba(32, 178, 170, 0.01) 100%)',
          pointerEvents: 'none',
          zIndex: -1
        },
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(123, 104, 238, 0.2)',
          borderRadius: '3px',
          '&:hover': {
            background: 'rgba(123, 104, 238, 0.3)',
          },
        },
      }}
    >
      {/* Enhanced Professional Header */}
      <Box
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderBottom: '1px solid rgba(229, 231, 235, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(123, 104, 238, 0.2) 20%, rgba(123, 104, 238, 0.3) 50%, rgba(123, 104, 238, 0.2) 80%, transparent 100%)',
            opacity: 0.4
          }
        }}
      >
        {!collapsed && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#1a202c',
              fontSize: collapsed ? '1rem' : '1.25rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              transition: 'all 0.2s ease'
            }}
          >
            PhysioWard
          </Typography>
        )}
        <IconButton
          onClick={toggleCollapsed}
          size="small"
          sx={{
            color: '#7B68EE',
            background: collapsed 
              ? 'rgba(123, 104, 238, 0.1)' 
              : 'rgba(255, 255, 255, 0.9)',
            border: collapsed 
              ? '1px solid rgba(123, 104, 238, 0.2)' 
              : '1px solid rgba(123, 104, 238, 0.15)',
            borderRadius: '12px',
            width: collapsed ? 40 : 36,
            height: collapsed ? 40 : 36,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: collapsed 
              ? '0 2px 4px rgba(123, 104, 238, 0.15)' 
              : '0 1px 2px rgba(123, 104, 238, 0.1)',
            '&:hover': {
              background: 'rgba(123, 104, 238, 0.15)',
              color: '#5A4FCF',
              borderColor: 'rgba(123, 104, 238, 0.3)',
              transform: 'scale(1.05)',
              boxShadow: '0 4px 8px rgba(123, 104, 238, 0.25)'
            },
            '&:active': {
              transform: 'scale(0.95)'
            }
          }}
        >
          {collapsed ? <ChevronRight sx={{ fontSize: 20 }} /> : <ChevronLeft sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      {/* Enhanced Navigation Sections */}
      <Box sx={{ 
        p: { xs: 1.5, sm: 2 }, 
        flexGrow: 1, 
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(123, 104, 238, 0.15)',
          borderRadius: '2px',
          '&:hover': {
            background: 'rgba(123, 104, 238, 0.25)',
          },
        },
      }}>
        {sidebarSections.map((section, index) => 
          renderSection(section, `section-${index}`)
        )}
      </Box>

      {/* Enhanced Settings Section */}
      <Box sx={{ 
        mt: 'auto', 
        p: { xs: 1.5, sm: 2 }, 
        pt: { xs: 1, sm: 1.5 }, 
        flexShrink: 0,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: collapsed ? '50%' : 16,
          transform: collapsed ? 'translateX(-50%)' : 'none',
          width: collapsed ? '48px' : 'calc(100% - 32px)',
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(123, 104, 238, 0.2) 25%, rgba(123, 104, 238, 0.3) 50%, rgba(123, 104, 238, 0.2) 75%, transparent 100%)',
          borderRadius: '1px'
        }
      }}>
        <Box sx={{ px: collapsed ? 0 : 1 }}>
          {!collapsed && (
            <Typography
              variant="caption"
              sx={{
                color: '#9CA3AF',
                fontWeight: 500,
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                display: 'block',
                mb: 1.5,
                textAlign: 'center',
                px: 1.5,
                py: 0.25,
                borderRadius: '6px',
                background: 'rgba(156, 163, 175, 0.05)',
                border: '1px solid rgba(156, 163, 175, 0.1)',
                boxShadow: 'none'
              }}
            >
              TOOLS
            </Typography>
          )}
          {collapsed && (
            <Box sx={{ 
              width: '100%', 
              height: '6px',
              background: 'linear-gradient(180deg, rgba(123, 104, 238, 0.08) 0%, rgba(255, 255, 255, 0) 100%)',
              borderRadius: '1px',
              mb: 2
            }} />
          )}
        </Box>
        
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleItemClick({
              text: 'Settings',
              icon: <Settings />,
              path: '/profile',
            })}
            sx={{
              borderRadius: '12px', // Consistent with updated pill styling
              mx: 0.5, // Consistent margin
              my: 0.25,
              py: 1.25, // Consistent padding
              px: 2.5,
              background: location.pathname === '/profile' 
                ? 'linear-gradient(135deg, rgba(123, 104, 238, 0.15) 0%, rgba(123, 104, 238, 0.1) 50%, rgba(123, 104, 238, 0.08) 100%)'
                : 'transparent',
              border: location.pathname === '/profile' 
                ? '1px solid rgba(123, 104, 238, 0.25)' 
                : '1px solid transparent',
              boxShadow: location.pathname === '/profile' 
                ? '0 4px 12px rgba(123, 104, 238, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : 'none',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: 'linear-gradient(180deg, #7B68EE 0%, #5A4FCF 50%, #4C46A8 100%)',
                borderRadius: '0 3px 3px 0',
                opacity: location.pathname === '/profile' ? 1 : 0,
                transition: 'all 0.2s ease',
                boxShadow: location.pathname === '/profile' ? '0 0 8px rgba(123, 104, 238, 0.4)' : 'none'
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                background: location.pathname === '/profile' 
                  ? 'linear-gradient(135deg, rgba(123, 104, 238, 0.18) 0%, rgba(123, 104, 238, 0.12) 100%)'
                  : 'linear-gradient(135deg, rgba(123, 104, 238, 0.08) 0%, rgba(123, 104, 238, 0.04) 100%)',
                transform: 'translateX(2px)',
                boxShadow: '0 2px 8px rgba(123, 104, 238, 0.1)',
                '&::before': {
                  opacity: 1,
                  width: '4px',
                  background: 'linear-gradient(180deg, #7B68EE 0%, #5A4FCF 50%, #4C46A8 100%)',
                  boxShadow: '0 0 8px rgba(123, 104, 238, 0.3)'
                }
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: location.pathname === '/profile' ? '#7B68EE' : '#6B7280', // Consistent with main navigation icon colors
                minWidth: 40,
                transition: 'color 0.15s ease',
              }}
            >
              <Settings />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="Settings"
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.875rem',
                    fontWeight: location.pathname === '/profile' ? 600 : 500,
                    color: location.pathname === '/profile' ? '#7B68EE' : '#374151',
                    transition: 'color 0.15s ease',
                  },
                }}
              />
            )}
          </ListItemButton>
        </ListItem>
      </Box>

      {/* Footer */}
      <Box sx={{ 
        pt: 1,
        px: 2,
        pb: 2,
        flexShrink: 0,
      }}>
        <Typography
          variant="caption"
          sx={{
            color: '#9CA3AF',
            fontSize: '0.7rem',
            textAlign: 'center',
            display: 'block',
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}
        >
          DEVELOP BY PHYSIOWARD DEVELOPMENT
        </Typography>
      </Box>

    </Box>
  );
};

export default ModernSidebar;
