import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataClient } from '../lib/supabase';
import { queryKeys } from '../lib/queryClient';

// Hook for fetching team leader analytics data
export const useTeamLeaderAnalytics = (teamLeaderId: string) => {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(teamLeaderId),
    queryFn: async () => {
      const { data, error } = await dataClient
        .from('users')
        .select('*')
        .eq('id', teamLeaderId)
        .single();
      
      if (error) throw error;
      
      // Get team members
      const managedTeams = data.managed_teams || [];
      if (data.team && !managedTeams.includes(data.team)) {
        managedTeams.push(data.team);
      }
      
      const { data: teamMembers, error: membersError } = await dataClient
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .in('team', managedTeams);
      
      if (membersError) throw membersError;
      
      // Get work readiness data
      const teamMemberIds = teamMembers?.map(m => m.id) || [];
      let workReadinessData: any[] = [];
      
      if (teamMemberIds.length > 0) {
        const { data: wrData, error: workReadinessError } = await dataClient
          .from('work_readiness')
          .select('*')
          .in('worker_id', teamMemberIds)
          .order('submitted_at', { ascending: false });

        if (workReadinessError) {
          console.error('Error fetching work readiness data:', workReadinessError);
        } else {
          workReadinessData = wrData || [];
        }
      }

      // Calculate today's submissions and login status
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      const todaySubmissions = workReadinessData.filter(w => {
        if (!w.submitted_at) return false;
        const submissionDate = new Date(w.submitted_at);
        return submissionDate >= todayStart && submissionDate <= todayEnd;
      });

      // Get authentication logs for today to determine login status
      let authenticationLogs: any[] = [];
      
      if (teamMemberIds.length > 0) {
        // Try enhanced schema first (with action, success, created_at)
        const { data: authLogs, error: authError } = await dataClient
          .from('authentication_logs')
          .select('user_id, created_at, action, success')
          .in('user_id', teamMemberIds)
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())
          .order('created_at', { ascending: false });

        if (authError) {
          console.warn('Enhanced auth logs error, trying basic schema:', authError);
          
          // Fallback to basic schema (only basic fields)
          const { data: basicAuthLogs, error: basicError } = await dataClient
            .from('authentication_logs')
            .select('user_id')
            .in('user_id', teamMemberIds);
            
          if (basicError) {
            console.warn('Error with basic auth logs:', basicError);
          } else {
            // Convert basic logs to enhanced format for compatibility
            authenticationLogs = (basicAuthLogs || []).map(log => ({
              ...log,
              action: 'login',
              success: true,
              created_at: new Date().toISOString()
            }));
          }
        } else {
          // Filter only successful login events if schema supports it
          authenticationLogs = (authLogs || []).filter(log => 
            (!log.action || log.action === 'login') && 
            (log.success === undefined || log.success === true)
          );
        }
      }

      const total = teamMembers?.length || 0;
      const completed = todaySubmissions.length;

      return {
        teamLeader: {
          id: data.id,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          team: data.team,
          managedTeams: data.managed_teams || []
        },
        analytics: {
          totalTeamMembers: total,
          activeTeamMembers: teamMembers?.filter(m => m.is_active).length || 0,
          todayWorkReadinessStats: {
            completed,
            total
          },
          complianceRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          safetyMetrics: {
            highFatigueCount: todaySubmissions.filter(w => w.fatigue_level >= 4).length,
            notFitForWorkCount: todaySubmissions.filter(w => w.readiness_level === 'not_fit').length,
            painReportedCount: todaySubmissions.filter(w => w.pain_discomfort === 'yes').length,
            poorMoodCount: todaySubmissions.filter(w => w.mood === 'poor' || w.mood === 'terrible').length
          },
          teamPerformance: (teamMembers || []).map(member => {
            const todayMemberWorkReadiness = todaySubmissions.find(w => w.worker_id === member.id);
            const allMemberWorkReadiness = workReadinessData.filter(w => w.worker_id === member.id);
            const todayAuthLog = authenticationLogs.find(log => log.user_id === member.id && log.success === true);
            const allAuthLogs = authenticationLogs.filter(log => log.user_id === member.id && log.success === true);
            const lastAuthLog = allAuthLogs.length > 0 ? allAuthLogs[0] : null;
            
            return {
              memberName: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
              email: member.email,
              role: member.role,
              team: member.team,
              profileImage: member.profile_image_url || null,
              lastLogin: lastAuthLog ? new Date(lastAuthLog.created_at).toLocaleString() : 'Never',
              loginTime: todayAuthLog ? new Date(todayAuthLog.created_at).toLocaleString() : null,
              isActive: member.is_active || false,
              workReadinessStatus: todayMemberWorkReadiness ? 'Completed' : 'Not Started',
              activityLevel: allMemberWorkReadiness.length,
              loggedInToday: !!todayAuthLog, // Check if there's an auth log for today
              recentCheckIns: 0,
              recentAssessments: allMemberWorkReadiness.length,
              completedAssessments: allMemberWorkReadiness.filter(w => w.status === 'submitted').length,
              lastAssessment: allMemberWorkReadiness.length > 0 && allMemberWorkReadiness[0].submitted_at ? 
                new Date(allMemberWorkReadiness[0].submitted_at).toLocaleDateString() : 'Never',
              fatigueLevel: todayMemberWorkReadiness?.fatigue_level || null,
              readinessLevel: todayMemberWorkReadiness?.readiness_level || null,
              mood: todayMemberWorkReadiness?.mood || null
            };
          })
          // Sort with logged-in workers first, then by recent login time
          .sort((a, b) => {
            // First priority: logged in today
            if (a.loggedInToday && !b.loggedInToday) return -1;
            if (!a.loggedInToday && b.loggedInToday) return 1;
            
            // If both logged in today, sort by login time (most recent first)
            if (a.loggedInToday && b.loggedInToday && a.loginTime && b.loginTime) {
              return new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime();
            }
            
            // If same login status, sort by last login time
            if (a.lastLogin !== 'Never' && b.lastLogin !== 'Never') {
              return new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime();
            }
            
            // If never logged in, sort alphabetically
            return a.memberName.localeCompare(b.memberName);
          })
        }
      };
    },
    enabled: !!teamLeaderId,
  });
};

