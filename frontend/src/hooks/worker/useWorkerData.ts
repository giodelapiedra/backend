import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  setCases,
  setNotifications,
  setLoading,
  setCurrentAssignment,
  setHasSubmittedToday,
  setTodaySubmission,
} from '../../store/slices/workerSlice';
import { dataClient } from '../../lib/supabase';

export const useWorkerData = (userId: string | undefined) => {
  const dispatch = useDispatch();
  const { cases, notifications, loading } = useSelector((state: RootState) => state.worker);

  // Helper function to get PH time date string (UTC+8)
  const getPHToday = useCallback(() => {
    const now = new Date();
    const phtOffset = 8 * 60; // 8 hours in minutes
    const phtTime = new Date(now.getTime() + (phtOffset * 60 * 1000));
    return phtTime.toISOString().split('T')[0];
  }, []);

  const fetchWorkerData = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      console.log('Worker dashboard data fetch skipped - using Supabase auth');
      const casesRes = { data: { cases: [] } };
      const notificationsRes = { data: { notifications: [] } };

      dispatch(setCases(casesRes.data.cases || []));
      dispatch(setNotifications(notificationsRes.data.notifications || []));
    } catch (error) {
      console.error('Error fetching worker data:', error);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const checkTodaySubmission = useCallback(async () => {
    try {
      if (!userId) return;
      
      console.log('🔍 Checking if worker can submit work readiness...');
      
      // Check if worker has an active assignment for today
      const { BackendAssignmentAPI } = await import('../../utils/backendAssignmentApi');
      const result = await BackendAssignmentAPI.canSubmitWorkReadiness();
      
      if (result.success) {
        if (result.canSubmit) {
          // Store assignment data for deadline display
          dispatch(setCurrentAssignment(result.assignment));
          
          // Worker has assignment - check if already submitted
          const today = getPHToday();
          
          const { data, error } = await dataClient
            .from('work_readiness')
            .select('*')
            .eq('worker_id', userId)
            .gte('submitted_at', today + 'T00:00:00.000Z')
            .lte('submitted_at', today + 'T23:59:59.999Z')
            .order('submitted_at', { ascending: false })
            .limit(1);

          if (error) {
            console.error('❌ Error fetching work readiness data:', error);
            dispatch(setHasSubmittedToday(false));
            dispatch(setTodaySubmission(null));
            return;
          }
          
          if (data && data.length > 0) {
            // Already submitted today
            dispatch(setHasSubmittedToday(true));
            dispatch(setTodaySubmission(data[0]));
            console.log('✅ Work readiness already submitted today');
          } else {
            // Has assignment but not submitted yet
            dispatch(setHasSubmittedToday(false));
            dispatch(setTodaySubmission(null));
            console.log('✅ Work readiness enabled - has assignment for today');
          }
        } else {
          // No assignment for today
          dispatch(setCurrentAssignment(null));
          dispatch(setHasSubmittedToday(true)); // Disable the button
          dispatch(setTodaySubmission(null));
          console.log('❌ Work readiness disabled - no assignment for today');
        }
      } else {
        console.error('❌ Error checking assignment:', result.message);
        dispatch(setCurrentAssignment(null));
        dispatch(setHasSubmittedToday(false));
        dispatch(setTodaySubmission(null));
      }
    } catch (error) {
      console.error('❌ Error checking assignment status:', error);
      dispatch(setHasSubmittedToday(false));
      dispatch(setTodaySubmission(null));
    }
  }, [userId, dispatch, getPHToday]);

  useEffect(() => {
    if (userId) {
      fetchWorkerData();
      checkTodaySubmission();
    }
  }, [userId, fetchWorkerData, checkTodaySubmission]);

  return {
    cases,
    notifications,
    loading,
    fetchWorkerData,
    checkTodaySubmission,
  };
};

