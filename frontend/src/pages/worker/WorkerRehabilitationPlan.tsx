import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  LinearProgress,
  Grid,
  Avatar,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  SkipNext,
  FitnessCenter,
  Timer,
  Assignment,
  Refresh,
} from '@mui/icons-material';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface Exercise {
  _id: string;
  name: string;
  description: string;
  duration: number;
  category: string;
  difficulty: string;
  instructions: string;
  completion?: {
    status: 'completed' | 'skipped' | 'not_started';
    completedAt?: string;
    skippedReason?: string;
    skippedNotes?: string;
    duration?: number;
  };
}

interface RehabilitationPlan {
  _id: string;
  planName: string;
  planDescription: string;
  status: 'active' | 'inactive' | 'completed';
  case: {
    _id: string;
    caseNumber: string;
    status: string;
  };
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  exercises: Exercise[];
  completion?: {
    date: string;
    exercises: any[];
    overallStatus: 'completed' | 'partial' | 'skipped' | 'not_started';
    completedAt?: string;
    notes?: string;
  };
  progressStats: {
    totalDays: number;
    completedDays: number;
    skippedDays: number;
    consecutiveCompletedDays: number;
    consecutiveSkippedDays: number;
    lastCompletedDate?: string;
    lastSkippedDate?: string;
  };
}

