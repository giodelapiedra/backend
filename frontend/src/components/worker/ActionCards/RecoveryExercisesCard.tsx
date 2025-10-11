import React, { memo } from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { PlayArrow, CheckCircle } from '@mui/icons-material';

interface RecoveryExercisesCardProps {
  hasCompletedExercisesToday: boolean;
  exerciseCompletionTime: string | null;
  onClick: () => void;
}

const RecoveryExercisesCard: React.FC<RecoveryExercisesCardProps> = memo(({ 
  hasCompletedExercisesToday, 
  exerciseCompletionTime,
  onClick 
}) => {
  return (
    <Grid item xs={12}>
      <Card 
        sx={{ 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          backgroundColor: hasCompletedExercisesToday ? '#f0fdf4' : 'white',
          cursor: hasCompletedExercisesToday ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: hasCompletedExercisesToday ? 0.8 : 1,
          '&:hover': hasCompletedExercisesToday ? {} : {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          }
        }}
        onClick={hasCompletedExercisesToday ? undefined : onClick}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ mb: 2 }}>
            {hasCompletedExercisesToday ? (
              <CheckCircle sx={{ fontSize: 48, color: '#10b981' }} />
            ) : (
              <PlayArrow sx={{ fontSize: 48, color: '#1e293b' }} />
            )}
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: hasCompletedExercisesToday ? '#10b981' : '#1e293b' }}>
            {hasCompletedExercisesToday ? 'Exercises Completed Today' : 'Recovery Exercises'}
          </Typography>
          {hasCompletedExercisesToday && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#059669', fontWeight: 500, mb: 1 }}>
                ✅ You completed your exercises at {exerciseCompletionTime || 'Unknown time'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                Next session available at {(() => {
                  const now = new Date();
                  const currentHour = now.getHours();
                  
                  // If before 6:00 AM, available later today at 6:00 AM
                  if (currentHour < 6) {
                    return 'today at 6:00 AM';
                  } else {
                    // Otherwise, available tomorrow at 6:00 AM
                    return 'tomorrow at 6:00 AM';
                  }
                })()}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
});

RecoveryExercisesCard.displayName = 'RecoveryExercisesCard';

export default RecoveryExercisesCard;

