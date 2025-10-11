import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  setSuccessMessage,
  setCycleWelcomeMessage,
  setShowCycleWelcome,
} from '../../store/slices/workerSlice';

export const useLoginCycle = (user: any) => {
  const dispatch = useDispatch();

  const handleLoginCycle = useCallback(async () => {
    try {
      if (!user?.id) {
        console.log('❌ No user ID available');
        return;
      }
      
      console.log('🎯 Starting login cycle for worker:', user.id);
      console.log('🎯 User role:', user.role);
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/api/goal-kpi/login-cycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workerId: user.id })
      });
      
      console.log('🔍 Response status:', response.status);
      const result = await response.json();
      console.log('🔍 Full result:', result);
      
      if (result.success) {
        console.log('✅ Login cycle started:', result.message);
        
        // Check if it's a special Day 1 case
        if (result.isFirstTimeLogin || result.isNewCycleStart || result.isCycleReset) {
          console.log('🎉 Showing Day 1 welcome popup!');
          let message = "🎉 Welcome! This is your first day of the 7-day Work Readiness cycle!";
          if (result.isNewCycleStart) {
            message = "🎉 Great! Your new 7-day Work Readiness cycle has started!";
          } else if (result.isCycleReset) {
            message = "🔄 A new cycle has started! Let's begin fresh!";
          }
          dispatch(setCycleWelcomeMessage(message));
          dispatch(setShowCycleWelcome(true));
        } else if (result.needsNewLogin) {
          dispatch(setSuccessMessage(result.message));
          console.log('🔄 Cycle completed, waiting for next login to start new cycle');
        } else {
          dispatch(setSuccessMessage(result.message));
          console.log('📝 Regular cycle message:', result.message);
        }
      } else {
        console.error('❌ Failed to start login cycle:', result.message);
      }
    } catch (error) {
      console.error('❌ Error starting login cycle:', error);
    }
  }, [user, dispatch]);

  return {
    handleLoginCycle,
  };
};

