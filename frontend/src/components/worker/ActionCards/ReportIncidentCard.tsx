import React, { memo } from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { Warning } from '@mui/icons-material';

interface ReportIncidentCardProps {
  onClick: () => void;
}

const ReportIncidentCard: React.FC<ReportIncidentCardProps> = memo(({ onClick }) => {
  return (
    <Grid item xs={12}>
      <Card 
        sx={{ 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          backgroundColor: 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          }
        }}
        onClick={onClick}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ mb: 2 }}>
            <Warning sx={{ fontSize: 48, color: '#1e293b' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Report Incident
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
});

ReportIncidentCard.displayName = 'ReportIncidentCard';

export default ReportIncidentCard;

