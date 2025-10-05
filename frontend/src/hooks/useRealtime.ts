import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { dataClient } from '../lib/supabase';
import { queryKeys } from '../lib/queryClient';

// Hook for real-time work readiness updates
export const useWorkReadinessRealtime = (teamLeaderId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!teamLeaderId) return;

    console.log('🔄 Setting up real-time work readiness subscription for team leader:', teamLeaderId);

    const subscription = dataClient
      .channel('work-readiness-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'work_readiness'
      }, (payload: any) => {
        console.log('📡 Real-time: New work readiness submission detected:', payload);
        
        // Invalidate all work readiness queries
        queryClient.invalidateQueries({ queryKey: queryKeys.workReadiness.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
        
        console.log('🔄 Cache invalidated for work readiness updates');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'work_readiness'
      }, (payload: any) => {
        console.log('📡 Real-time: Work readiness updated:', payload);
        
        // Invalidate all work readiness queries
        queryClient.invalidateQueries({ queryKey: queryKeys.workReadiness.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
        
        console.log('🔄 Cache invalidated for work readiness updates');
      })
      .subscribe((status: any) => {
        console.log('📡 Real-time work readiness subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up real-time work readiness subscription...');
      subscription.unsubscribe();
    };
  }, [teamLeaderId, queryClient]);
};

// Hook for real-time team updates
export const useTeamRealtime = (teamLeaderId: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!teamLeaderId) return;

    console.log('🔄 Setting up real-time team subscription for team leader:', teamLeaderId);

    const subscription = dataClient
      .channel('team-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `team_leader_id=eq.${teamLeaderId}`
      }, (payload: any) => {
        console.log('📡 Real-time: Team member updated:', payload);
        
        // Invalidate team queries
        queryClient.invalidateQueries({ queryKey: queryKeys.team.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
        
        console.log('🔄 Cache invalidated for team updates');
      })
      .subscribe((status: any) => {
        console.log('📡 Real-time team subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up real-time team subscription...');
      subscription.unsubscribe();
    };
  }, [teamLeaderId, queryClient]);
};
