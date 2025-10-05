import React, { useState } from 'react';
import { Box, Typography, Modal, IconButton, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.supabase';
import HomeIcon from '@mui/icons-material/Home';
import AnalyticsIcon from '@mui/icons-material/BarChart';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

interface NavTab {
  id: string;
  label: string;
  icon: React.ReactElement;
  path: string;
  activeIcon?: React.ReactElement;
}

const MobileBottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const tabs: NavTab[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <HomeIcon sx={{ fontSize: 20 }} />,
      path: '/team-leader'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <AnalyticsIcon sx={{ fontSize: 20 }} />,
      path: '/team-leader/analytics'
    },
    {
      id: 'sources',
      label: 'Sources',
      icon: <FlashOnIcon sx={{ fontSize: 20 }} />,
      path: '/team-leader/members'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <AssessmentOutlinedIcon sx={{ fontSize: 20 }} />,
      path: '/team-leader/assessment-logs'
    },
    {
      id: 'more',
      label: 'More',
      icon: <MoreHorizIcon sx={{ fontSize: 20 }} />,
      path: '/team-leader/work-readiness'
    }
  ];

  const isActiveTab = (tab: NavTab) => {
    return location.pathname === tab.path || location.pathname.startsWith(tab.path);
  };

  const handleTabClick = (path: string, tabId: string) => {
    if (tabId === 'more') {
      setSettingsModalOpen(true);
    } else {
      navigate(path);
    }
  };

  const handleCloseSettings = () => {
    setSettingsModalOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setSettingsModalOpen(false);
  };

  const handleProfile = () => {
    navigate('/profile');
    setSettingsModalOpen(false);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        display: { xs: 'flex', sm: 'none', md: 'none' },
        backgroundColor: '#1a202c',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 0',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)'
      }}
    >
      {tabs.map((tab) => {
        const isActive = isActiveTab(tab);
        return (
           <Box
             key={tab.id}
             onClick={() => handleTabClick(tab.path, tab.id)}
             sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '8px 4px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: '12px',
              margin: '0 4px',
              backgroundColor: isActive ? '#10b981' : 'transparent',
              '&:active': {
                transform: 'scale(0.95)'
              },
              '&:hover': {
                backgroundColor: isActive ? '#059669' : 'rgba(255, 255, 255, 0.05)'
              }
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                color: isActive ? '#ffffff' : '#e2e8f0',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {tab.icon}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '11px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#ffffff' : '#94a3b8',
                marginTop: '4px',
                letterSpacing: '0.025em',
                textAlign: 'center',
                lineHeight: 1.2
              }}
            >
              {tab.label}
            </Typography>
          </Box>
        );
       })}

       {/* Settings Modal */}
     <Modal
       open={settingsModalOpen}
       onClose={handleCloseSettings}
       sx={{
         display: 'flex',
         alignItems: 'flex-end',
         justifyContent: 'center',
       }}
     >
       <Box
         sx={{
           position: 'fixed',
           bottom: 80, // Position above the navigation bar
           left: '50%',
           transform: 'translateX(-50%)',
           width: '90%',
           maxWidth: 400,
           backgroundColor: '#1a202c',
           borderRadius: '16px 16px 0 0',
           border: '1px solid rgba(255, 255, 255, 0.1)',
           borderBottom: 'none',
           boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.3)',
           backdropFilter: 'blur(16px)',
           outline: 'none',
           animation: 'slideUpIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
         }}
       >
         <Box sx={{ p: 3, pb: 2 }}>
           <Typography 
             variant="h6" 
             sx={{ 
               color: '#ffffff', 
               fontWeight: 600, 
               mb: 2,
               textAlign: 'center',
               fontSize: '18px'
             }}
           >
             Settings & More
           </Typography>
           
           <List sx={{ py: 0 }}>
             <ListItem 
               onClick={handleProfile}
               sx={{ 
                 borderRadius: '8px',
                 mb: 1,
                 cursor: 'pointer',
                 transition: 'all 0.2s',
                 '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                 '&:active': { backgroundColor: 'rgba(255, 255, 255, 0.12)' }
               }}
             >
               <ListItemIcon>
                 <PersonIcon sx={{ color: '#10b981', fontSize: 24 }} />
               </ListItemIcon>
               <ListItemText 
                 primary="Profile" 
                 primaryTypographyProps={{ 
                   color: '#ffffff', 
                   fontSize: '16px',
                   fontWeight: 500
                 }} 
               />
             </ListItem>

             <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', my: 1 }} />

             <ListItem 
               onClick={handleLogout}
               sx={{ 
                 borderRadius: '8px',
                 cursor: 'pointer',
                 transition: 'all 0.2s',
                 '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                 '&:active': { backgroundColor: 'rgba(239, 68, 68, 0.18)' }
               }}
             >
               <ListItemIcon>
                 <ExitToAppIcon sx={{ color: '#ef4444', fontSize: 24 }} />
               </ListItemIcon>
               <ListItemText 
                 primary="Logout" 
                 primaryTypographyProps={{ 
                   color: '#ffffff', 
                   fontSize: '16px',
                   fontWeight: 500 
                 }} 
               />
             </ListItem>
           </List>
         </Box>
       </Box>
     </Modal>

     <style>
       {`
         @keyframes slideUpIn {
           from {
             opacity: 0;
             transform: translateX(-50%) translateY(100%);
           }
           to {
             opacity: 1;
             transform: translateX(-50%) translateY(0);
           }
         }
       `}
     </style>
     </Box>
   );
 };

export default MobileBottomNavigation;
