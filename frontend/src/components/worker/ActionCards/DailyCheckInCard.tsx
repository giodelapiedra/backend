import React, { memo } from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { Favorite } from '@mui/icons-material';

interface DailyCheckInCardProps {
  onClick: () => void;
}

const DailyCheckInCard: React.FC<DailyCheckInCardProps> = memo(({ onClick }) => {
  return (
    <Grid item xs={12}>
      <Card 
        sx={{ 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(59, 130, 246, 0.25)',
          }
        }}
        onClick={onClick}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ mb: 2 }}>
            <Favorite sx={{ fontSize: 48, opacity: 0.9 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Daily Check-In
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
});

DailyCheckInCard.displayName = 'DailyCheckInCard';

export default DailyCheckInCard;

