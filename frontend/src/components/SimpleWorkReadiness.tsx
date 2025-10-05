import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Slider,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  Fade,
  Zoom,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Close,
} from '@mui/icons-material';

interface SimpleWorkReadinessProps {
  onSubmit: (data: WorkReadinessData) => void;
  onClose: () => void;
  loading?: boolean;
  success?: boolean;
  error?: string | null;
  hasSubmittedToday?: boolean;
}

interface WorkReadinessData {
  painLevel: number;
  fatigueLevel: number;
  sleepHours: number;
  stressLevel: number;
  notes?: string;
}

const SimpleWorkReadiness: React.FC<SimpleWorkReadinessProps> = ({ 
  onSubmit, 
  onClose, 
  loading = false, 
  success = false, 
  error,
  hasSubmittedToday = false
}) => {
  const [formData, setFormData] = useState<WorkReadinessData>({
    painLevel: 0,
    fatigueLevel: 0,
    sleepHours: 7,
    stressLevel: 0,
    notes: '',
  });

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const getReadinessStatus = () => {
    const { painLevel, fatigueLevel, sleepHours, stressLevel } = formData;
    
    // Simple scoring algorithm
    let score = 100;
    score -= painLevel * 8; // Pain has high impact
    score -= fatigueLevel * 6; // Fatigue has medium-high impact
    score -= stressLevel * 5; // Stress has medium impact
    
    // Sleep impact
    if (sleepHours < 6) score -= 15;
    else if (sleepHours < 7) score -= 8;
    else if (sleepHours > 9) score -= 5;
    
    if (score >= 80) return { status: 'Green', color: '#22c55e', message: 'Ready for work' };
    if (score >= 60) return { status: 'Yellow', color: '#f59e0b', message: 'Minor concerns' };
    return { status: 'Red', color: '#ef4444', message: 'Not ready for work' };
  };

  const readiness = getReadinessStatus();

  // Success Modal Component
  const SuccessModal = () => (
    <Dialog
      open={success}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            p: 4,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <Zoom in={success} timeout={500}>
            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.05)' },
                  '100%': { transform: 'scale(1)' },
                },
              }}
            >
              <CheckCircle sx={{ fontSize: 40 }} />
            </Box>
          </Zoom>
          
          <Fade in={success} timeout={800}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                🎉 Success!
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
                Work Readiness Submitted!
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                Your assessment has been recorded. Stay safe! 💪
              </Typography>
            </Box>
          </Fade>
        </Box>
        
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              backgroundColor: '#10b981',
              '&:hover': { backgroundColor: '#059669' },
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 600,
            }}
          >
            Continue
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );

  const ErrorModal = () => (
    <Dialog
      open={!!error}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            p: 4,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <Zoom in={!!error} timeout={500}>
            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Error sx={{ fontSize: 40 }} />
            </Box>
          </Zoom>
          
          <Fade in={!!error} timeout={800}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                ⚠️ Oops!
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
                {error === 'already_submitted' ? 'Already Submitted Today' : 'Something Went Wrong'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                {error === 'already_submitted' 
                  ? 'You have already submitted your work readiness assessment for today.' 
                  : 'Please try again or contact support if the problem persists.'}
              </Typography>
            </Box>
          </Fade>
        </Box>
        
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              backgroundColor: '#ef4444',
              '&:hover': { backgroundColor: '#dc2626' },
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 600,
            }}
          >
            Try Again
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );

  // Show success/error modals if needed
  if (success) return <SuccessModal />;
  if (error) return <ErrorModal />;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 500,
          maxHeight: '90vh',
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backgroundColor: 'white',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
            color: 'white',
            p: 4,
            position: 'relative',
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
              minWidth: 'auto',
              width: 40,
              height: 40,
              borderRadius: '50%',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            <Close />
          </Button>
          
          <Box textAlign="center">
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Daily Check-In
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem' }}>
              Takes 15 seconds • Help us keep you safe
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: 3, flex: 1, overflow: 'auto' }}>
          {/* Main Question */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#1e40af' }}>
              How are you feeling today?
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Move the sliders to rate each area (0 = none, 10 = severe)
            </Typography>
          </Box>

          {/* Pain Level */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Pain Level
              </Typography>
              <Chip 
                label={`${formData.painLevel}/10`} 
                size="small"
                sx={{ 
                  backgroundColor: formData.painLevel === 0 ? '#22c55e' : formData.painLevel <= 3 ? '#f59e0b' : '#ef4444',
                  color: 'white',
                  fontWeight: 600,
                }} 
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
              Any aches or discomfort
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={formData.painLevel}
                onChange={(_, value) => setFormData({ ...formData, painLevel: value as number })}
                min={0}
                max={10}
                step={1}
                sx={{
                  '& .MuiSlider-track': {
                    background: 'linear-gradient(to right, #22c55e 0%, #f59e0b 50%, #ef4444 100%)',
                    height: 8,
                    borderRadius: 4,
                  },
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    backgroundColor: formData.painLevel === 0 ? '#22c55e' : formData.painLevel <= 3 ? '#f59e0b' : '#ef4444',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Fatigue Level */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Fatigue Level
              </Typography>
              <Chip 
                label={`${formData.fatigueLevel}/10`} 
                size="small"
                sx={{ 
                  backgroundColor: formData.fatigueLevel === 0 ? '#22c55e' : formData.fatigueLevel <= 3 ? '#f59e0b' : '#ef4444',
                  color: 'white',
                  fontWeight: 600,
                }} 
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
              How tired do you feel
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={formData.fatigueLevel}
                onChange={(_, value) => setFormData({ ...formData, fatigueLevel: value as number })}
                min={0}
                max={10}
                step={1}
                sx={{
                  '& .MuiSlider-track': {
                    background: 'linear-gradient(to right, #22c55e 0%, #f59e0b 50%, #ef4444 100%)',
                    height: 8,
                    borderRadius: 4,
                  },
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    backgroundColor: formData.fatigueLevel === 0 ? '#22c55e' : formData.fatigueLevel <= 3 ? '#f59e0b' : '#ef4444',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Sleep Quality */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Sleep Quality
              </Typography>
              <Chip 
                label={`${formData.sleepHours} hours`} 
                size="small"
                sx={{ 
                  backgroundColor: formData.sleepHours >= 7 ? '#22c55e' : formData.sleepHours >= 5 ? '#f59e0b' : '#ef4444',
                  color: 'white',
                  fontWeight: 600,
                }} 
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
              Hours of sleep last night
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={formData.sleepHours}
                onChange={(_, value) => setFormData({ ...formData, sleepHours: value as number })}
                min={0}
                max={12}
                step={0.5}
                sx={{
                  '& .MuiSlider-track': {
                    background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #22c55e 100%)',
                    height: 8,
                    borderRadius: 4,
                  },
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    backgroundColor: formData.sleepHours >= 7 ? '#22c55e' : formData.sleepHours >= 5 ? '#f59e0b' : '#ef4444',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Stress Level */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Stress Level
              </Typography>
              <Chip 
                label={`${formData.stressLevel}/10`} 
                size="small"
                sx={{ 
                  backgroundColor: formData.stressLevel === 0 ? '#22c55e' : formData.stressLevel <= 3 ? '#f59e0b' : '#ef4444',
                  color: 'white',
                  fontWeight: 600,
                }} 
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
              Work or personal stress
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={formData.stressLevel}
                onChange={(_, value) => setFormData({ ...formData, stressLevel: value as number })}
                min={0}
                max={10}
                step={1}
                sx={{
                  '& .MuiSlider-track': {
                    background: 'linear-gradient(to right, #22c55e 0%, #f59e0b 50%, #ef4444 100%)',
                    height: 8,
                    borderRadius: 4,
                  },
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    backgroundColor: formData.stressLevel === 0 ? '#22c55e' : formData.stressLevel <= 3 ? '#f59e0b' : '#ef4444',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Additional Notes */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
              Additional Notes (Optional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Any concerns or areas that need attention?"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: '#e2e8f0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#cbd5e1',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3b82f6',
                  },
                },
              }}
            />
          </Box>

          {/* Predicted Readiness */}
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            backgroundColor: '#f8fafc', 
            borderRadius: 2,
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
              Predicted Readiness
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                color: readiness.color,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              {readiness.status}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              {readiness.message}
            </Typography>
          </Box>

          {/* Submit Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={loading || hasSubmittedToday}
            sx={{
              py: 2,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 700,
              backgroundColor: '#22c55e',
              '&:hover': {
                backgroundColor: '#16a34a',
                transform: 'translateY(-1px)',
                boxShadow: '0 8px 20px rgba(34, 197, 94, 0.4)',
              },
              '&:disabled': {
                backgroundColor: '#cbd5e1',
                color: '#64748b',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            {loading ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={24} color="inherit" />
                Submitting...
              </Box>
            ) : hasSubmittedToday ? (
              'Already Submitted Today'
            ) : (
              'Submit Check-In'
            )}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SimpleWorkReadiness;
