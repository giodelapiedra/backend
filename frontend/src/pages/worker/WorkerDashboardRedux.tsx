import React, { memo, useCallback } from 'react';
import { Box, Alert, Grid } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import {
  setShowSimpleCheckIn,
  setShowSimpleWorkReadiness,
  clearSuccessMessage,
  closeCheckIn,
  closeWorkReadiness,
  setShowCycleWelcome,
} from '../../store/slices/workerSlice';

// Layout
import LayoutWithSidebar from '../../components/LayoutWithSidebar';

// Worker Components
import WelcomeHeader from '../../components/worker/WelcomeHeader';
import GoalTrackingCard from '../../components/GoalTrackingCard';
import SimpleCheckIn from '../../components/SimpleCheckIn';
import SimpleWorkReadiness from '../../components/SimpleWorkReadiness';
import {
  DailyCheckInCard,
  RecoveryExercisesCard,
  WorkReadinessCard,
  ReportIncidentCard,
} from '../../components/worker/ActionCards';

// Hooks
import {
  useWorkerData,
  useExerciseCompletion,
  useWorkReadiness,
  useLoginCycle,
} from '../../hooks/worker';

const WorkerDashboardRedux: React.FC = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Redux state
  const {
    loading,
    successMessage,
    showSimpleCheckIn,
    showSimpleWorkReadiness,
    showCycleWelcome,
    checkInLoading,
    checkInSuccess,
    checkInError,
    currentAssignment,
    todaySubmission,
    hasSubmittedToday,
    hasCompletedExercisesToday,
    exerciseCompletionTime,
    cycleWelcomeMessage,
  } = useSelector((state: RootState) => state.worker);

  // Custom hooks
  const { fetchWorkerData } = useWorkerData(user?.id);
  const { checkExerciseCompletion } = useExerciseCompletion(user?.id);
  const { 
    workReadinessLoading,
    workReadinessSuccess,
    workReadinessError,
    handleSimpleWorkReadinessSubmit 
  } = useWorkReadiness(user);
  const { handleLoginCycle } = useLoginCycle(user);

  // Initialize login cycle
  React.useEffect(() => {
    if (user?.role === 'worker') {
      handleLoginCycle();
    }
  }, [user?.role, handleLoginCycle]);

  // Callback handlers
  const handleCheckInClick = useCallback(() => {
    dispatch(setShowSimpleCheckIn(true));
  }, [dispatch]);

  const handleRehabPlanClick = useCallback(() => {
    navigate('/worker/rehabilitation-plan');
  }, [navigate]);

  const handleWorkReadinessClick = useCallback(() => {
    dispatch(setShowSimpleWorkReadiness(true));
  }, [dispatch]);

  const handleCloseCheckIn = useCallback(() => {
    dispatch(closeCheckIn());
  }, [dispatch]);

  const handleCloseWorkReadiness = useCallback(() => {
    dispatch(closeWorkReadiness());
  }, [dispatch]);

  const handleSimpleCheckInSubmit = useCallback(async (data: any) => {
    // Check-in logic handled by SimpleCheckIn component
    console.log('Check-in submitted:', data);
    await fetchWorkerData();
  }, [fetchWorkerData]);

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Box>Loading dashboard...</Box>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        padding: { xs: 1, sm: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Success messages */}
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              backgroundColor: '#f0fdf4',
              borderColor: '#bbf7d0',
              color: '#166534',
              maxWidth: { xs: '100%', sm: 600 }
            }} 
            onClose={() => dispatch(clearSuccessMessage())}
          >
            {successMessage}
          </Alert>
        )}

        {/* Welcome Header */}
        <WelcomeHeader user={user || {}} />

        {/* Weekly Goal Tracking & KPI */}
        <Box sx={{ mb: 4, width: '100%', maxWidth: { xs: '100%', sm: 800 } }}>
          <GoalTrackingCard userId={user?.id || ''} />
        </Box>

        {/* Main Action Cards */}
        <Grid container spacing={window.innerWidth <= 768 ? 2 : 3} sx={{ 
          maxWidth: { xs: '100%', sm: 600 }, 
          mx: 'auto',
          px: { xs: 2, sm: 0 }
        }}>
          {/* Daily Check-In Card - Only for Package 2+ */}
          {user?.package && user.package !== 'package1' && (
            <DailyCheckInCard onClick={handleCheckInClick} />
          )}

          {/* Recovery Exercises Card - Only for Package 2+ */}
          {user?.package && user.package !== 'package1' && (
            <RecoveryExercisesCard 
              hasCompletedExercisesToday={hasCompletedExercisesToday}
              exerciseCompletionTime={exerciseCompletionTime}
              onClick={handleRehabPlanClick}
            />
          )}

          {/* Work Readiness Card */}
          <WorkReadinessCard 
            hasSubmittedToday={hasSubmittedToday}
            todaySubmission={todaySubmission}
            currentAssignment={currentAssignment}
            onClick={handleWorkReadinessClick}
          />

          {/* Report Incident Card */}
          <ReportIncidentCard onClick={() => {/* Navigate to incident reporting */}} />
        </Grid>

        {/* SimpleCheckIn Modal */}
        {showSimpleCheckIn && (
          <SimpleCheckIn
            onSubmit={handleSimpleCheckInSubmit}
            onClose={handleCloseCheckIn}
            loading={checkInLoading}
            success={checkInSuccess}
            error={checkInError}
          />
        )}

        {/* SimpleWorkReadiness Modal */}
        {showSimpleWorkReadiness && (
          <SimpleWorkReadiness
            onSubmit={handleSimpleWorkReadinessSubmit}
            onClose={handleCloseWorkReadiness}
            loading={workReadinessLoading}
            success={workReadinessSuccess}
            error={workReadinessError}
            hasSubmittedToday={hasSubmittedToday}
          />
        )}

        {/* Cycle Welcome Modal */}
        {showCycleWelcome && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: '1rem',
            }}
          >
            <Box
              sx={{
                background: 'white',
                borderRadius: '1rem',
                padding: '2rem',
                maxWidth: '500px',
                textAlign: 'center',
              }}
            >
              <Box sx={{ fontSize: '4rem', mb: 2 }}>🎉</Box>
              <Box sx={{ fontSize: '1.5rem', fontWeight: 'bold', mb: 2 }}>
                {cycleWelcomeMessage}
              </Box>
              <button
                onClick={() => {
                  dispatch(setShowCycleWelcome(false));
                  dispatch(setShowSimpleWorkReadiness(true));
                }}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Start Assessment
              </button>
            </Box>
          </Box>
        )}
      </Box>
    </LayoutWithSidebar>
  );
});

WorkerDashboardRedux.displayName = 'WorkerDashboardRedux';

export default WorkerDashboardRedux;

