import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  setHasCompletedExercisesToday,
  setExerciseCompletionTime,
} from '../../store/slices/workerSlice';
import { dataClient } from '../../lib/supabase';

export const useExerciseCompletion = (userId: string | undefined) => {
  const dispatch = useDispatch();
  const { hasCompletedExercisesToday, exerciseCompletionTime } = useSelector(
    (state: RootState) => state.worker
  );

  const checkExerciseCompletion = useCallback(async () => {
    try {
      if (!userId) return;
      
      // Check if worker has completed their rehabilitation exercises today
      const { data: plans, error } = await dataClient
        .from('rehabilitation_plans')
        .select('id, daily_completions, exercises')
        .eq('worker_id', userId)
        .eq('status', 'active')
        .limit(1);

      if (error || !plans || plans.length === 0) {
        dispatch(setHasCompletedExercisesToday(false));
        dispatch(setExerciseCompletionTime(null));
        return;
      }

      const plan = plans[0];
      const now = new Date();
      const currentHour = now.getHours();
      
      // Determine which date to check (using 6:00 AM cutoff)
      let checkDate: string;
      if (currentHour < 6) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        checkDate = yesterday.toISOString().split('T')[0];
      } else {
        checkDate = now.toISOString().split('T')[0];
      }

      const dailyCompletions = plan.daily_completions || [];
      const todayCompletion = dailyCompletions.find((dc: any) => dc.date === checkDate);

      if (todayCompletion && todayCompletion.exercises) {
        const totalExercises = plan.exercises ? plan.exercises.length : 0;
        const completedExercises = todayCompletion.exercises.filter((e: any) => e.status === 'completed');
        
        // Check if all exercises are completed
        if (totalExercises > 0 && completedExercises.length === totalExercises) {
          dispatch(setHasCompletedExercisesToday(true));
          
          // Get the completion time from the last completed exercise
          const lastCompleted = completedExercises[completedExercises.length - 1];
          if (lastCompleted && lastCompleted.completedAt) {
            const completionDate = new Date(lastCompleted.completedAt);
            const timeString = completionDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            dispatch(setExerciseCompletionTime(timeString));
          }
        } else {
          dispatch(setHasCompletedExercisesToday(false));
          dispatch(setExerciseCompletionTime(null));
        }
      } else {
        dispatch(setHasCompletedExercisesToday(false));
        dispatch(setExerciseCompletionTime(null));
      }
    } catch (error) {
      console.error('Error checking exercise completion:', error);
      dispatch(setHasCompletedExercisesToday(false));
      dispatch(setExerciseCompletionTime(null));
    }
  }, [userId, dispatch]);

  useEffect(() => {
    if (userId) {
      checkExerciseCompletion();
      
      // Refresh exercise completion status when page becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          checkExerciseCompletion();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [userId, checkExerciseCompletion]);

  return {
    hasCompletedExercisesToday,
    exerciseCompletionTime,
    checkExerciseCompletion,
  };
};

