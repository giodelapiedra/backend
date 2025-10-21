import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { dataClient } from '../../lib/supabase';
import NotFound from '../NotFound';

type ExerciseStatus = 'completed' | 'skipped' | 'not_started';

interface Exercise {
  _id: string;
  name: string;
  description: string;
  duration: number;
  category: string;
  difficulty: string;
  instructions: string;
  repetitions?: string;
  videoUrl?: string | null;
  order?: number;
  isRequired?: boolean;
  completion?: {
    status: ExerciseStatus;
    completedAt?: string;
    skippedReason?: string;
    skippedNotes?: string;
    duration?: number;
    notes?: string | null;
  };
}

interface RehabilitationPlan {
  _id: string;
  planName: string;
  planDescription: string;
  duration?: number; // Number of days the plan should last
  status: 'active' | 'inactive' | 'completed' | 'paused' | 'cancelled';
  clinician_id: string;
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
  dailyCompletions?: any[];
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
  const navigate = useNavigate();
  const [plan, setPlan] = useState<RehabilitationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [skipDialog, setSkipDialog] = useState(false);
  const [skipConfirmDialog, setSkipConfirmDialog] = useState(false);
  const [painDialog, setPainDialog] = useState(false);
  const [completionDialog, setCompletionDialog] = useState(false);
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

  // Carousel state - show one exercise at a time
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  
  // Track if today's exercises are completed
  const [isTodayCompleted, setIsTodayCompleted] = useState(false);

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

  // Redirect to dashboard if today's exercises are completed (on page load)
  useEffect(() => {
    // Only redirect if:
    // 1. Not in initial load (data has been fetched)
    // 2. Today's exercises are completed
    // 3. Not showing the completion dialog (to allow user to see it first)
    if (!isInitialLoad && isTodayCompleted && !completionDialog) {
      navigate('/worker');
    }
  }, [isTodayCompleted, isInitialLoad, completionDialog, navigate]);

