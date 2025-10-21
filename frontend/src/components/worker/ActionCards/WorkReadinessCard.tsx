import React, { memo } from 'react';
import { Card, CardContent, Typography, Box, Grid, Alert, Button } from '@mui/material';
import { Work, CheckCircle } from '@mui/icons-material';

interface WorkReadinessCardProps {
  hasSubmittedToday: boolean;
  todaySubmission: any;
  currentAssignment: any;
  onClick: () => void;
}

const WorkReadinessCard: React.FC<WorkReadinessCardProps> = memo(({ 
  hasSubmittedToday,
  todaySubmission,
  currentAssignment,
  onClick 
}) => {
  return (
    <Grid item xs={12}>
      <Card 
        sx={{ 
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          backgroundColor: hasSubmittedToday ? '#f0f9ff' : 'white',
          cursor: hasSubmittedToday ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: hasSubmittedToday ? 0.7 : 1,
          '&:hover': hasSubmittedToday ? {} : {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          }
        }}
        onClick={hasSubmittedToday ? undefined : onClick}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ mb: 2 }}>
            {hasSubmittedToday && todaySubmission ? (
              <CheckCircle sx={{ fontSize: 48, color: '#10b981' }} />
            ) : hasSubmittedToday && !todaySubmission ? (
              <Work sx={{ fontSize: 48, color: '#ef4444' }} />
            ) : (
              <Work sx={{ fontSize: 48, color: '#1e293b' }} />
            )}
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 600, color: hasSubmittedToday ? '#10b981' : '#1e293b' }}>
            {hasSubmittedToday && todaySubmission ? 'Already Submitted Today' : 
             hasSubmittedToday && !todaySubmission ? 'No Assignment Today' : 'Work Readiness'}
          </Typography>
          {hasSubmittedToday && todaySubmission && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Submitted at {(() => {
                try {
                  const submittedAt = todaySubmission.submitted_at || todaySubmission.submittedAt;
                  if (!submittedAt) return 'Unknown time';
                  const date = new Date(submittedAt);
                  return isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleTimeString();
                } catch {
                  return 'Unknown time';
                }
              })()}
              </Typography>
            </Box>
          )}
          {hasSubmittedToday && !todaySubmission && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 500 }}>
                Wait for your team leader to assign you work readiness
              </Typography>
            </Box>
          )}
          {!hasSubmittedToday && (
            <Box sx={{ mt: 2 }}>
              <Alert 
                severity="info" 
                sx={{ 
                  backgroundColor: '#e0f2fe', 
                  border: '1px solid #0288d1',
                  '& .MuiAlert-icon': { color: '#0288d1' },
                  '& .MuiAlert-message': { color: '#01579b' }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ⏰ Complete by {currentAssignment?.due_time 
                    ? new Date(currentAssignment.due_time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      })
                    : 'end of day (11:59 PM)'
                  }
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, mb: 2 }}>
                  You have been assigned work readiness assessment for today. Please complete it before the deadline.
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={onClick}
                  sx={{
                    backgroundColor: '#0288d1',
                    color: 'white',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#01579b',
                    }
                  }}
                >
                  Start Assessment
                </Button>
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
});

WorkReadinessCard.displayName = 'WorkReadinessCard';

export default WorkReadinessCard;
export {};

