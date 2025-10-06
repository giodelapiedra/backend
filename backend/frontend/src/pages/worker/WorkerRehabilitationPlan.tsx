import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  PlayArrow,
} from '@mui/icons-material';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext.supabase';

type ExerciseStatus = 'completed' | 'skipped' | 'not_started';

interface Exercise {
  _id: string;
  name: string;
  description: string;
  duration: number;
  category: string;
  difficulty: string;
  instructions: string;
  completion?: {
    status: ExerciseStatus;
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

// Interface for exercise timer state
interface ExerciseTimer {
  exerciseId: string;
  startTime: number; // timestamp when started
  duration: number; // in seconds
  remaining: number; // remaining seconds
  isRunning: boolean;
}

// Loading overlay component
const LoadingOverlay: React.FC<{ message?: string }> = ({ message }) => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      gap: 2
    }}
  >
    <CircularProgress />
    {message && (
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    )}
  </Box>
);

const WorkerRehabilitationPlan: React.FC = (): JSX.Element => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<RehabilitationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [skipDialog, setSkipDialog] = useState(false);
  const [skipConfirmDialog, setSkipConfirmDialog] = useState(false);
  const [painDialog, setPainDialog] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [skipNotes, setSkipNotes] = useState('');
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [painNotes, setPainNotes] = useState('');
  const [completingExercise, setCompletingExercise] = useState<string | null>(null);
  
  // State for exercise timers
  const [exerciseTimers, setExerciseTimers] = useState<ExerciseTimer[]>([]);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // Initialize loading state
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        await Promise.all([
          fetchRehabilitationPlan(),
          loadTimersFromLocalStorage()
        ]);
        
        if (mounted) {
          setIsInitialLoad(false);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setError('Failed to load rehabilitation plan');
          setLoading(false);
        }
      }
    };

    initializeData();

    // Cleanup function
    return () => {
      mounted = false;
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [user, id]);
  
  // Load timers from localStorage
  const loadTimersFromLocalStorage = () => {
    try {
      const savedTimers = localStorage.getItem('exerciseTimers');
      if (savedTimers) {
        const parsedTimers = JSON.parse(savedTimers) as ExerciseTimer[];
        
        // Update remaining time based on elapsed time since last save
        const updatedTimers = parsedTimers.map(timer => {
          if (timer.isRunning) {
            const elapsedSeconds = Math.floor((Date.now() - timer.startTime) / 1000);
            const newRemaining = Math.max(0, timer.duration - elapsedSeconds);
            return { ...timer, remaining: newRemaining };
          }
          return timer;
        });
        
        setExerciseTimers(updatedTimers);
        
        // Start the timer interval if there are running timers
        if (updatedTimers.some(t => t.isRunning)) {
          startTimerInterval();
        }
      }
    } catch (error) {
      console.error('Error loading timers from localStorage:', error);
    }
  };
  
  // Save timers to localStorage
  const saveTimersToLocalStorage = (timers: ExerciseTimer[]) => {
    try {
      localStorage.setItem('exerciseTimers', JSON.stringify(timers));
    } catch (error) {
      console.error('Error saving timers to localStorage:', error);
    }
  };
  
  // Start the timer interval
  const startTimerInterval = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    const interval = setInterval(() => {
      setExerciseTimers(prevTimers => {
        const updatedTimers = prevTimers.map(timer => {
          if (timer.isRunning) {
            const newRemaining = Math.max(0, timer.remaining - 1);
            return { ...timer, remaining: newRemaining };
          }
          return timer;
        });
        
        // Save updated timers to localStorage
        saveTimersToLocalStorage(updatedTimers);
        
        // If all timers have stopped, clear the interval
        if (!updatedTimers.some(t => t.isRunning)) {
          if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
          }
        }
        
        return updatedTimers;
      });
    }, 1000);
    
    setTimerInterval(interval);
  };
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  const fetchRehabilitationPlan = async () => {
    try {
      setLoading(true);
      console.log('Fetching rehabilitation plan, ID from URL:', id);
      
      // If ID is provided in the URL, fetch that specific plan
      if (id) {
        try {
          console.log('Fetching specific plan with ID:', id);
          // Get today's exercises for this specific plan
          // Skip API call - using Supabase auth
          console.log('Rehabilitation plan fetch skipped - using Supabase auth');
          const todayResponse = { 
            data: { 
              exercises: [],
              plan: { 
                _id: id, 
                planName: 'Sample Plan',
                planDescription: 'Sample plan description',
                status: 'active' as const,
                case: { _id: '1', caseNumber: 'CASE-001', status: 'active' },
                worker: { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                exercises: [],
                progressStats: { totalDays: 0, completedDays: 0, skippedDays: 0, consecutiveCompletedDays: 0, consecutiveSkippedDays: 0 }
              },
              progressStats: { totalDays: 0, completedDays: 0, skippedDays: 0, consecutiveCompletedDays: 0, consecutiveSkippedDays: 0 }
            } 
          };
          
          // The API returns { plan: {...}, exercises: [...], progressStats: {...} }
          // We need to merge this data into a single plan object
          const planData = {
            ...todayResponse.data.plan,
            exercises: todayResponse.data.exercises,
            progressStats: todayResponse.data.progressStats
          };
          console.log('Setting plan data for specific plan:', planData);
          setPlan(planData);
        } catch (planError) {
          console.error("Error fetching specific plan:", planError);
          setError('Failed to load the specified rehabilitation plan');
        }
      } else {
        // If no ID provided, get all plans and use the active one
        console.log('No ID provided, fetching all plans');
        // Skip API call - using Supabase auth
        console.log('Rehabilitation plans fetch skipped - using Supabase auth');
        const response = { 
          data: { 
            plans: [
              { 
                _id: '1', 
                planName: 'Sample Plan',
                planDescription: 'Sample plan description',
                status: 'active' as const,
                case: { _id: '1', caseNumber: 'CASE-001', status: 'active' },
                worker: { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                exercises: [],
                progressStats: { totalDays: 0, completedDays: 0, skippedDays: 0, consecutiveCompletedDays: 0, consecutiveSkippedDays: 0 }
              }
            ] 
          } 
        };
        
        if (response.data.plans && response.data.plans.length > 0) {
          console.log('Found', response.data.plans.length, 'plans');
          
          // First try to find an active plan
          const activePlan = response.data.plans.find((p: RehabilitationPlan) => p.status === 'active');
          console.log('Active plan found:', activePlan ? 'Yes' : 'No', activePlan ? `(ID: ${activePlan._id})` : '');
          
          // If no active plan, use the most recent plan
          const planToUse = activePlan || response.data.plans[0];
          
          if (planToUse) {
            // Get today's exercises for this plan
            console.log('Fetching exercises for plan ID:', planToUse._id, 'Status:', planToUse.status);
            // Skip API call - using Supabase auth
            console.log('Rehabilitation plan exercises fetch skipped - using Supabase auth');
            const todayResponse = { 
              data: { 
                exercises: [],
                plan: { 
                  _id: planToUse._id, 
                  planName: planToUse.planName,
                  planDescription: planToUse.planDescription,
                  status: planToUse.status,
                  case: planToUse.case,
                  worker: planToUse.worker,
                  exercises: [],
                  progressStats: planToUse.progressStats
                },
                progressStats: planToUse.progressStats
              } 
            };
            
            // The API returns { plan: {...}, exercises: [...], progressStats: {...} }
            // We need to merge this data into a single plan object
            const planData = {
              ...todayResponse.data.plan,
              exercises: todayResponse.data.exercises
            };
            console.log('Setting plan data:', planData);
            setPlan(planData);
          } else {
            console.log('No plans found among', response.data.plans.length, 'plans');
            console.log('Plan statuses:', response.data.plans.map((p: RehabilitationPlan) => p.status).join(', '));
            setError('No rehabilitation plan found');
          }
        } else {
          console.log('No plans returned from API');
          setError('No rehabilitation plan assigned');
        }
      }
    } catch (err: any) {
      console.error('Error in fetchRehabilitationPlan:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch rehabilitation plan');
    } finally {
      setLoading(false);
    }
  };

  // Start an exercise timer
  const handleStartExercise = (exerciseId: string) => {
    const exercise = plan?.exercises.find(e => e._id === exerciseId);
    if (!exercise) return;
    
    // Convert minutes to seconds
    const durationInSeconds = exercise.duration * 60;
    
    // Create new timer
    const newTimer: ExerciseTimer = {
      exerciseId,
      startTime: Date.now(),
      duration: durationInSeconds,
      remaining: durationInSeconds,
      isRunning: true
    };
    
    // Add to timers state
    const updatedTimers = [...exerciseTimers.filter(t => t.exerciseId !== exerciseId), newTimer];
    setExerciseTimers(updatedTimers);
    
    // Save to localStorage
    saveTimersToLocalStorage(updatedTimers);
    
    // Start the timer interval
    startTimerInterval();
    
    setSuccessMessage('Exercise started! Timer is running.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };
  
  // Check if an exercise can be completed
  const canCompleteExercise = (exerciseId: string): boolean => {
    const timer = exerciseTimers.find(t => t.exerciseId === exerciseId);
    
    // If no timer exists or timer has completed (remaining = 0), allow completion
    return !timer || timer.remaining === 0;
  };
  
  // Complete an exercise
  const handleCompleteExercise = async (exerciseId: string) => {
    try {
      // Check if the timer has completed
      if (!canCompleteExercise(exerciseId)) {
        setError('Please wait for the timer to complete before marking this exercise as done.');
        setTimeout(() => setError(null), 3000);
        return;
      }
      
      setCompletingExercise(exerciseId);
      
      // Find the selected exercise
      const exercise = plan?.exercises.find(e => e._id === exerciseId);
      if (!exercise) {
        throw new Error('Exercise not found');
      }
      
      // Set the selected exercise and show pain dialog
      setSelectedExercise(exercise);
      setPainLevel(null);
      setPainNotes('');
      setPainDialog(true);
      
    } catch (err: any) {
      console.error('Error completing exercise:', err);
      setError(err.response?.data?.message || 'Failed to complete exercise');
      setCompletingExercise(null);
    }
  };
  
  // Submit exercise completion with pain data
  const submitExerciseCompletion = async () => {
    try {
      if (!selectedExercise || !plan) return;
      
      setLoading(true);
      
      // Make the API call with pain data
      // Skip API call - using Supabase auth
      console.log('Exercise completion skipped - using Supabase auth');
      
      // Remove the timer for this exercise
      const updatedTimers = exerciseTimers.filter(t => t.exerciseId !== selectedExercise._id);
      setExerciseTimers(updatedTimers);
      saveTimersToLocalStorage(updatedTimers);
      
      // Close the pain dialog
      setPainDialog(false);
      setSelectedExercise(null);
      setPainLevel(null);
      setPainNotes('');
      
      setSuccessMessage('Exercise marked as completed! Great job!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh the plan data
      await fetchRehabilitationPlan();
    } catch (err: any) {
      console.error('Error submitting exercise completion:', err);
      setError(err.response?.data?.message || 'Failed to complete exercise');
    } finally {
      setCompletingExercise(null);
      setLoading(false);
    }
  };

  const handleSkipExercise = async () => {
    try {
      if (!selectedExercise || !skipReason || !plan) return;
      
      // Set loading state
      setLoading(true);
      
      // Remove any active timer for this exercise
      const updatedTimers = exerciseTimers.filter(t => t.exerciseId !== selectedExercise._id);
      setExerciseTimers(updatedTimers);
      saveTimersToLocalStorage(updatedTimers);
      
      // Immediately update the UI to show the exercise as skipped
      const skippedExerciseId = selectedExercise._id;
      
      // Update local state immediately for better UX
      setPlan(prevPlan => {
        if (!prevPlan) return null;
        
        return {
          ...prevPlan,
          exercises: prevPlan.exercises.map(ex => 
            ex._id === skippedExerciseId
              ? {
                  ...ex,
                  completion: {
                    status: 'skipped' as ExerciseStatus,
                    skippedReason: skipReason,
                    skippedNotes: skipNotes || '',
                    skippedAt: new Date().toISOString()
                  }
                }
              : ex
          )
        };
      });
      
      // Reset all dialogs and form state immediately
      setSkipDialog(false);
      setSkipConfirmDialog(false);
      setSelectedExercise(null);
      setSkipReason('');
      setSkipNotes('');
      
      setSuccessMessage('Exercise marked as skipped. Remember to communicate any concerns with your clinician.');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Make API call after UI updates
      // Skip API call - using Supabase auth
      console.log('Exercise skip skipped - using Supabase auth');
      
      // Refresh the plan data in the background to ensure consistency with server
      fetchRehabilitationPlan().catch(error => {
        console.error('Error refreshing plan data:', error);
      });
    } catch (err: any) {
      console.error('Error skipping exercise:', err);
      setError(err.response?.data?.message || 'Failed to skip exercise');
      
      // Refresh the plan to revert any optimistic updates if there was an error
      fetchRehabilitationPlan().catch(error => {
        console.error('Error refreshing plan data after error:', error);
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if any exercise has an active timer
  const hasActiveTimers = (): boolean => {
    return exerciseTimers.some(timer => timer.isRunning && timer.remaining > 0);
  };

  // Check if any exercise is skipped
  const hasSkippedExercises = (): boolean => {
    if (!plan?.exercises) return false;
    return plan.exercises.some(exercise => exercise.completion?.status === 'skipped' as ExerciseStatus);
  };
  
  const handleCompleteAll = async () => {
    try {
      // Check if any timers are still running
      if (hasActiveTimers()) {
        setError('Please wait for all exercise timers to complete before marking all as done.');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Check if any exercises are skipped
      if (hasSkippedExercises()) {
        setError('Cannot mark all as done when some exercises are skipped. Please contact your clinician if you need to modify your plan.');
        setTimeout(() => setError(null), 3000);
        return;
      }
      
      // Skip API call - using Supabase auth
      console.log('Complete all exercises skipped - using Supabase auth');
      
      // Clear all timers
      setExerciseTimers([]);
      saveTimersToLocalStorage([]);
      
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

  // Show loading state only during initial load
  if (isInitialLoad) {
    return (
      <LayoutWithSidebar>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            gap: 2
          }}
        >
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Loading your rehabilitation plan...
          </Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (error) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          
          {error === 'No rehabilitation plan assigned' && (
            <Card sx={{ mt: 2, p: 2, borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  What to do next:
                </Typography>
                <Typography variant="body1" paragraph>
                  Your clinician needs to assign a rehabilitation plan to you. Please contact your clinician or case manager.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  If you believe this is an error and you should have a rehabilitation plan assigned, please refresh the page or contact support.
                </Typography>
              </CardContent>
            </Card>
          )}
          
          <Button 
            variant="contained" 
            onClick={fetchRehabilitationPlan}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (!plan) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ p: 3 }}>
          <Alert severity="info">
            No rehabilitation plan assigned. Please contact your clinician.
          </Alert>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      {/* Show loading overlay for non-initial loading states */}
      {loading && !isInitialLoad && <LoadingOverlay message="Updating..." />}
      
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: '#333' }}>
            Today's Recovery Plan
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {plan?.planDescription || 'No description available'}
          </Typography>
          
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
                      {/* Show exercise controls only if not completed or skipped */}
                      {(exercise.completion?.status === 'not_started' || !exercise.completion?.status) && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {/* Timer display */}
                          {exerciseTimers.some(timer => timer.exerciseId === exercise._id) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Timer color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {(() => {
                                  const timer = exerciseTimers.find(t => t.exerciseId === exercise._id);
                                  if (!timer) return '00:00';
                                  const minutes = Math.floor(timer.remaining / 60);
                                  const seconds = timer.remaining % 60;
                                  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                })()}
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={(() => {
                                  const timer = exerciseTimers.find(t => t.exerciseId === exercise._id);
                                  if (!timer) return 0;
                                  return ((timer.duration - timer.remaining) / timer.duration) * 100;
                                })()}
                                sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                              />
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {/* Show Start button if no timer exists */}
                            {!exerciseTimers.some(timer => timer.exerciseId === exercise._id) && (
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={<PlayArrow />}
                                onClick={() => handleStartExercise(exercise._id)}
                              >
                                Start
                              </Button>
                            )}
                            
                            {/* Show Done button only if timer exists and has completed */}
                            {exerciseTimers.some(timer => 
                              timer.exerciseId === exercise._id && 
                              timer.remaining === 0
                            ) && (
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
                            )}
                            
                            {/* Show Skip button only if exercise is not completed and not skipped */}
                            {(!exercise.completion?.status || exercise.completion.status === 'not_started') && (
                              <Button
                                variant="outlined"
                                color="warning"
                                size="small"
                                startIcon={<SkipNext />}
                                onClick={() => openSkipDialog(exercise)}
                                disabled={loading}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'warning.light',
                                    color: 'warning.contrastText',
                                    borderColor: 'warning.main'
                                  }
                                }}
                              >
                                Skip
                              </Button>
                            )}
                          </Box>
                        </Box>
                      )}
                      {exercise.completion?.status === 'skipped' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label="Skipped" 
                            color="warning" 
                            size="small"
                            icon={<SkipNext />}
                            sx={{ 
                              '& .MuiChip-icon': { 
                                fontSize: '1.2rem',
                                marginLeft: '4px'
                              }
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {exercise.completion.skippedReason}
                          </Typography>
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
        {completedExercises < totalExercises && !hasSkippedExercises() && (
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CheckCircle />}
              onClick={handleCompleteAll}
              disabled={hasActiveTimers() || hasSkippedExercises()}
              sx={{ 
                px: 4, 
                py: 1.5,
                position: 'relative',
                '&.Mui-disabled': {
                  bgcolor: 'grey.300',
                }
              }}
            >
              All Done
              {hasActiveTimers() && (
                <Box 
                  component="span" 
                  sx={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: -10, 
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  <Timer fontSize="small" />
                </Box>
              )}
              {hasSkippedExercises() && (
                <Box 
                  component="span" 
                  sx={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: -10, 
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  <SkipNext fontSize="small" />
                </Box>
              )}
            </Button>
            {hasActiveTimers() && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Please wait for all exercise timers to complete
              </Typography>
            )}
            {hasSkippedExercises() && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                Cannot complete all exercises when some are skipped
              </Typography>
            )}
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
        <Dialog 
          open={skipDialog} 
          onClose={() => !loading && setSkipDialog(false)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>Skip Exercise</DialogTitle>
          <DialogContent>
            {exerciseTimers.some(t => t.exerciseId === selectedExercise?._id && t.isRunning) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Note: You can skip this exercise even though the timer has started. The timer will be cancelled.
              </Alert>
            )}
            
            <Typography variant="body1" sx={{ mb: 2 }}>
              Why are you skipping "{selectedExercise?.name}"?
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Reason</InputLabel>
              <Select
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                label="Reason"
                disabled={loading}
              >
                <MenuItem value="pain">Pain or discomfort</MenuItem>
                <MenuItem value="fatigue">Fatigue</MenuItem>
                <MenuItem value="time_constraint">Time constraint</MenuItem>
                <MenuItem value="equipment">Missing equipment</MenuItem>
                <MenuItem value="environment">Unsuitable environment</MenuItem>
                <MenuItem value="energy">Low energy level</MenuItem>
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
              placeholder="Please provide any additional details about why you need to skip this exercise. This will help your clinician adjust your plan if needed."
              disabled={loading}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setSkipDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (skipReason) {
                  setSkipConfirmDialog(true);
                }
              }}
              variant="contained" 
              color="warning"
              disabled={!skipReason || loading}
            >
              Skip Exercise
            </Button>
          </DialogActions>
        </Dialog>

        {/* Skip Confirmation Dialog */}
        <Dialog
          open={skipConfirmDialog}
          onClose={() => !loading && setSkipConfirmDialog(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>Confirm Skip Exercise</DialogTitle>
          <DialogContent sx={{ pt: '8px !important' }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Are you sure you want to skip "{selectedExercise?.name}"?
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Reason: {skipReason === 'other' ? 'Other' : skipReason.replace('_', ' ')}
              {skipNotes && (
                <>
                  <br />
                  Notes: {skipNotes}
                </>
              )}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setSkipConfirmDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSkipExercise}
              variant="contained" 
              color="warning"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {loading ? 'Confirming Skip...' : 'Yes, Skip Exercise'}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Pain Level Dialog */}
        <Dialog
          open={painDialog}
          onClose={() => !loading && setPainDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Rate Your Pain Level
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" gutterBottom>
                How much pain did you experience during "{selectedExercise?.name}"?
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                Rate your pain from 0 (no pain) to 10 (worst pain imaginable)
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                my: 3,
                mx: 2
              }}>
                <Typography variant="body2" color="text.secondary">No Pain</Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  width: '100%',
                  maxWidth: 500,
                  mx: 'auto'
                }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <Button
                      key={level}
                      variant={painLevel === level ? "contained" : "outlined"}
                      color={
                        level <= 3 ? "success" : 
                        level <= 6 ? "warning" : 
                        "error"
                      }
                      onClick={() => setPainLevel(level)}
                      sx={{ 
                        minWidth: 40, 
                        height: 40,
                        borderRadius: '50%',
                        p: 0
                      }}
                    >
                      {level}
                    </Button>
                  ))}
                </Box>
                <Typography variant="body2" color="text.secondary">Severe Pain</Typography>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Additional Notes (Optional)"
                  placeholder="Describe your pain (location, type, when it occurred, etc.)"
                  multiline
                  rows={3}
                  value={painNotes}
                  onChange={(e) => setPainNotes(e.target.value)}
                  disabled={loading}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setPainDialog(false);
                setCompletingExercise(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitExerciseCompletion}
              variant="contained" 
              color="primary"
              disabled={painLevel === null || loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default WorkerRehabilitationPlan;

