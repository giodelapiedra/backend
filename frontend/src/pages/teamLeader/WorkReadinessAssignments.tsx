import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import {
  NavigateNext,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.supabase';
import WorkReadinessAssignmentManager from '../../components/WorkReadinessAssignmentManager';

const WorkReadinessAssignments: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          separator={<NavigateNext fontSize="small" />} 
          sx={{ mb: 3 }}
        >
          <MuiLink
            color="inherit"
            onClick={() => navigate('/team-leader')}
            sx={{ 
              cursor: 'pointer',
              '&:hover': { color: '#1976d2' },
              transition: 'color 0.2s'
            }}
          >
            Dashboard
          </MuiLink>
          <Typography color="text.primary" fontWeight={600}>
            Work Readiness Assignments
          </Typography>
        </Breadcrumbs>

        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <AssignmentIcon sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color="white"
                  sx={{
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  Work Readiness Assignments
                </Typography>
                <Typography
                  variant="body1"
                  color="rgba(255, 255, 255, 0.9)"
                  sx={{ mt: 0.5 }}
                >
                  Assign and manage work readiness assessments for your team members
                </Typography>
              </Box>
            </Box>

            {/* Quick Stats */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 2,
                mt: 3,
              }}
            >
              {[
                { label: 'Team', value: user?.team || 'N/A' },
                { label: 'Role', value: 'Team Leader' },
                { label: 'Status', value: 'Active' },
              ].map((stat, index) => (
                <Box
                  key={index}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <Typography
                    variant="caption"
                    color="rgba(255, 255, 255, 0.8)"
                    fontWeight={600}
                    sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography
                    variant="h6"
                    color="white"
                    fontWeight={700}
                    sx={{ mt: 0.5 }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>

        {/* Assignment Manager */}
        {user?.id && user?.team && (
          <WorkReadinessAssignmentManager 
            teamLeaderId={user.id} 
            team={user.team} 
          />
        )}
      </Container>
    </Box>
  );
};

export default WorkReadinessAssignments;
