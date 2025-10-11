import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  setWorkReadinessLoading,
  setWorkReadinessSuccess,
  setWorkReadinessError,
  setHasSubmittedToday,
  setTodaySubmission,
  setSuccessMessage,
  resetWorkReadinessForm,
} from '../../store/slices/workerSlice';
import { dataClient } from '../../lib/supabase';

export const useWorkReadiness = (user: any) => {
  const dispatch = useDispatch();
  const {
    workReadinessForm,
    workReadinessLoading,
    workReadinessSuccess,
    workReadinessError,
    hasSubmittedToday,
  } = useSelector((state: RootState) => state.worker);

  const handleSimpleWorkReadinessSubmit = useCallback(async (data: any) => {
    if (!user?.id) {
      dispatch(setWorkReadinessError('User not authenticated'));
      return;
    }

    console.log('🚀 Starting work readiness submission for user:', user.id);

    try {
      dispatch(setWorkReadinessLoading(true));
      dispatch(setWorkReadinessError(null));
      dispatch(setWorkReadinessSuccess(false));
      
      // Get worker's team leader ID
      let teamLeaderId = null;
      console.log('🔍 Worker team info:', { team: user.team, workerId: user.id });
      
      if (user.team) {
        try {
          // Look for team leader who manages this team (in managed_teams array)
          const { data: teamLeader, error: teamLeaderError } = await dataClient
            .from('users')
            .select('id, first_name, last_name, managed_teams')
            .eq('role', 'team_leader')
            .eq('is_active', true)
            .contains('managed_teams', [user.team])
            .single();
          
          if (!teamLeaderError && teamLeader) {
            teamLeaderId = teamLeader.id;
            console.log('✅ Found team leader:', { 
              id: teamLeader.id, 
              name: `${teamLeader.first_name} ${teamLeader.last_name}`,
              managedTeams: teamLeader.managed_teams,
              workerTeam: user.team 
            });
          } else {
            console.error('❌ Team leader lookup failed:', teamLeaderError);
            
            // Fallback: try to find team leader by team field as well
            const { data: fallbackLeader, error: fallbackError } = await dataClient
              .from('users')
              .select('id, first_name, last_name, team, email')
              .eq('role', 'team_leader')
              .eq('team', user.team)
              .eq('is_active', true)
              .single();
            
            if (!fallbackError && fallbackLeader) {
              teamLeaderId = fallbackLeader.id;
              console.log('✅ Found team leader (fallback):', { 
                id: fallbackLeader.id, 
                name: `${fallbackLeader.first_name} ${fallbackLeader.last_name}`,
                email: fallbackLeader.email,
                team: fallbackLeader.team,
                workerTeam: user.team 
              });
            }
          }
        } catch (error) {
          console.error('❌ Error finding team leader:', error);
        }
      } else {
        console.warn('⚠️ Worker has no team assigned');
      }
      
      // Convert simple form data to work readiness format
      const fatigueLevel = Math.max(1, Math.min(10, data.fatigueLevel || 1));
      
      const workReadinessData = {
        worker_id: user.id,
        team_leader_id: teamLeaderId,
        team: user.team || 'DEFAULT TEAM',
        fatigue_level: fatigueLevel,
        pain_discomfort: data.painLevel > 0 ? 'yes' : 'no',
        readiness_level: data.painLevel <= 2 && data.fatigueLevel <= 2 && data.stressLevel <= 2 && data.sleepHours >= 6 ? 'fit' : 
                        data.painLevel <= 5 && data.fatigueLevel <= 5 && data.stressLevel <= 5 ? 'minor' : 'not_fit',
        mood: data.stressLevel <= 2 ? 'excellent' : data.stressLevel <= 5 ? 'good' : data.stressLevel <= 7 ? 'okay' : 'poor',
        notes: data.notes || null,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      };

      console.log('📤 Submitting work readiness data:', workReadinessData);
      
      // Submit work readiness data with cycle tracking
      try {
        const { kpiAPI } = await import('../../utils/backendApi');
        
        const assessmentData = {
          readiness_level: workReadinessData.readiness_level,
          fatigue_level: workReadinessData.fatigue_level,
          mood: workReadinessData.mood,
          pain_discomfort: workReadinessData.pain_discomfort,
          notes: workReadinessData.notes
        };
        
        const cycleResult = await kpiAPI.submitAssessment({ 
          workerId: user.id,
          assessmentData: assessmentData
        });
        
        if (cycleResult.success) {
          console.log('✅ Work readiness submitted with cycle data:', cycleResult.message);
          dispatch(setSuccessMessage(cycleResult.message));
        } else {
          throw new Error(cycleResult.message || 'Failed to submit assessment');
        }
      } catch (cycleError) {
        console.error('❌ Error submitting work readiness:', cycleError);
        throw cycleError;
      }
      
      // Send notification to team leader if found
      if (teamLeaderId) {
        try {
          const notificationData = {
            recipient_id: teamLeaderId,
            sender_id: user.id,
            type: 'work_readiness_submitted',
            title: workReadinessData.readiness_level === 'not_fit' ? 'Work Readiness Assessment - NOT FIT' : 'Work Readiness Assessment Submitted',
            message: `${user.firstName || 'Worker'} has submitted their work readiness assessment. Status: ${workReadinessData.readiness_level === 'not_fit' ? 'NOT FIT FOR WORK' : workReadinessData.readiness_level === 'minor' ? 'Minor Concerns' : 'Fit for Work'}.`,
            priority: workReadinessData.readiness_level === 'not_fit' ? 'high' : 'medium',
            action_url: '/team-leader',
            metadata: {
              worker_id: user.id,
              worker_name: user.firstName || 'Worker',
              readiness_level: workReadinessData.readiness_level,
              fatigue_level: workReadinessData.fatigue_level,
              mood: workReadinessData.mood
            }
          };

          const { error: notificationError } = await dataClient
            .from('notifications')
            .insert([notificationData]);

          if (notificationError) {
            console.error('❌ Failed to send notification to team leader:', notificationError);
          } else {
            console.log('✅ Notification sent to team leader successfully:', teamLeaderId);
          }
        } catch (notificationError) {
          console.error('❌ Error sending notification:', notificationError);
        }
      }
      
      // Show success
      dispatch(setWorkReadinessSuccess(true));
      dispatch(setHasSubmittedToday(true));
      
    } catch (err: any) {
      console.error('Error submitting work readiness:', err);
      dispatch(setWorkReadinessError(err.message || 'Failed to submit work readiness assessment'));
    } finally {
      dispatch(setWorkReadinessLoading(false));
    }
  }, [user, dispatch]);

  return {
    workReadinessForm,
    workReadinessLoading,
    workReadinessSuccess,
    workReadinessError,
    hasSubmittedToday,
    handleSimpleWorkReadinessSubmit,
  };
};