// Hook for fetching work readiness trend data
export const useWorkReadinessTrend = (teamLeaderId: string, dateRange: string, startDate?: Date, endDate?: Date) => {
  console.log('🔍 useWorkReadinessTrend: teamLeaderId:', teamLeaderId);
  console.log('🔍 useWorkReadinessTrend: dateRange:', dateRange);
  console.log('🔍 useWorkReadinessTrend: startDate:', startDate);
  console.log('🔍 useWorkReadinessTrend: endDate:', endDate);
  
  return useQuery({
    queryKey: queryKeys.workReadiness.trend(teamLeaderId, dateRange, startDate?.toISOString(), endDate?.toISOString()),
    queryFn: async () => {
      console.log('🔍 useWorkReadinessTrend: Starting query...');
      // Get team leader info
      const { data: teamLeader, error: leaderError } = await dataClient
        .from('users')
        .select('*')
        .eq('id', teamLeaderId)
        .single();
      
      if (leaderError) throw leaderError;
      
      // Get team members
      const managedTeams = teamLeader.managed_teams || [];
      if (teamLeader.team && !managedTeams.includes(teamLeader.team)) {
        managedTeams.push(teamLeader.team);
      }
      
      const { data: teamMembers, error: membersError } = await dataClient
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .in('team', managedTeams);
      
      if (membersError) throw membersError;
      
      // Get work readiness data
      const teamMemberIds = teamMembers?.map(m => m.id) || [];
      let workReadinessData: any[] = [];
      
      if (teamMemberIds.length > 0) {
        const { data: wrData, error: workReadinessError } = await dataClient
          .from('work_readiness')
          .select('*')
          .in('worker_id', teamMemberIds)
          .order('submitted_at', { ascending: false });

        if (workReadinessError) {
          console.error('Error fetching work readiness data:', workReadinessError);
        } else {
          workReadinessData = wrData || [];
        }
      }

      // Generate trend data based on date range
      let rangeStartDate: Date;
      let rangeEndDate: Date;

      if (dateRange === 'custom' && startDate && endDate) {
        // Use custom date range
        rangeStartDate = new Date(startDate);
        rangeEndDate = new Date(endDate);
      } else {
        // Use predefined ranges
        const today = new Date();
        let daysBack: number;

        if (dateRange === 'week') {
          daysBack = 7;
        } else if (dateRange === 'month') {
          daysBack = 30;
        } else if (dateRange === 'year') {
          daysBack = 365;
        } else {
          daysBack = 7; // default
        }

        rangeStartDate = new Date(today);
        rangeStartDate.setDate(today.getDate() - daysBack + 1);
        rangeEndDate = new Date(today);
      }

      const trendData = [];
      const currentDate = new Date(rangeStartDate);
      
      while (currentDate <= rangeEndDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999);
        
        const daySubmissions = workReadinessData.filter(w => {
          if (!w.submitted_at) return false;
          const submissionDate = new Date(w.submitted_at);
          return submissionDate >= dayStart && submissionDate <= dayEnd;
        });

        const notFitForWork = daySubmissions.filter(w => w.readiness_level === 'not_fit').length;
        const minorConcernsFitForWork = daySubmissions.filter(w => w.readiness_level === 'minor').length;
        const fitForWork = daySubmissions.filter(w => w.readiness_level === 'fit').length;

        trendData.push({
          date: dateStr,
          notFitForWork,
          minorConcernsFitForWork,
          fitForWork,
          total: notFitForWork + minorConcernsFitForWork + fitForWork
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('🔍 useWorkReadinessTrend: Final trendData:', trendData);
      console.log('🔍 useWorkReadinessTrend: trendData length:', trendData.length);
      
      const result = {
        teamLeader: {
          id: teamLeader.id,
          firstName: teamLeader.first_name,
          lastName: teamLeader.last_name,
          email: teamLeader.email,
          team: teamLeader.team,
          managedTeams: teamLeader.managed_teams || []
        },
        analytics: {
          readinessTrendData: trendData
        }
      };
      
      console.log('🔍 useWorkReadinessTrend: Final result:', result);
      return result;
    },
    enabled: !!teamLeaderId,
  });
};

// Hook for creating work readiness assessment
export const useCreateWorkReadiness = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workReadinessData: any) => {
      const { data, error } = await dataClient
        .from('work_readiness')
        .insert(workReadinessData)
        .select()
        .single();
      
      if (error) throw error;
      return { workReadiness: data };
    },
    onSuccess: (data, variables) => {
      // Invalidate all work readiness queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.workReadiness.all });
      
      // Also invalidate analytics queries
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      
      console.log('✅ Work readiness created, cache invalidated');
    },
  });
};
