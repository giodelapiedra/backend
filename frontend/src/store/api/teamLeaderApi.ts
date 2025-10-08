import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { dataClient } from '../../lib/supabase';

export const teamLeaderApi = createApi({
  reducerPath: 'teamLeaderApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '', // Use Supabase only
  }),
  tagTypes: ['TeamLeaderAnalytics', 'WorkReadiness', 'Assignments', 'TeamMembers'],
  refetchOnFocus: false,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  endpoints: (builder) => ({
    // Get team leader analytics data
    getTeamLeaderAnalytics: builder.query({
      queryFn: async (teamLeaderId: string) => {
        try {
          console.log('🔍 Fetching team leader analytics for:', teamLeaderId);
          
          if (!teamLeaderId) {
            return { data: null };
          }

          // Get team leader data
          const { data: teamLeaderData, error: leaderError } = await dataClient
            .from('users')
            .select('*')
            .eq('id', teamLeaderId)
            .single();
          
          if (leaderError) throw leaderError;
          
          // Get team members
          const managedTeams = teamLeaderData.managed_teams || [];
          if (teamLeaderData.team && !managedTeams.includes(teamLeaderData.team)) {
            managedTeams.push(teamLeaderData.team);
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

            if (!workReadinessError) {
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

          // Get authentication logs
          let authenticationLogs: any[] = [];
          
          if (teamMemberIds.length > 0) {
            const { data: authLogs, error: authError } = await dataClient
              .from('authentication_logs')
              .select('user_id, created_at, action, success')
              .in('user_id', teamMemberIds)
              .gte('created_at', todayStart.toISOString())
              .lte('created_at', todayEnd.toISOString())
              .order('created_at', { ascending: false });

            if (!authError) {
              authenticationLogs = (authLogs || []).filter(log => 
                (!log.action || log.action === 'login') && 
                (log.success === undefined || log.success === true)
              );
            }
          }

          // Calculate metrics
          const totalMembers = teamMembers?.length || 0;
          const todaySubmissionCount = todaySubmissions.length;
          const complianceRate = totalMembers > 0 
            ? ((todaySubmissionCount / totalMembers) * 100).toFixed(1)
            : '0.0';

          // Get unique logged in members today
          const loggedInMemberIds = new Set(authenticationLogs.map(log => log.user_id));
          const loggedInCount = loggedInMemberIds.size;

          console.log('✅ Team leader analytics fetched successfully');

          return {
            data: {
              teamLeader: teamLeaderData,
              teamMembers: teamMembers || [],
              workReadiness: workReadinessData,
              todaySubmissions,
              authenticationLogs,
              metrics: {
                totalMembers,
                todaySubmissionCount,
                complianceRate,
                loggedInCount,
                managedTeams
              }
            }
          };
        } catch (error) {
          console.error('❌ Error fetching team leader analytics:', error);
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: ['TeamLeaderAnalytics', 'TeamMembers', 'WorkReadiness'],
    }),

    // Get work readiness trend data
    getWorkReadinessTrend: builder.query({
      queryFn: async ({ teamLeaderId, days = 7 }: { teamLeaderId: string; days?: number }) => {
        try {
          console.log('📊 Fetching work readiness trend for:', teamLeaderId, 'days:', days);
          
          if (!teamLeaderId) {
            return { data: [] };
          }

          // Get team members
          const { data: teamLeaderData, error: leaderError } = await dataClient
            .from('users')
            .select('managed_teams, team')
            .eq('id', teamLeaderId)
            .single();
          
          if (leaderError) throw leaderError;

          const managedTeams = teamLeaderData.managed_teams || [];
          if (teamLeaderData.team && !managedTeams.includes(teamLeaderData.team)) {
            managedTeams.push(teamLeaderData.team);
          }

          const { data: teamMembers, error: membersError } = await dataClient
            .from('users')
            .select('id')
            .eq('role', 'worker')
            .in('team', managedTeams);
          
          if (membersError) throw membersError;

          const teamMemberIds = teamMembers?.map(m => m.id) || [];
          
          if (teamMemberIds.length === 0) {
            return { data: [] };
          }

          // Calculate date range
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);

          // Get work readiness data for the period
          const { data: workReadinessData, error: wrError } = await dataClient
            .from('work_readiness')
            .select('readiness_level, submitted_at')
            .in('worker_id', teamMemberIds)
            .gte('submitted_at', startDate.toISOString())
            .lte('submitted_at', endDate.toISOString())
            .order('submitted_at', { ascending: true });

          if (wrError) throw wrError;

          // Group by date and readiness level
          const trendData: any[] = [];
          const dateMap = new Map();

          for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateKey = date.toISOString().split('T')[0];
            dateMap.set(dateKey, {
              date: dateKey,
              fit: 0,
              minor: 0,
              not_fit: 0,
              total: 0
            });
          }

          // Count submissions by date and level
          (workReadinessData || []).forEach((wr: any) => {
            const dateKey = wr.submitted_at.split('T')[0];
            if (dateMap.has(dateKey)) {
              const dayData = dateMap.get(dateKey);
              dayData[wr.readiness_level] = (dayData[wr.readiness_level] || 0) + 1;
              dayData.total += 1;
              dateMap.set(dateKey, dayData);
            }
          });

          // Convert to array
          dateMap.forEach((value) => {
            trendData.push(value);
          });

          console.log('✅ Work readiness trend fetched successfully');

          return { data: trendData };
        } catch (error) {
          console.error('❌ Error fetching work readiness trend:', error);
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: ['WorkReadiness'],
    }),

    // Get work readiness assignments
    getWorkReadinessAssignments: builder.query({
      queryFn: async ({ teamLeaderId, date }: { teamLeaderId: string; date?: string }) => {
        try {
          console.log('📋 Fetching work readiness assignments for:', teamLeaderId);
          
          if (!teamLeaderId) {
            return { data: [] };
          }

          let query = dataClient
            .from('work_readiness_assignments')
            .select(`
              *,
              worker:users!work_readiness_assignments_worker_id_fkey(id, first_name, last_name, email)
            `)
            .eq('team_leader_id', teamLeaderId)
            .order('assigned_date', { ascending: false });

          if (date) {
            query = query.eq('assigned_date', date);
          }

          const { data, error } = await query;

          if (error) throw error;

          console.log('✅ Work readiness assignments fetched successfully');

          return { data: data || [] };
        } catch (error) {
          console.error('❌ Error fetching work readiness assignments:', error);
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: ['Assignments'],
    }),

    // Get team member details
    getTeamMemberDetails: builder.query({
      queryFn: async (memberId: string) => {
        try {
          console.log('👤 Fetching team member details for:', memberId);
          
          if (!memberId) {
            return { data: null };
          }

          const { data, error } = await dataClient
            .from('users')
            .select('*')
            .eq('id', memberId)
            .single();

          if (error) throw error;

          // Get recent work readiness submissions
          const { data: recentSubmissions, error: submissionsError } = await dataClient
            .from('work_readiness')
            .select('*')
            .eq('worker_id', memberId)
            .order('submitted_at', { ascending: false })
            .limit(10);

          if (submissionsError) throw submissionsError;

          // Get recent assignments
          const { data: recentAssignments, error: assignmentsError } = await dataClient
            .from('work_readiness_assignments')
            .select('*')
            .eq('worker_id', memberId)
            .order('assigned_date', { ascending: false })
            .limit(10);

          if (assignmentsError) throw assignmentsError;

          console.log('✅ Team member details fetched successfully');

          return {
            data: {
              member: data,
              recentSubmissions: recentSubmissions || [],
              recentAssignments: recentAssignments || []
            }
          };
        } catch (error) {
          console.error('❌ Error fetching team member details:', error);
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: ['TeamMembers', 'WorkReadiness', 'Assignments'],
    }),

    // Get monthly performance data
    getMonthlyPerformance: builder.query<any, { teamLeaderId: string; year: number; month: number }>({
      queryFn: async ({ teamLeaderId, year, month }) => {
        try {
          console.log('📅 Fetching monthly performance for:', teamLeaderId, year, month);
          
          if (!teamLeaderId) {
            return { data: null };
          }

          // Calculate month start and end dates
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0, 23, 59, 59, 999);

          // Get team members
          const { data: teamLeaderData, error: leaderError } = await dataClient
            .from('users')
            .select('managed_teams, team')
            .eq('id', teamLeaderId)
            .single();
          
          if (leaderError) throw leaderError;

          const managedTeams = teamLeaderData.managed_teams || [];
          if (teamLeaderData.team && !managedTeams.includes(teamLeaderData.team)) {
            managedTeams.push(teamLeaderData.team);
          }

          const { data: teamMembers, error: membersError } = await dataClient
            .from('users')
            .select('id, first_name, last_name')
            .eq('role', 'worker')
            .in('team', managedTeams);
          
          if (membersError) throw membersError;

          const teamMemberIds = teamMembers?.map(m => m.id) || [];

          if (teamMemberIds.length === 0) {
            return { data: { assignments: [], submissions: [], teamMembers: [] } };
          }

          // Get assignments for the month
          const { data: assignments, error: assignmentsError } = await dataClient
            .from('work_readiness_assignments')
            .select('*')
            .in('worker_id', teamMemberIds)
            .gte('assigned_date', startDate.toISOString().split('T')[0])
            .lte('assigned_date', endDate.toISOString().split('T')[0]);

          if (assignmentsError) throw assignmentsError;

          // Get submissions for the month
          const { data: submissions, error: submissionsError } = await dataClient
            .from('work_readiness')
            .select('*')
            .in('worker_id', teamMemberIds)
            .gte('submitted_at', startDate.toISOString())
            .lte('submitted_at', endDate.toISOString());

          if (submissionsError) throw submissionsError;

          console.log('✅ Monthly performance fetched successfully');

          return {
            data: {
              assignments: assignments || [],
              submissions: submissions || [],
              teamMembers: teamMembers || [],
              period: { year, month, startDate: startDate.toISOString(), endDate: endDate.toISOString() }
            }
          };
        } catch (error) {
          console.error('❌ Error fetching monthly performance:', error);
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: ['Assignments', 'WorkReadiness'],
    }),
  }),
});

export const {
  useGetTeamLeaderAnalyticsQuery,
  useGetWorkReadinessTrendQuery,
  useGetWorkReadinessAssignmentsQuery,
  useGetTeamMemberDetailsQuery,
  useGetMonthlyPerformanceQuery,
} = teamLeaderApi;

