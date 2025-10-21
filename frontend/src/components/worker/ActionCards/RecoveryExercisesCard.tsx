import React, { memo } from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { PlayArrow, CheckCircle, PersonOff } from '@mui/icons-material';

interface RecoveryExercisesCardProps {
  hasCompletedExercisesToday: boolean;
  exerciseCompletionTime: string | null;
  hasAssignedClinician: boolean;
  clinicianName?: string;
  onClick: () => void;
}

const RecoveryExercisesCard: React.FC<RecoveryExercisesCardProps> = memo(({ 
  hasCompletedExercisesToday, 
  exerciseCompletionTime,
  hasAssignedClinician,
  clinicianName,
  onClick 
}) => {
  // Determine if the card should be disabled
  const isDisabled = hasCompletedExercisesToday || !hasAssignedClinician;
  
  return (
    <Grid item xs={12}>
      <Card 
        sx={{ 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          backgroundColor: isDisabled ? '#f9fafb' : 'white',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: isDisabled ? 0.6 : 1,
          '&:hover': isDisabled ? {} : {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          }
        }}
        onClick={isDisabled ? undefined : onClick}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ mb: 2 }}>
            {hasCompletedExercisesToday ? (
              <CheckCircle sx={{ fontSize: 48, color: '#10b981' }} />
            ) : !hasAssignedClinician ? (
              <PersonOff sx={{ fontSize: 48, color: '#9ca3af' }} />
            ) : (
              <PlayArrow sx={{ fontSize: 48, color: '#1e293b' }} />
            )}
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: isDisabled ? '#9ca3af' : '#1e293b' }}>
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
          
          {!hasAssignedClinician && !hasCompletedExercisesToday && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 500, mb: 1 }}>
                ❌ No clinician assigned
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                Recovery exercises will be available once a clinician is assigned to your case
              </Typography>
            </Box>
          )}
          
          {hasAssignedClinician && !hasCompletedExercisesToday && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#059669', fontWeight: 500, mb: 1 }}>
                ✅ Assigned to Dr. {clinicianName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                Ready to start your recovery exercises
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
export {};






