import React from 'react';
import { Grid, Card, CardContent, Box, Typography } from '@mui/material';
import { Assignment, LocalHospital, Assessment, CheckCircle } from '@mui/icons-material';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  pendingAssessments: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

const StatsCards: React.FC<StatsCardsProps> = React.memo(({ stats }) => {
  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          bgcolor: '#FFFFFF',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          borderRadius: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            borderColor: '#667eea'
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: 'rgba(102, 126, 234, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Assignment sx={{ fontSize: 28, color: '#667eea' }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#2d3748', mb: 0.5 }}>
              {stats.totalCases}
            </Typography>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              Total Cases
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          bgcolor: '#FFFFFF',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          borderRadius: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            borderColor: '#f093fb'
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: 'rgba(240, 147, 251, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <LocalHospital sx={{ fontSize: 28, color: '#f093fb' }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#2d3748', mb: 0.5 }}>
              {stats.activeCases}
            </Typography>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              Active Cases
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          bgcolor: '#FFFFFF',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          borderRadius: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            borderColor: '#4facfe'
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: 'rgba(79, 172, 254, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Assessment sx={{ fontSize: 28, color: '#4facfe' }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#2d3748', mb: 0.5 }}>
              {stats.pendingAssessments}
            </Typography>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              Pending Assessments
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          bgcolor: '#FFFFFF',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          borderRadius: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            borderColor: '#43e97b'
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: 'rgba(67, 233, 123, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle sx={{ fontSize: 28, color: '#43e97b' }} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 600, color: '#2d3748', mb: 0.5 }}>
              {stats.completedCases}
            </Typography>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              Completed Cases
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
});

StatsCards.displayName = 'StatsCards';

export default StatsCards;

