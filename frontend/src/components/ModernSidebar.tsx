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
      <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
        <ListItemButton
          onClick={() => handleItemClick(item)}
          sx={{
            borderRadius: 2,
            mx: 1,
            px: collapsed ? 1.5 : 2,
            py: 1,
            minHeight: 40,
            background: isActive ? '#F8FAFC' : 'transparent',
            transition: 'all 0.15s ease',
            '&:hover': {
              background: isActive ? '#F1F5F9' : '#FAFAFA'
            }
          }}
        >
          <ListItemIcon
            sx={{
              color: isActive ? '#4F46E5' : '#64748B',
              minWidth: collapsed ? 0 : 40,
              transition: 'color 0.15s ease'
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
                  color: isActive ? '#0F172A' : '#475569'
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
        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              color: '#94A3B8',
              fontWeight: 600,
              fontSize: '0.6875rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'block',
              px: 2,
              py: 1,
              mb: 0.5
            }}
          >
            {section.title}
          </Typography>
        )}
        {collapsed && <Divider sx={{ my: 1, mx: 1 }} />}
        
        <List disablePadding>
          {section.items.map((item, index) => renderSidebarItem(item, index))}
        </List>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: { xs: collapsed ? 0 : '100vw', sm: collapsed ? 72 : 260 },
        height: '100vh',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        transition: 'width 0.2s ease',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1100,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        '&::-webkit-scrollbar': {
          width: '4px'
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#E2E8F0',
          borderRadius: '2px',
          '&:hover': {
            background: '#CBD5E1'
          }
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          minHeight: 64
        }}
      >
        {!collapsed && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#0F172A',
              fontSize: '1.125rem',
              letterSpacing: '-0.01em'
            }}
          >
            PhysioWard
          </Typography>
        )}
        <IconButton
          onClick={toggleCollapsed}
          size="small"
          sx={{
            color: '#64748B',
            width: 32,
            height: 32,
            transition: 'all 0.15s ease',
            '&:hover': {
              background: '#F8FAFC',
              color: '#4F46E5'
            }
          }}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>

      {/* Navigation */}
      <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
        {sidebarSections.map((section, index) => 
          renderSection(section, `section-${index}`)
        )}
      </Box>

      {/* Settings */}
      <Box sx={{ mt: 'auto', p: 2, pt: 0, flexShrink: 0, borderTop: '1px solid #E2E8F0' }}>
        <ListItem disablePadding sx={{ mt: 2 }}>
          <ListItemButton
            onClick={() => handleItemClick({
              text: 'Settings',
              icon: <Settings />,
              path: '/profile'
            })}
            sx={{
              borderRadius: 2,
              mx: 1,
              px: collapsed ? 1.5 : 2,
              py: 1,
              minHeight: 40,
              background: location.pathname === '/profile' ? '#F8FAFC' : 'transparent',
              transition: 'all 0.15s ease',
              '&:hover': {
                background: location.pathname === '/profile' ? '#F1F5F9' : '#FAFAFA'
              }
            }}
          >
            <ListItemIcon
              sx={{
                color: location.pathname === '/profile' ? '#4F46E5' : '#64748B',
                minWidth: collapsed ? 0 : 40,
                transition: 'color 0.15s ease'
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
                    color: location.pathname === '/profile' ? '#0F172A' : '#475569'
                  }
                }}
              />
            )}
          </ListItemButton>
        </ListItem>
      </Box>

      {/* Footer */}
      {!collapsed && (
        <Box sx={{ p: 2, pt: 1, flexShrink: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: '#94A3B8',
              fontSize: '0.625rem',
              textAlign: 'center',
              display: 'block',
              fontWeight: 500
            }}
          >
            PhysioWard © 2025
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ModernSidebar;