const WorkerRehabilitationPlan: React.FC = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<RehabilitationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [skipDialog, setSkipDialog] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipNotes, setSkipNotes] = useState('');
  const [completingExercise, setCompletingExercise] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      fetchRehabilitationPlan();
    }
  }, [user]);

  // Refresh data when component becomes visible (user navigates back to page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('Page became visible, refreshing rehabilitation plan...');
        fetchRehabilitationPlan();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const fetchRehabilitationPlan = async () => {
    try {
      setLoading(true);
      console.log('Fetching rehabilitation plan...', new Date().toISOString());
      
      const response = await api.get('/rehabilitation-plans');
      
      if (response.data.plans && response.data.plans.length > 0) {
        // Find the most recent active plan
        const activePlan = response.data.plans.find((p: RehabilitationPlan) => p.status === 'active');
        if (activePlan) {
          console.log('Found active plan:', activePlan._id);
          
          // Get today's exercises for this plan with cache busting
          const todayResponse = await api.get(`/rehabilitation-plans/${activePlan._id}/today?t=${Date.now()}`);
          console.log('Today\'s exercises response:', todayResponse.data);
          
          // The API returns { plan: {...}, exercises: [...], progressStats: {...} }
          // We need to merge this data into a single plan object
          const planData = {
            ...todayResponse.data.plan,
            exercises: todayResponse.data.exercises,
            progressStats: todayResponse.data.progressStats
          };
          
          console.log('Setting plan data:', planData);
          setPlan(planData);
          setLastRefreshTime(new Date());
        } else {
          setError('No active rehabilitation plan found');
        }
      } else {
        setError('No rehabilitation plan assigned');
      }
    } catch (err: any) {
      console.error('Error fetching rehabilitation plan:', err);
      setError(err.response?.data?.message || 'Failed to fetch rehabilitation plan');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteExercise = async (exerciseId: string) => {
    try {
      setCompletingExercise(exerciseId);
      
      await api.post(`/rehabilitation-plans/${plan?._id}/exercises/${exerciseId}/complete`, {
        completedDuration: plan?.exercises.find(e => e._id === exerciseId)?.duration
      });
      
      setSuccessMessage('Exercise marked as completed! Great job!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh the plan data
      await fetchRehabilitationPlan();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete exercise');
    } finally {
      setCompletingExercise(null);
    }
  };

  const handleSkipExercise = async () => {
    try {
      if (!selectedExercise || !skipReason) return;
      
      await api.post(`/rehabilitation-plans/${plan?._id}/exercises/${selectedExercise._id}/skip`, {
        reason: skipReason,
        notes: skipNotes
      });
      
      setSuccessMessage('Exercise marked as skipped. Remember to communicate any concerns with your clinician.');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Reset skip dialog
      setSkipDialog(false);
      setSelectedExercise(null);
      setSkipReason('');
      setSkipNotes('');
      
      // Refresh the plan data
      await fetchRehabilitationPlan();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to skip exercise');
    }
  };

  const handleCompleteAll = async () => {
    try {
      await api.post(`/rehabilitation-plans/${plan?._id}/complete-all`);
      
      setSuccessMessage('All exercises completed! Excellent work! 🎉');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Refresh the plan data
      await fetchRehabilitationPlan();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete all exercises');
    }
  };

  const openSkipDialog = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setSkipDialog(true);
  };

  const getExerciseStatusIcon = (exercise: Exercise) => {
    switch (exercise.completion?.status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'skipped':
        return <SkipNext color="warning" />;
      default:
        return <Schedule color="action" />;
    }
  };


  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'error';
      default:
        return 'default';
    }
  };


  const completedExercises = plan?.exercises.filter(e => e.completion?.status === 'completed').length || 0;
  const totalExercises = plan?.exercises.length || 0;
  const progressPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={fetchRehabilitationPlan}>
            Try Again
          </Button>
        </Box>
      </Layout>
    );
  }

  if (!plan) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="info">
            No rehabilitation plan assigned. Please contact your clinician.
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: '#333' }}>
              Today's Recovery Plan
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchRehabilitationPlan}
              disabled={loading}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#f0f9ff',
                  borderColor: '#3b82f6',
                },
              }}
            >
              Refresh
            </Button>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {plan?.planDescription || 'No description available'}
          </Typography>
          
          {lastRefreshTime && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Last updated: {lastRefreshTime.toLocaleString()}
            </Typography>
          )}
          
          {/* Progress */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress: {completedExercises}/{totalExercises} Complete
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progressPercentage)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progressPercentage} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Case Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Assignment />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    Case: {plan?.case?.caseNumber || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {plan?.case?.status || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Success Message */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        {/* Exercises List */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FitnessCenter />
              Today's Exercises
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {plan?.exercises?.map((exercise, index) => (
                <Card 
                  key={exercise._id} 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    border: '1px solid #e0e0e0',
                    '&:hover': {
                      boxShadow: 2
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: '2px solid #e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: exercise.completion?.status === 'completed' ? '#4caf50' : 'transparent'
                      }}>
                        {exercise.completion?.status === 'completed' && (
                          <CheckCircle sx={{ color: 'white', fontSize: 16 }} />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {exercise.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {exercise.description}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Timer fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {exercise.duration} min
                        </Typography>
                      </Box>
                      {exercise.completion?.status === 'not_started' && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircle />}
                            onClick={() => handleCompleteExercise(exercise._id)}
                            disabled={completingExercise === exercise._id}
                          >
                            Done
                          </Button>
                          <Button
                            variant="outlined"
                            color="warning"
                            size="small"
                            startIcon={<SkipNext />}
                            onClick={() => openSkipDialog(exercise)}
                          >
                            Skip
                          </Button>
                        </Box>
                      )}
                      {exercise.completion?.status === 'completed' && (
                        <Chip label="Completed" color="success" size="small" />
                      )}
                      {exercise.completion?.status === 'skipped' && (
                        <Chip label="Skipped" color="warning" size="small" />
                      )}
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Complete All Button */}
        {completedExercises < totalExercises && (
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CheckCircle />}
              onClick={handleCompleteAll}
              sx={{ px: 4, py: 1.5 }}
            >
              All Done
            </Button>
          </Box>
        )}

        {/* Progress Stats */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Progress Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {plan?.progressStats?.completedDays || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Days Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {plan?.progressStats?.consecutiveCompletedDays || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Consecutive Days
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {plan?.progressStats?.skippedDays || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Days Skipped
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {plan?.progressStats?.totalDays || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Days
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Skip Exercise Dialog */}
        <Dialog open={skipDialog} onClose={() => setSkipDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Skip Exercise</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Why are you skipping "{selectedExercise?.name}"?
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Reason</InputLabel>
              <Select
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                label="Reason"
              >
                <MenuItem value="pain">Pain or discomfort</MenuItem>
                <MenuItem value="fatigue">Fatigue</MenuItem>
                <MenuItem value="time_constraint">Time constraint</MenuItem>
                <MenuItem value="equipment">Missing equipment</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Additional Notes (Optional)"
              multiline
              rows={3}
              value={skipNotes}
              onChange={(e) => setSkipNotes(e.target.value)}
              placeholder="Please provide any additional details..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSkipDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSkipExercise} 
              variant="contained" 
              color="warning"
              disabled={!skipReason}
            >
              Skip Exercise
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default WorkerRehabilitationPlan;