  const fetchRehabilitationPlan = async () => {
    try {
      setLoading(true);
      console.log('Fetching rehabilitation plan from Supabase, user ID:', user?.id);
      
      // Fetch rehabilitation plans from Supabase for current worker
      const { data: plans, error } = await dataClient
        .from('rehabilitation_plans')
        .select(`
          *,
          case:cases!case_id(id, case_number, status),
          worker:users!worker_id(id, first_name, last_name, email),
          clinician:users!clinician_id(id, first_name, last_name, email)
        `)
        .eq('worker_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Fetched plans from Supabase:', plans);

      if (!plans || plans.length === 0) {
        setError('No rehabilitation plan assigned yet');
        return;
      }

      // If ID is provided in URL, use that specific plan
      let selectedPlan = id 
        ? plans.find((p: any) => p.id === id)
        : plans.find((p: any) => p.status === 'active') || plans[0];

      if (!selectedPlan) {
        setError('Rehabilitation plan not found');
        return;
      }

      console.log('Selected plan:', selectedPlan);

      // Check today's completion status (using 6:00 AM as cutoff)
      const now = new Date();
      const currentHour = now.getHours();
      
      // If before 6:00 AM, use yesterday's date for checking completion
      let checkDate: string;
      if (currentHour < 6) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        checkDate = yesterday.toISOString().split('T')[0];
      } else {
        checkDate = now.toISOString().split('T')[0];
      }
      
      const dailyCompletions = selectedPlan.daily_completions || [];
      const todayCompletion = dailyCompletions.find((dc: any) => dc.date === checkDate);
      
      // Transform Supabase data to match expected format
      const exercises = Array.isArray(selectedPlan.exercises) 
        ? selectedPlan.exercises.map((ex: any, index: number) => {
            const exerciseId = `${selectedPlan.id}-ex-${index}`;
            
            // Check if this exercise was completed today
            const completedToday = todayCompletion?.exercises?.find(
              (e: any) => e.exerciseId === exerciseId && e.status === 'completed'
            );
            
            return {
              _id: exerciseId,
              name: ex.name || '',
              description: ex.instructions || '',
              duration: 15, // Default 15 minutes
              instructions: ex.instructions || '',
              repetitions: ex.repetitions || '10 reps',
              videoUrl: ex.videoUrl || null,
              category: 'other',
              difficulty: 'easy',
              isRequired: true,
              order: ex.order || index,
              completion: completedToday ? {
                status: 'completed' as ExerciseStatus,
                completedAt: completedToday.completedAt,
                notes: completedToday.painNotes
              } : {
                status: 'not_started' as ExerciseStatus,
                completedAt: null,
                notes: null
              }
            };
          })
        : [];
      
      // Check if all exercises are completed today
      const allCompleted = exercises.length > 0 && exercises.every(
        (ex: Exercise) => ex.completion?.status === 'completed'
      );
      setIsTodayCompleted(allCompleted);

      // Calculate completed days (fully completed days where all exercises are done)
      const completedDaysCount = dailyCompletions.filter((dc: any) => {
        const dayExercises = dc.exercises || [];
        const totalExercises = exercises.length;
        const completedExercises = dayExercises.filter((e: any) => e.status === 'completed').length;
        return totalExercises > 0 && completedExercises === totalExercises;
      }).length;

      const duration = selectedPlan.duration || 7;

      // Calculate current day number
      // If today has been completed (allCompleted = true), then today is counted in completedDaysCount
      // We show "Day X" where X is the day you're currently on
      // 
      // Examples:
      // - Start of Day 1 (0 days complete, today not complete): Show "Day 1" → completedDaysCount + 1 = 0 + 1 = 1 ✓
      // - Just finished Day 1 (1 day complete, today IS complete): Show "Day 1" → completedDaysCount = 1 ✓  
      // - Next morning Day 2 (1 day complete, today not complete): Show "Day 2" → completedDaysCount + 1 = 1 + 1 = 2 ✓
      //
      // So: If allCompleted (finished today), show completedDaysCount, otherwise show completedDaysCount + 1
      const currentDayNumber = allCompleted ? completedDaysCount : (completedDaysCount + 1);

      const planData: RehabilitationPlan = {
        _id: selectedPlan.id,
        planName: selectedPlan.plan_name || 'Recovery Plan',
        planDescription: selectedPlan.plan_description || 'Daily recovery exercises',
        duration: duration,
        status: selectedPlan.status as 'active' | 'inactive' | 'completed' | 'paused' | 'cancelled',
        clinician_id: selectedPlan.clinician_id || '',
        case: {
          _id: selectedPlan.case?.id || '',
          caseNumber: selectedPlan.case?.case_number || 'N/A',
          status: selectedPlan.case?.status || 'unknown'
        },
        worker: {
          _id: selectedPlan.worker?.id || '',
          firstName: selectedPlan.worker?.first_name || '',
          lastName: selectedPlan.worker?.last_name || '',
          email: selectedPlan.worker?.email || ''
        },
        exercises,
        progressStats: {
          totalDays: duration,
          completedDays: currentDayNumber, // Show current day number (1-based)
          skippedDays: 0,
          consecutiveCompletedDays: 0,
          consecutiveSkippedDays: 0
        }
      };

      console.log('Transformed plan data:', planData);
      setPlan(planData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching rehabilitation plan:', err);
      setError(err.message || 'Failed to fetch rehabilitation plan');
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
      console.log('=== Starting submitExerciseCompletion ===');
      console.log('selectedExercise:', selectedExercise);
      console.log('painLevel:', painLevel);
      console.log('plan:', plan);
      
      if (!selectedExercise || !plan) {
        console.error('Missing required data:', { selectedExercise, plan });
        return;
      }
      
      if (painLevel === null || painLevel === undefined) {
        console.error('Pain level not selected');
        setError('Please select a pain level before submitting');
        return;
      }
      
      setLoading(true);
      
      // Get current date for today's completion (using 6:00 AM as cutoff)
      const now = new Date();
      const currentHour = now.getHours();
      
      let today: string;
      if (currentHour < 6) {
        // If before 6:00 AM, save to yesterday's date
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        today = yesterday.toISOString().split('T')[0];
      } else {
        today = now.toISOString().split('T')[0];
      }
      
      console.log('Today date:', today);
      console.log('Plan ID:', plan._id);
      
      // Fetch current plan data
      const { data: currentPlan, error: fetchError } = await dataClient
        .from('rehabilitation_plans')
        .select('daily_completions, exercises')
        .eq('id', plan._id)
        .single();

      if (fetchError) {
        console.error('Error fetching current plan:', fetchError);
        throw new Error(`Failed to fetch plan: ${fetchError.message}`);
      }

      console.log('Current plan fetched:', currentPlan);

      // Get existing daily completions or initialize
      const dailyCompletions = currentPlan?.daily_completions || [];
      
      // Find today's completion record or create new one
      let todayCompletion = dailyCompletions.find((dc: any) => dc.date === today);
      
      if (!todayCompletion) {
        todayCompletion = {
          date: today,
          exercises: []
        };
        dailyCompletions.push(todayCompletion);
      }

      console.log('Today completion record:', todayCompletion);

      // Add completed exercise with pain data
      const exerciseCompletion = {
        exerciseId: selectedExercise._id,
        exerciseName: selectedExercise.name,
        completedAt: new Date().toISOString(),
        painLevel: painLevel,
        painNotes: painNotes || '',
        status: 'completed'
      };

      console.log('Exercise completion data:', exerciseCompletion);

      // Check if exercise already completed today
      const existingIndex = todayCompletion.exercises.findIndex(
        (e: any) => e.exerciseId === selectedExercise._id
      );

      if (existingIndex >= 0) {
        console.log('Updating existing exercise at index:', existingIndex);
        todayCompletion.exercises[existingIndex] = exerciseCompletion;
      } else {
        console.log('Adding new exercise completion');
        todayCompletion.exercises.push(exerciseCompletion);
      }

      // Calculate progress
      const totalExercises = plan.exercises.length;
      const completedToday = todayCompletion.exercises.filter((e: any) => e.status === 'completed').length;
      const progressPercentage = Math.round((completedToday / totalExercises) * 100);

      // Calculate completed days count
      const completedDaysCount = dailyCompletions.filter((dc: any) => {
        const dayExercises = dc.exercises || [];
        const completedExercises = dayExercises.filter((e: any) => e.status === 'completed').length;
        return totalExercises > 0 && completedExercises === totalExercises;
      }).length;

      // Update progress_stats
      const progressStats = {
        lastCompletedDate: today,
        totalExercises,
        completedExercises: completedToday,
        progressPercentage,
        totalDays: plan.duration || 7,
        completedDays: completedDaysCount,
        skippedDays: 0,
        consecutiveCompletedDays: 0,
        consecutiveSkippedDays: 0
      };

      // Update Supabase
      const { error: updateError } = await dataClient
        .from('rehabilitation_plans')
        .update({
          daily_completions: dailyCompletions,
          progress_stats: progressStats
        })
        .eq('id', plan._id);

      if (updateError) {
        console.error('Error updating plan:', updateError);
        throw new Error(`Failed to update plan: ${updateError.message}`);
      }
      
      // Remove the timer for this exercise
      const updatedTimers = exerciseTimers.filter(t => t.exerciseId !== selectedExercise._id);
      setExerciseTimers(updatedTimers);
      saveTimersToLocalStorage(updatedTimers);
      
      // Close the pain dialog
      setPainDialog(false);
      setSelectedExercise(null);
      setPainLevel(null);
      setPainNotes('');
      
      // Check if all exercises are completed for today
      if (progressPercentage === 100) {
        console.log('🎉 All exercises completed for today!');
        
        // Notify clinician about daily completion
        try {
          const completedDay = progressStats.completedDays;
          const workerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
          
          await dataClient.from('notifications').insert({
            recipient_id: plan.clinician_id,
            sender_id: user?.id,
            type: 'rehab_plan_daily_completed',
            title: 'Daily Rehabilitation Plan Completed',
            message: `${workerName} has completed Day ${completedDay} of their rehabilitation plan "${plan.planName}" for case ${plan.case?.caseNumber}. Progress: ${completedDay}/${plan.duration || 7} days completed.`,
            priority: 'medium',
            metadata: {
              plan_id: plan._id,
              plan_name: plan.planName,
              case_number: plan.case?.caseNumber,
              worker_name: workerName,
              completed_day: completedDay,
              total_days: plan.duration || 7
            }
          });
        } catch (error) {
          console.error('Failed to send daily completion notification:', error);
        }
        
        // Mark plan as completed if all days are done
        if (progressStats.completedDays >= (plan.duration || 7)) {
          try {
            await dataClient
              .from('rehabilitation_plans')
              .update({
                status: 'completed',
                end_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
              })
              .eq('id', plan._id);
          } catch (error) {
            console.error('Error marking plan as completed:', error);
          }
        }
        
        setIsTodayCompleted(true);
        setCompletionDialog(true);
      } else {
        console.log(`Progress: ${progressPercentage}%`);
        setSuccessMessage(`Exercise completed! Progress: ${progressPercentage}% 🎉`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      
      // Refresh the plan data
      console.log('Refreshing plan data...');
      await fetchRehabilitationPlan();
      console.log('=== Completed submitExerciseCompletion ===');
    } catch (err: any) {
      console.error('❌ Error submitting exercise completion:', err);
      setError(err.message || 'Failed to complete exercise');
      setTimeout(() => setError(null), 5000);
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
      
      // Get current date (using 6:00 AM as cutoff)
      const now = new Date();
      const currentHour = now.getHours();
      
      let today: string;
      if (currentHour < 6) {
        // If before 6:00 AM, save to yesterday's date
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        today = yesterday.toISOString().split('T')[0];
      } else {
        today = now.toISOString().split('T')[0];
      }
      
      // Fetch current plan data
      const { data: currentPlan, error: fetchError } = await dataClient
        .from('rehabilitation_plans')
        .select('daily_completions, exercises')
        .eq('id', plan._id)
        .single();

      if (fetchError) {
        console.error('Error fetching current plan:', fetchError);
        throw fetchError;
      }

      // Get existing daily completions or initialize
      const dailyCompletions = currentPlan?.daily_completions || [];
      
      // Find today's completion record or create new one
      let todayCompletion = dailyCompletions.find((dc: any) => dc.date === today);
      
      if (!todayCompletion) {
        todayCompletion = {
          date: today,
          exercises: []
        };
        dailyCompletions.push(todayCompletion);
      }

      // Add skipped exercise
      const exerciseSkip = {
        exerciseId: selectedExercise._id,
        exerciseName: selectedExercise.name,
        skippedAt: new Date().toISOString(),
        skipReason: skipReason,
        skipNotes: skipNotes || '',
        status: 'skipped'
      };

      // Check if exercise already recorded today
      const existingIndex = todayCompletion.exercises.findIndex(
        (e: any) => e.exerciseId === selectedExercise._id
      );

      if (existingIndex >= 0) {
        todayCompletion.exercises[existingIndex] = exerciseSkip;
      } else {
        todayCompletion.exercises.push(exerciseSkip);
      }

      // Calculate progress (skipped exercises don't count as completed)
      const totalExercises = plan.exercises.length;
      const completedToday = todayCompletion.exercises.filter((e: any) => e.status === 'completed').length;
      const progressPercentage = Math.round((completedToday / totalExercises) * 100);

      // Update progress_stats
      const progressStats = {
        lastCompletedDate: today,
        totalExercises: totalExercises,
        completedExercises: completedToday,
        progressPercentage: progressPercentage
      };

      // Update Supabase
      const { error: updateError } = await dataClient
        .from('rehabilitation_plans')
        .update({
          daily_completions: dailyCompletions,
          progress_stats: progressStats
        })
        .eq('id', plan._id);

      if (updateError) {
        console.error('Error updating plan:', updateError);
        throw updateError;
      }
      
      // Remove any active timer for this exercise
      const updatedTimers = exerciseTimers.filter(t => t.exerciseId !== selectedExercise._id);
      setExerciseTimers(updatedTimers);
      saveTimersToLocalStorage(updatedTimers);
      
      // Reset all dialogs and form state immediately
      setSkipDialog(false);
      setSkipConfirmDialog(false);
      setSelectedExercise(null);
      setSkipReason('');
      setSkipNotes('');
      
      setSuccessMessage('Exercise marked as skipped. Remember to communicate any concerns with your clinician.');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Refresh the plan data in the background to ensure consistency with server
      fetchRehabilitationPlan().catch(error => {
        console.error('Error refreshing plan data:', error);
      });
    } catch (err: any) {
      console.error('Error skipping exercise:', err);
      setError(err.message || 'Failed to skip exercise');
      
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
    // Check if it's an "exercise not found" error
    if (error.includes('Exercise not found') || error.includes('not found')) {
      return <NotFound />;
    }
    
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
      
      <Box sx={{ 
        maxWidth: '800px',
        margin: '0 auto',
        p: { xs: 2, sm: 3, md: 4 },
        minHeight: '100vh'
      }}>
        {/* Error Message */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* Success Message */}
        {successMessage && (
          <Alert 
            severity="success" 
            onClose={() => setSuccessMessage(null)}
            sx={{ mb: 3 }}
          >
            {successMessage}
          </Alert>
        )}

        {/* Header - Clean and Simple */}
        <Box sx={{ mb: { xs: 3, md: 4 }, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' }
            }}
          >
            {plan?.planName || 'Today\'s Recovery Plan'}
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' },
              px: { xs: 2, sm: 0 },
              mb: 2
            }}
          >
            {plan?.planDescription || 'Daily recovery exercises and activities'}
          </Typography>
          <Box sx={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 1, 
            px: 3, 
            py: 1.5, 
            bgcolor: '#f0fdf4', 
            border: '2px solid #10b981',
            borderRadius: 3,
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
          }}>
            <CheckCircle sx={{ color: '#10b981', fontSize: 24 }} />
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700, 
                color: '#065f46',
                fontSize: { xs: '1rem', sm: '1.125rem' }
              }}
            >
              Day {plan?.progressStats?.completedDays || 0} of {plan?.progressStats?.totalDays || plan?.duration || 7}
            </Typography>
          </Box>
        </Box>

        {/* Single Exercise Card View (Carousel) */}
        {plan?.exercises && plan.exercises.length > 0 && (
          <Box>
            {/* Progress Bar - Like Reference Image */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Progress
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {currentExerciseIndex + 1} of {plan.exercises.length}
                </Typography>
              </Box>
              <Box sx={{ 
                width: '100%', 
                height: 8, 
                backgroundColor: '#e5e7eb', 
                borderRadius: 10,
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  width: `${((currentExerciseIndex + 1) / plan.exercises.length) * 100}%`,
                  height: '100%',
                  backgroundColor: '#10b981',
                  transition: 'width 0.3s ease'
                }} />
              </Box>
            </Box>

            {/* Exercise Card - Mobile Optimized */}
            {plan.exercises && plan.exercises[currentExerciseIndex] && plan.exercises.map((exercise, index) => index === currentExerciseIndex && (
                <Card 
                  key={exercise._id} 
                  sx={{ 
                    p: { xs: 2.5, sm: 3, md: 4 }, 
                    borderRadius: { xs: 2, md: 3 },
                    border: '2px solid #10b981',
                    boxShadow: { 
                      xs: '0 2px 12px rgba(16, 185, 129, 0.1)',
                      md: '0 4px 20px rgba(16, 185, 129, 0.15)'
                    },
                    minHeight: { xs: 'auto', md: '500px' },
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}
                >
                  {/* Exercise Number Badge - Responsive */}
                  <Box sx={{ 
                    position: 'absolute', 
                    top: { xs: 12, md: 20 }, 
                    right: { xs: 12, md: 20 },
                    width: { xs: 40, md: 48 },
                    height: { xs: 40, md: 48 },
                    borderRadius: '50%',
                    backgroundColor: '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: { xs: '1rem', md: '1.25rem' },
                    color: '#10b981',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                  }}>
                    {currentExerciseIndex + 1}
                  </Box>

                  {/* Exercise Name & Reps - Mobile Responsive */}
                  <Box sx={{ mb: { xs: 2, md: 3 }, pr: { xs: 6, md: 7 } }}>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 1, 
                        color: '#1e293b',
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                        lineHeight: 1.2
                      }}
                    >
                      {exercise.name}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600,
                        color: '#10b981',
                        fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' }
                      }}
                    >
                      {exercise.repetitions}
                    </Typography>
                  </Box>

                  {/* Video Player or Placeholder - Mobile Responsive */}
                  {exercise.videoUrl && exercise.videoUrl.trim() !== '' ? (
                    <Box sx={{ 
                      mb: { xs: 2, md: 3 }, 
                      borderRadius: 2, 
                      overflow: 'hidden',
                      position: 'relative',
                      paddingTop: '56.25%', // 16:9 aspect ratio
                      backgroundColor: '#000'
                    }}>
                      <iframe
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          borderRadius: '8px'
                        }}
                        src={(() => {
                          const url = exercise.videoUrl || '';
                          if (url.includes('youtube.com') || url.includes('youtu.be')) {
                            return url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
                          }
                          return url;
                        })()}
                        title={exercise.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </Box>
                  ) : (
                    <Box sx={{ 
                      backgroundColor: '#f1f5f9',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: { xs: 2, md: 3 },
                      minHeight: { xs: 150, sm: 180, md: 200 },
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: '#e2e8f0'
                      }
                    }}>
                      <PlayArrow sx={{ 
                        fontSize: { xs: 48, md: 64 }, 
                        color: '#64748b', 
                        mb: 1 
                      }} />
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      >
                        Tap to play voiceover
                      </Typography>
                    </Box>
                  )}

                  {/* Instructions - Mobile Responsive */}
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mb: { xs: 2, md: 3 }, 
                      color: '#1e293b', 
                      lineHeight: 1.6,
                      fontSize: { xs: '0.9375rem', sm: '1rem' }
                    }}
                  >
                    {exercise.instructions}
                  </Typography>

                  {/* Play Voiceover Button - Inside Card */}
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<PlayArrow />}
                    sx={{ 
                      py: 1.5,
                      borderColor: '#d1d5db',
                      color: '#6b7280',
                      fontWeight: 500,
                      '&:hover': {
                        borderColor: '#9ca3af',
                        backgroundColor: '#f9fafb'
                      }
                    }}
                  >
                    Play Voiceover
                  </Button>

                </Card>
              ))}

            {/* Navigation Buttons - Mobile Optimized */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              mt: { xs: 2, md: 3 }, 
              gap: { xs: 1.5, md: 2 }
            }}>
              {/* Previous Button - Only show if not first exercise */}
              {currentExerciseIndex > 0 ? (
                <Button
                  variant="outlined"
                  onClick={() => setCurrentExerciseIndex(prev => prev - 1)}
                  sx={{ 
                    flex: 1,
                    py: { xs: 1.25, md: 1.5 },
                    fontSize: { xs: '0.9375rem', md: '1rem' },
                    fontWeight: 600,
                    borderColor: '#cbd5e1',
                    color: '#64748b',
                    borderWidth: 2,
                    '&:hover': {
                      borderColor: '#94a3b8',
                      backgroundColor: '#f8fafc',
                      borderWidth: 2
                    }
                  }}
                >
                  Previous
                </Button>
              ) : (
                <Box sx={{ flex: 1 }} />
              )}
              
              {/* Show "Next Exercise" if not last, "Complete" if last exercise */}
              {currentExerciseIndex < (plan?.exercises?.length || 1) - 1 ? (
                <Button
                  variant="contained"
                  onClick={() => setCurrentExerciseIndex(prev => prev + 1)}
                  sx={{ 
                    flex: 1,
                    py: { xs: 1.25, md: 1.5 },
                    fontSize: { xs: '0.9375rem', md: '1rem' },
                    fontWeight: 600,
                    backgroundColor: '#10b981',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                    '&:hover': {
                      backgroundColor: '#059669',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    },
                    '&:active': {
                      transform: 'scale(0.98)'
                    }
                  }}
                >
                  Next Exercise
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => {
                    const currentExercise = plan?.exercises[currentExerciseIndex];
                    if (currentExercise) {
                      handleCompleteExercise(currentExercise._id);
                    }
                  }}
                  disabled={completingExercise !== null || isTodayCompleted}
                  sx={{ 
                    flex: 1,
                    py: { xs: 1.25, md: 1.5 },
                    fontSize: { xs: '0.9375rem', md: '1rem' },
                    fontWeight: 600,
                    backgroundColor: '#10b981',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                    '&:hover': {
                      backgroundColor: '#059669',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    },
                    '&:active': {
                      transform: 'scale(0.98)'
                    },
                    '&:disabled': {
                      backgroundColor: '#cbd5e0',
                      color: '#718096'
                    }
                  }}
                >
                  {isTodayCompleted ? 'Completed Today' : (completingExercise ? 'Completing...' : 'Complete')}
                </Button>
              )}
            </Box>
          </Box>
        )}

        {/* Completion Message - Mobile Responsive */}
        {currentExerciseIndex === (plan?.exercises?.length || 1) - 1 && 
         completedExercises === totalExercises && (
          <Box sx={{ 
            textAlign: 'center', 
            mb: { xs: 2, md: 3 }, 
            mt: { xs: 3, md: 4 } 
          }}>
            <Card sx={{ 
              p: { xs: 3, md: 4 }, 
              backgroundColor: '#d1fae5',
              border: '2px solid #10b981',
              borderRadius: { xs: 2, md: 3 }
            }}>
              <CheckCircle sx={{ 
                fontSize: { xs: 48, md: 64 }, 
                color: '#10b981', 
                mb: { xs: 1.5, md: 2 } 
              }} />
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#065f46', 
                  mb: 1,
                  fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
                }}
              >
                🎉 All Done!
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.9375rem', md: '1rem' } }}
              >
                Great job! You've completed all exercises for today.
              </Typography>
            </Card>
          </Box>
        )}

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
        
        {/* Pain Level Dialog - Enhanced UI/UX */}
        <Dialog
          open={painDialog}
          onClose={() => !loading && setPainDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 2, 
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: 2, 
                bgcolor: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography sx={{ fontSize: 24 }}>😊</Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  How are you feeling?
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Rate your pain level after "{selectedExercise?.name}"
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ py: 4 }}>
            {/* Pain Scale Visual Guide */}
            <Box sx={{ 
              mb: 4, 
              p: 3, 
              bgcolor: '#f8fafc', 
              borderRadius: 3,
              border: '1px solid #e2e8f0'
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: '#1e293b', 
                mb: 2,
                textAlign: 'center'
              }}>
                Pain Scale Guide
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600 }}>
                    0-3: Mild
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Manageable discomfort
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#d97706', fontWeight: 600 }}>
                    4-6: Moderate
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Noticeable but tolerable
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 600 }}>
                    7-10: Severe
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Significant pain
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Enhanced Pain Rating Interface */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: '#1e293b', 
                mb: 3,
                textAlign: 'center'
              }}>
                Select your pain level
              </Typography>
              
              {/* Pain Scale with Visual Indicators */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                gap: 1,
                mb: 3,
                flexWrap: 'wrap'
              }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
                  const getColor = (level: number) => {
                    if (level <= 3) return '#059669'; // Green
                    if (level <= 6) return '#d97706'; // Orange
                    return '#dc2626'; // Red
                  };
                  
                  const getEmoji = (level: number) => {
                    if (level === 0) return '😊';
                    if (level <= 2) return '🙂';
                    if (level <= 4) return '😐';
                    if (level <= 6) return '😕';
                    if (level <= 8) return '😣';
                    return '😫';
                  };
                  
                  const isSelected = painLevel === level;
                  
                  return (
                    <Box
                      key={level}
                      onClick={() => setPainLevel(level)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      {/* Number Circle */}
                      <Box sx={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        backgroundColor: isSelected ? getColor(level) : '#f1f5f9',
                        border: `3px solid ${isSelected ? getColor(level) : '#e2e8f0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1,
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? `0 4px 12px ${getColor(level)}40` : '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <Typography sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.1rem',
                          color: isSelected ? 'white' : '#64748b'
                        }}>
                          {level}
                        </Typography>
                      </Box>
                      
                      {/* Emoji */}
                      <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>
                        {getEmoji(level)}
                      </Typography>
                      
                      {/* Label for key numbers */}
                      {[0, 5, 10].includes(level) && (
                        <Typography variant="caption" sx={{ 
                          color: '#64748b',
                          fontWeight: 500,
                          textAlign: 'center',
                          fontSize: '0.75rem'
                        }}>
                          {level === 0 ? 'No Pain' : level === 5 ? 'Moderate' : 'Severe'}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
              
              {/* Selected Pain Level Display */}
              {painLevel !== null && (
                <Box sx={{ 
                  textAlign: 'center',
                  p: 2,
                  bgcolor: '#f0f9ff',
                  borderRadius: 2,
                  border: '1px solid #bae6fd'
                }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    color: '#0369a1',
                    mb: 0.5
                  }}>
                    Pain Level: {painLevel}/10
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#0369a1' }}>
                    {painLevel <= 3 ? 'Mild discomfort - Great!' : 
                     painLevel <= 6 ? 'Moderate pain - Manageable' : 
                     'Severe pain - Please note this'}
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* Additional Notes Section */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: '#1e293b', 
                mb: 2 
              }}>
                Additional Notes (Optional)
              </Typography>
              <TextField
                fullWidth
                placeholder="Describe your pain experience... (e.g., 'Sharp pain in lower back', 'Dull ache in shoulder', 'No pain at all')"
                multiline
                rows={4}
                value={painNotes}
                onChange={(e) => setPainNotes(e.target.value)}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                      borderWidth: 2
                    }
                  }
                }}
              />
              <Typography variant="caption" sx={{ 
                color: '#64748b', 
                mt: 1, 
                display: 'block' 
              }}>
                💡 Tip: Be specific about location, type of pain, and when it occurred
              </Typography>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ 
            p: 3, 
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0'
          }}>
            <Button 
              onClick={() => {
                setPainDialog(false);
                setCompletingExercise(null);
              }}
              disabled={loading}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none'
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitExerciseCompletion}
              variant="contained" 
              disabled={painLevel === null || loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                  boxShadow: '0 6px 16px rgba(59, 130, 246, 0.4)'
                },
                '&:disabled': {
                  background: '#cbd5e1',
                  color: '#64748b',
                  boxShadow: 'none'
                }
              }}
            >
              {loading ? 'Submitting...' : 'Submit Pain Rating'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Completion Dialog */}
        <Dialog
          open={completionDialog}
          onClose={() => {}}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                width: 56, 
                height: 56, 
                borderRadius: 2, 
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle sx={{ fontSize: 32, color: '#10b981' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                  🎉 All Exercises Completed!
                </Typography>
                <Typography variant="body2" sx={{ color: '#718096', mt: 0.5 }}>
                  Congratulations on finishing today's session
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pb: 3 }}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              Excellent work! You've completed all your exercises for today.
            </Alert>

            <Box sx={{ 
              p: 3, 
              bgcolor: '#f0fdf4', 
              border: '1px solid #86efac',
              borderRadius: 2,
              mb: 2
            }}>
              <Typography variant="body1" sx={{ color: '#166534', fontWeight: 500, mb: 1 }}>
                ✅ Your Progress Has Been Saved
              </Typography>
              <Typography variant="body2" sx={{ color: '#15803d' }}>
                Your clinician will be able to review your completed exercises and pain feedback. Come back tomorrow at 6:00 AM for your next session!
              </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: '#718096', textAlign: 'center', fontStyle: 'italic' }}>
              Great job maintaining your recovery routine! 💪
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              onClick={() => {
                setCompletionDialog(false);
                navigate('/worker');
              }}
              variant="contained"
              fullWidth
              size="large"
              sx={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                }
              }}
            >
              Go to Dashboard
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default WorkerRehabilitationPlan;

