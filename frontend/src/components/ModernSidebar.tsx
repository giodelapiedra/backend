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
import { useAuth } from '../contexts/AuthContext';
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
    }
  }, [user]);

  const getSidebarSections = (): SidebarSection[] => {
    if (!user) return [];

    const baseSections: SidebarSection[] = [
      {
        title: 'MAIN',
        items: [
          { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
          { text: 'Notifications', icon: <Notifications />, path: '/notifications', badge: unreadNotificationCount },
        ]
      }
    ];

    switch (user.role) {
      case 'admin':
        return [
          ...baseSections,
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
          },
          {
            title: 'TOOLS',
            items: [
              { text: 'Settings', icon: <Settings />, path: '/profile' },
            ]
          }
        ];

      case 'case_manager':
        return [
          ...baseSections,
          {
            title: 'MANAGEMENT',
            items: [
              { text: 'Cases', icon: <Assignment />, path: '/cases' },
              { text: 'Users', icon: <People />, path: '/users' },
              { text: 'Reports', icon: <Report />, path: '/reports' },
            ]
          },
          {
            title: 'TOOLS',
            items: [
              { text: 'Settings', icon: <Settings />, path: '/profile' },
            ]
          }
        ];

      case 'clinician':
        return [
          ...baseSections,
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
          },
          {
            title: 'TOOLS',
            items: [
              { text: 'Settings', icon: <Settings />, path: '/profile' },
            ]
          }
        ];

      case 'employer':
        return [
          ...baseSections,
          {
            title: 'EMPLOYER',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/employer' },
              { text: 'Analytics', icon: <TrendingUp />, path: '/analytics' },
              { text: 'My Workers', icon: <People />, path: '/employer/workers' },
              { text: 'Reports', icon: <Report />, path: '/employer/reports' },
            ]
          },
          {
            title: 'TOOLS',
            items: [
              { text: 'Settings', icon: <Settings />, path: '/profile' },
            ]
          }
        ];

      case 'worker':
        return [
          ...baseSections,
          {
            title: 'WORKER',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/worker' },
              { text: 'My Cases', icon: <Assignment />, path: '/cases' },
              { text: 'Appointments', icon: <CalendarToday />, path: '/appointments' },
              { text: 'Check-ins', icon: <History />, path: '/check-ins' },
            ]
          },
          {
            title: 'TOOLS',
            items: [
              { text: 'Settings', icon: <Settings />, path: '/profile' },
            ]
          }
        ];

      case 'team_leader':
        return [
          ...baseSections,
          {
            title: 'TEAM LEADER',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/team-leader' },
              { text: 'Analytics', icon: <TrendingUp />, path: '/team-leader/analytics' },
              { text: 'Work Readiness', icon: <Assessment />, path: '/team-leader/work-readiness' },
              { text: 'Assessment Logs', icon: <Report />, path: '/team-leader/assessment-logs' },
            ]
          },
          {
            title: 'TOOLS',
            items: [
              { text: 'Settings', icon: <Settings />, path: '/profile' },
            ]
          }
        ];

      case 'site_supervisor':
        return [
          ...baseSections,
          {
            title: 'SITE SUPERVISOR',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/site-supervisor' },
              { text: 'Team Monitoring', icon: <Group />, path: '/site-supervisor/team-monitoring' },
            ]
          },
          {
            title: 'TOOLS',
            items: [
              { text: 'Settings', icon: <Settings />, path: '/profile' },
            ]
          }
        ];

      case 'gp_insurer':
        return [
          ...baseSections,
          {
            title: 'GP INSURER',
            items: [
              { text: 'Dashboard', icon: <Dashboard />, path: '/gp-insurer' },
            ]
          },
          {
            title: 'TOOLS',
            items: [
              { text: 'Settings', icon: <Settings />, path: '/profile' },
            ]
          }
        ];

      default:
        return [
          ...baseSections,
          {
            title: 'TOOLS',
            items: [
              { text: 'Settings', icon: <Settings />, path: '/profile' },
            ]
          }
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
            borderRadius: { xs: 3, sm: 2 },
            mx: { xs: 0, sm: 1 },
            py: { xs: 1.5, sm: 1.2 },
            px: { xs: 3, sm: 2 },
            backgroundColor: isActive ? 'rgba(255, 165, 0, 0.1)' : 'transparent',
            color: isActive ? '#1F2937' : '#6B7280',
            '&:hover': {
              backgroundColor: isActive ? 'rgba(255, 165, 0, 0.15)' : 'rgba(0, 0, 0, 0.04)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          <ListItemIcon
            sx={{
              color: isActive ? '#FF6B35' : '#6B7280',
              minWidth: { xs: 50, sm: 40 },
            }}
          >
            {item.icon}
          </ListItemIcon>
          {!collapsed && (
            <>
              <ListItemText
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: { xs: '1rem', sm: '0.875rem' },
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#1F2937' : '#6B7280',
                  },
                }}
              />
              {item.badge && (
                <Badge
                  badgeContent={item.badge}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.7rem',
                      height: 18,
                      minWidth: 18,
                      backgroundColor: '#EF4444',
                      color: 'white',
                    },
                  }}
                />
              )}
            </>
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            mb: 1,
          }}
        >
          {!collapsed && (
            <Typography
              variant="caption"
              sx={{
                color: '#6B7280',
                fontWeight: 600,
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {section.title}
            </Typography>
          )}
          {section.collapsible && !collapsed && (
            <IconButton
              size="small"
              onClick={() => handleSectionToggle(sectionKey)}
              sx={{ color: '#999' }}
            >
              <ExpandMore
                sx={{
                  transform: expandedSections[sectionKey] ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </IconButton>
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
        backgroundColor: '#ffffff',
        borderRight: { xs: 'none', sm: '1px solid #e5e7eb' },
        transition: 'width 0.3s ease',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1100,
        overflowY: 'auto',
        boxShadow: { xs: '0 0 20px rgba(0,0,0,0.1)', sm: 'none' },
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#d1d5db',
          borderRadius: '2px',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: { xs: '#f8fafc', sm: 'transparent' },
        }}
      >
        {!collapsed && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#2d3748',
              fontSize: { xs: '1.2rem', sm: '1.1rem' },
            }}
          >
            PhysioWard
          </Typography>
        )}
        <IconButton
          onClick={toggleCollapsed}
          size="small"
          sx={{
            color: '#666',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>

      {/* Navigation Sections */}
      <Box sx={{ p: { xs: 2, sm: 1 } }}>
        {sidebarSections.map((section, index) => 
          renderSection(section, `section-${index}`)
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid #e5e7eb' }}>
        <Typography
          variant="caption"
          sx={{
            color: '#6B7280',
            fontSize: '0.7rem',
            textAlign: 'center',
            display: 'block',
            fontWeight: 500,
          }}
        >
          DEVELOP BY PHYSIOWARD DEVELOPMENT
        </Typography>
      </Box>

    </Box>
  );
};

export default ModernSidebar;
