import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Slider,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogContent,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Work,
  SentimentVerySatisfied,
  SentimentNeutral,
  SentimentDissatisfied,
  Bedtime,
  Close,
  Assignment,
  CheckCircle,
  Error,
  Celebration,
} from '@mui/icons-material';
import api from '../utils/api';

interface SimpleCheckInProps {
  onSubmit: (data: CheckInData & { caseId: string }) => void;
  onClose: () => void;
  loading?: boolean;
  success?: boolean;
  error?: string | null;
}

interface CheckInData {
  painLevel: number;
  canDoJob: 'yes' | 'modified' | 'no';
  mood: 'great' | 'okay' | 'poor';
  sleepQuality: 'good' | 'ok' | 'poor';
}

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  injuryDetails: {
    bodyPart: string;
    injuryType: string;
    description: string;
  };
}

const SimpleCheckIn: React.FC<SimpleCheckInProps> = ({ onSubmit, onClose, loading = false, success = false, error }) => {
  const [checkInData, setCheckInData] = useState<CheckInData>({
    painLevel: 3,
    canDoJob: 'yes',
    mood: 'great',
    sleepQuality: 'good',
  });

  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [casesLoading, setCasesLoading] = useState(true);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setCasesLoading(true);
      const response = await api.get('/cases');
      setCases(response.data.cases || []);
      
      // Auto-select if only one case
      if (response.data.cases && response.data.cases.length === 1) {
        setSelectedCaseId(response.data.cases[0]._id);
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setCasesLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedCaseId) {
      alert('Please select a case before submitting your check-in.');
      return;
    }
    onSubmit({ ...checkInData, caseId: selectedCaseId });
  };

  const getPainColor = (value: number) => {
    if (value <= 3) return '#22c55e'; // Green
    if (value <= 6) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getPainLabel = (value: number) => {
    if (value <= 2) return 'No pain';
    if (value <= 4) return 'Mild';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'Severe';
    return 'Extreme';
  };

  // Success/Error Modal Component
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
                Daily Check-In Submitted Successfully!
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                Your progress has been recorded. Keep up the great work! 💪
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
                {error === 'duplicate' ? 'Check-in Already Exists for Today' : 'Something Went Wrong'}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                {error === 'duplicate' 
                  ? 'You have already submitted a check-in for today. Please try again tomorrow.' 
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
          borderRadius: 3,
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          backgroundColor: 'white',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            p: 3,
            borderRadius: '12px 12px 0 0',
            position: 'relative',
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            <Close />
          </IconButton>
          
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontSize: '1.2rem' }}>💙</Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                Today's Check-In
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Help us track your recovery progress
              </Typography>
            </Box>
          </Box>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {/* Case Selection */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
              Select Case
            </Typography>
            {casesLoading ? (
              <Box display="flex" alignItems="center" gap={2}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading your cases...
                </Typography>
              </Box>
            ) : cases.length === 0 ? (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                No active cases found. Please contact your case manager.
              </Alert>
            ) : cases.length === 1 ? (
              <Box sx={{ 
                backgroundColor: '#f0f9ff',
                borderRadius: 2,
                p: 2,
                border: '1px solid #bae6fd'
              }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Assignment sx={{ color: '#0369a1' }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0369a1' }}>
                      {cases[0].caseNumber}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cases[0].injuryDetails.bodyPart} - {cases[0].injuryDetails.injuryType}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Select Case</InputLabel>
                <Select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  label="Select Case"
                  sx={{ borderRadius: 2 }}
                >
                  {cases.map((caseItem) => (
                    <MenuItem key={caseItem._id} value={caseItem._id}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {caseItem.caseNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {caseItem.injuryDetails.bodyPart} - {caseItem.injuryDetails.injuryType}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* Pain Level Slider */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
              Pain Level (0-10)
            </Typography>
            <Box sx={{ px: 2 }}>
              <Slider
                value={checkInData.painLevel}
                onChange={(_, value) => setCheckInData({ ...checkInData, painLevel: value as number })}
                min={0}
                max={10}
                step={1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 2, label: '2' },
                  { value: 4, label: '4' },
                  { value: 6, label: '6' },
                  { value: 8, label: '8' },
                  { value: 10, label: '10' },
                ]}
                sx={{
                  '& .MuiSlider-track': {
                    background: `linear-gradient(to right, #22c55e 0%, #f59e0b 50%, #ef4444 100%)`,
                    height: 8,
                    borderRadius: 4,
                  },
                  '& .MuiSlider-thumb': {
                    width: 24,
                    height: 24,
                    backgroundColor: getPainColor(checkInData.painLevel),
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    },
                  },
                  '& .MuiSlider-mark': {
                    backgroundColor: '#cbd5e1',
                    width: 2,
                    height: 2,
                  },
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: 500,
                  },
                }}
              />
              <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                  No pain
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                  Severe pain
                </Typography>
              </Box>
              <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                <Chip
                  label={`${checkInData.painLevel} - ${getPainLabel(checkInData.painLevel)}`}
                  sx={{
                    backgroundColor: getPainColor(checkInData.painLevel),
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Job Status */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
              Can you do your normal job today?
            </Typography>
            <Box display="flex" gap={1}>
              {[
                { value: 'yes', label: 'Yes' },
                { value: 'modified', label: 'Modified' },
                { value: 'no', label: 'No' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={checkInData.canDoJob === option.value ? 'contained' : 'outlined'}
                  onClick={() => setCheckInData({ ...checkInData, canDoJob: option.value as any })}
                  startIcon={<Work />}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: checkInData.canDoJob === option.value ? '#3b82f6' : 'transparent',
                    borderColor: '#3b82f6',
                    color: checkInData.canDoJob === option.value ? 'white' : '#3b82f6',
                    '&:hover': {
                      backgroundColor: checkInData.canDoJob === option.value ? '#2563eb' : '#f0f9ff',
                      borderColor: '#2563eb',
                    },
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Mood */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
              Mood Today
            </Typography>
            <Box display="flex" justifyContent="space-around">
              {[
                { value: 'great', emoji: '😊', label: 'Great' },
                { value: 'okay', emoji: '😐', label: 'Okay' },
                { value: 'poor', emoji: '😞', label: 'Poor' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={checkInData.mood === option.value ? 'contained' : 'outlined'}
                  onClick={() => setCheckInData({ ...checkInData, mood: option.value as any })}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    py: 2,
                    px: 3,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: checkInData.mood === option.value ? '#f0f9ff' : 'transparent',
                    borderColor: checkInData.mood === option.value ? '#3b82f6' : '#e2e8f0',
                    color: checkInData.mood === option.value ? '#1e40af' : '#64748b',
                    '&:hover': {
                      backgroundColor: checkInData.mood === option.value ? '#dbeafe' : '#f8fafc',
                      borderColor: checkInData.mood === option.value ? '#2563eb' : '#cbd5e1',
                    },
                  }}
                >
                  <Typography sx={{ fontSize: '2rem' }}>{option.emoji}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {option.label}
                  </Typography>
                </Button>
              ))}
            </Box>
          </Box>

          {/* Sleep Quality */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}>
              Sleep Quality
            </Typography>
            <Box display="flex" justifyContent="space-around">
              {[
                { value: 'good', label: 'Good' },
                { value: 'ok', label: 'OK' },
                { value: 'poor', label: 'Poor' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={checkInData.sleepQuality === option.value ? 'contained' : 'outlined'}
                  onClick={() => setCheckInData({ ...checkInData, sleepQuality: option.value as any })}
                  startIcon={<Bedtime />}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: checkInData.sleepQuality === option.value ? '#8b5cf6' : 'transparent',
                    borderColor: '#8b5cf6',
                    color: checkInData.sleepQuality === option.value ? 'white' : '#8b5cf6',
                    '&:hover': {
                      backgroundColor: checkInData.sleepQuality === option.value ? '#7c3aed' : '#f3e8ff',
                      borderColor: '#7c3aed',
                    },
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Submit Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={loading || !selectedCaseId || casesLoading}
            sx={{
              py: 2,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 700,
              backgroundColor: '#3b82f6',
              '&:hover': {
                backgroundColor: '#2563eb',
              },
              '&:disabled': {
                backgroundColor: '#cbd5e1',
                color: '#64748b',
              },
            }}
          >
            {loading ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={20} color="inherit" />
                Submitting...
              </Box>
            ) : casesLoading ? (
              'Loading Cases...'
            ) : !selectedCaseId ? (
              'Select Case First'
            ) : (
              'Submit Check-In'
            )}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SimpleCheckIn;
