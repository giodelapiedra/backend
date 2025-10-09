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
  Divider,
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
  AssignmentTurnedIn,
  Analytics,
  Schedule,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.supabase';
import { useSidebar } from '../contexts/SidebarContext';

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

  // Fetch unread notification count
  useEffect(() => {
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
              { text: 'Assignments', icon: <AssignmentTurnedIn />, path: '/team-leader/assignments' },
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
              { text: 'Multi-Team Analytics', icon: <Analytics />, path: '/site-supervisor/multi-team-analytics' },
              { text: 'Shift Management', icon: <Schedule />, path: '/site-supervisor/shift-management' },
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
    
    return (
      <ListItem key={index} disablePadding sx={{ mb: 0.25 }}>
        <ListItemButton
          onClick={() => handleItemClick(item)}
          sx={{
            borderRadius: 1.5,
            mx: 0.5,
            px: collapsed ? 1.5 : 1.5,
            py: 1,
            minHeight: 40,
            background: isActive ? '#EEF2FF' : 'transparent',
            transition: 'all 0.2s ease',
            '&:hover': {
              background: isActive ? '#E0E7FF' : '#F9FAFB'
            }
          }}
        >
          <ListItemIcon
            sx={{
              color: isActive ? '#4F46E5' : '#6B7280',
              minWidth: collapsed ? 0 : 36,
              transition: 'color 0.2s ease',
              fontSize: 20
            }}
          >
            {item.badge ? (
              <Badge 
                badgeContent={item.badge} 
                sx={{ 
                  '& .MuiBadge-badge': {
                    backgroundColor: '#EF4444',
                    color: 'white',
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    minWidth: 16,
                    height: 16,
                    borderRadius: '8px'
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
                  color: isActive ? '#111827' : '#4B5563'
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
      <Box key={sectionKey} sx={{ mb: 2 }}>
        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              color: '#9CA3AF',
              fontWeight: 600,
              fontSize: '0.6875rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'block',
              px: 1.5,
              py: 0.75,
              mb: 0.5
            }}
          >
            {section.title}
          </Typography>
        )}
        {collapsed && <Divider sx={{ my: 1, mx: 0.5 }} />}
        
        <List disablePadding>
          {section.items.map((item, index) => renderSidebarItem(item, index))}
        </List>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: { xs: collapsed ? 0 : '100vw', sm: collapsed ? 64 : 240 },
        height: '100vh',
        background: '#FFFFFF',
        borderRight: '1px solid #E5E7EB',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1100,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        '&::-webkit-scrollbar': {
          width: '6px'
        },
        '&::-webkit-scrollbar-track': {
          background: '#F9FAFB'
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#D1D5DB',
          borderRadius: '3px',
          '&:hover': {
            background: '#9CA3AF'
          }
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
          minHeight: 60
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '1rem'
              }}
            >
              P
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#111827',
                fontSize: '1rem'
              }}
            >
              PhysioWard
            </Typography>
          </Box>
        )}
        <IconButton
          onClick={toggleCollapsed}
          size="small"
          sx={{
            color: '#6B7280',
            width: 28,
            height: 28,
            '&:hover': {
              background: '#F3F4F6',
              color: '#4F46E5'
            }
          }}
        >
          {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
        </IconButton>
      </Box>

      {/* Navigation */}
      <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
        {sidebarSections.map((section, index) => 
          renderSection(section, `section-${index}`)
        )}
      </Box>

      {/* Settings */}
      <Box sx={{ mt: 'auto', p: 1.5, flexShrink: 0, borderTop: '1px solid #E5E7EB' }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleItemClick({
              text: 'Settings',
              icon: <Settings />,
              path: '/profile'
            })}
            sx={{
              borderRadius: 1.5,
              mx: 0.5,
              px: collapsed ? 1.5 : 1.5,
              py: 1,
              minHeight: 40,
              background: location.pathname === '/profile' ? '#EEF2FF' : 'transparent',
              transition: 'all 0.2s ease',
              '&:hover': {
                background: location.pathname === '/profile' ? '#E0E7FF' : '#F9FAFB'
              }
            }}
          >
            <ListItemIcon
              sx={{
                color: location.pathname === '/profile' ? '#4F46E5' : '#6B7280',
                minWidth: collapsed ? 0 : 36,
                transition: 'color 0.2s ease'
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
                    color: location.pathname === '/profile' ? '#111827' : '#4B5563'
                  }
                }}
              />
            )}
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );
};

export default ModernSidebar;
