import React, { memo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Work } from '@mui/icons-material';

interface WelcomeHeaderProps {
  user: {
    team?: string;
    package?: string;
  };
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = memo(({ user }) => {
  return (
    <Box sx={{ 
      textAlign: 'center', 
      mb: 6,
      width: '100%',
      maxWidth: { xs: '100%', sm: 600 }
    }}>
      <Typography 
        variant="h3" 
        component="h1" 
        sx={{ 
          fontWeight: 700, 
          color: '#1e293b',
          mb: 2,
          fontSize: { xs: '1.8rem', sm: '2.2rem', md: '3rem' }
        }}
      >
        Welcome Back!
      </Typography>
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#64748b',
          fontWeight: 400,
          fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' },
          px: { xs: 2, sm: 0 },
          mb: 3
        }}
      >
        Let's check in on your recovery progress today
      </Typography>
      
      {/* Team Information */}
      {user?.team && (
        <Box sx={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '0.5rem 1rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderColor: '#3b82f6'
          }
        }}>
          <Work sx={{ 
            color: '#6b7280', 
            mr: 1, 
            fontSize: '1.25rem' 
          }} />
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500, 
              color: '#374151',
              fontSize: '0.875rem',
              mr: 1
            }}
          >
            {user.team}
          </Typography>
          {user?.package && (
            <Chip
              label={user.package === 'package1' ? 'Package 1' : user.package === 'package2' ? 'Package 2' : 'Package 3'}
              size="small"
              sx={{
                backgroundColor: user.package === 'package1' ? '#dcfce7' : user.package === 'package2' ? '#dbeafe' : '#fef3c7',
                color: user.package === 'package1' ? '#166534' : user.package === 'package2' ? '#1e40af' : '#92400e',
                fontSize: '0.75rem',
                height: '20px',
                fontWeight: 500
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
});

WelcomeHeader.displayName = 'WelcomeHeader';

export default WelcomeHeader;

