import React, { useMemo } from 'react';
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

interface StatCardData {
  icon: React.ElementType;
  value: number;
  label: string;
  hoverColor: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardData> = React.memo(({ icon: Icon, value, label, hoverColor, bgColor }) => {
  const cardStyle = {
    bgcolor: '#FFFFFF',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    borderRadius: 2,
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      borderColor: hoverColor
    }
  };

  const iconContainerStyle = {
    width: 48, 
    height: 48, 
    borderRadius: 2, 
    bgcolor: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <Grid item xs={12} sm={6} md={3}>
      <Card sx={cardStyle}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={iconContainerStyle}>
              <Icon sx={{ fontSize: 28, color: hoverColor }} />
            </Box>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#2d3748', mb: 0.5 }}>
            {value}
          </Typography>
          <Typography variant="body2" sx={{ color: '#718096' }}>
            {label}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
});

StatCard.displayName = 'StatCard';

const StatsCards: React.FC<StatsCardsProps> = React.memo(({ stats }) => {
  const cardData = useMemo<StatCardData[]>(() => [
    {
      icon: Assignment,
      value: stats.totalCases,
      label: 'Total Cases',
      hoverColor: '#667eea',
      bgColor: 'rgba(102, 126, 234, 0.1)'
    },
    {
      icon: LocalHospital,
      value: stats.activeCases,
      label: 'Active Cases',
      hoverColor: '#f093fb',
      bgColor: 'rgba(240, 147, 251, 0.1)'
    },
    {
      icon: Assessment,
      value: stats.completedCases,
      label: 'Completed Cases',
      hoverColor: '#4facfe',
      bgColor: 'rgba(79, 172, 254, 0.1)'
    },
    {
      icon: CheckCircle,
      value: stats.pendingAssessments,
      label: 'Pending Confirmation',
      hoverColor: '#43e97b',
      bgColor: 'rgba(67, 233, 123, 0.1)'
    }
  ], [stats]);

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {cardData.map((card, index) => (
        <StatCard
          key={index}
          icon={card.icon}
          value={card.value}
          label={card.label}
          hoverColor={card.hoverColor}
          bgColor={card.bgColor}
        />
      ))}
    </Grid>
  );
});

StatsCards.displayName = 'StatsCards';

export default StatsCards;