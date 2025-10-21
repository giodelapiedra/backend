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
          if (!teamLeaderId) {
            return { data: null };
          }

          // Get team leader data (trust database for overdue status)
          const { data: teamLeaderData, error: leaderError } = await dataClient
            .from('users')
            .select('*')
            .eq('id', teamLeaderId)
            .single();
          
          if (leaderError) {
            console.error('❌ Team leader not found:', leaderError);
            // Return empty data for new accounts instead of throwing error
            return { 
              data: {
                teamLeader: null,
                teamMembers: [],
                workReadiness: [],
                todaySubmissions: [],
                authenticationLogs: [],
                metrics: {
                  totalMembers: 0,
                  todaySubmissionCount: 0,
                  complianceRate: '0.0',
                  loggedInCount: 0,
                  managedTeams: []
                }
              }
            };
          }

          // Handle team leader with no team setup yet
          if (!teamLeaderData.team && !teamLeaderData.managed_teams) {
            console.log('🔍 Team leader has no team setup yet');
            return { 
              data: {
                teamLeader: teamLeaderData,
                teamMembers: [],
                workReadiness: [],
                todaySubmissions: [],
                authenticationLogs: [],
                metrics: {
                  totalMembers: 0,
                  todaySubmissionCount: 0,
                  complianceRate: '0.0',
                  loggedInCount: 0,
                  managedTeams: []
                }
              }
            };
          }

          // Handle team leader with empty managed_teams array
          if (teamLeaderData.managed_teams && teamLeaderData.managed_teams.length === 0) {
            console.log('🔍 Team leader has empty managed teams');
            return { 
              data: {
                teamLeader: teamLeaderData,
                teamMembers: [],
                workReadiness: [],
                todaySubmissions: [],
                authenticationLogs: [],
                metrics: {
                  totalMembers: 0,
                  todaySubmissionCount: 0,
                  complianceRate: '0.0',
                  loggedInCount: 0,
                  managedTeams: []
                }
              }
            };
          }
          
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

    // Get work readiness trend data - DIRECT FROM DATABASE
    getWorkReadinessTrend: builder.query({
      queryFn: async ({ teamLeaderId, days = 7 }: { teamLeaderId: string; days?: number }) => {
        try {
          console.log('📊 [NEW LOGIC] Fetching work readiness for team_leader_id:', teamLeaderId);
          
          if (!teamLeaderId) {
            console.log('❌ No team leader ID provided');
            return { data: [] };
          }

          // Calculate date range - FIXED: Include today in the range
          const today = new Date();
          const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
          const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
          // Go back (days - 1) to include today as one of the days
          startDate.setDate(startDate.getDate() - (days - 1));

          console.log('📅 Date range (FIXED - includes TODAY):', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            startDateFormatted: startDate.toLocaleDateString(),
            endDateFormatted: endDate.toLocaleDateString(),
            days: days,
            includesYesterday: days > 1,
            includesToday: true
          });

          // DIRECT QUERY: Get ALL work_readiness records for this team leader
          const { data: workReadinessData, error: wrError } = await dataClient
            .from('work_readiness')
            .select('*')
            .eq('team_leader_id', teamLeaderId)
            .gte('submitted_at', startDate.toISOString())
            .lte('submitted_at', endDate.toISOString())
            .order('submitted_at', { ascending: true });

          if (wrError) {
            console.error('❌ Database query error:', wrError);
            throw wrError;
          }

          console.log('✅ RAW DATABASE RESULT:', {
            totalRecords: workReadinessData?.length || 0,
            records: workReadinessData
          });

          // Initialize date map with all dates in range
          const dateMap = new Map();
          
          // Create array of dates from startDate to today (inclusive)
          for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            // Use local date string to avoid timezone issues
            const dateKey = date.toISOString().split('T')[0];
            dateMap.set(dateKey, {
              date: dateKey,
              fitForWork: 0,
              minorConcernsFitForWork: 0,
              notFitForWork: 0,
              total: 0
            });
          }

          console.log('📅 Initialized date range:', {
            totalDays: dateMap.size,
            dates: Array.from(dateMap.keys()),
            firstDate: Array.from(dateMap.keys())[0],
            lastDate: Array.from(dateMap.keys())[dateMap.size - 1]
          });

          // If no data, return empty array with initialized dates
          if (!workReadinessData || workReadinessData.length === 0) {
            console.log('⚠️ NO DATA FOUND - returning empty trend with initialized dates');
            const trendData: any[] = [];
            dateMap.forEach((value) => {
              trendData.push(value);
            });
            return { data: trendData };
          }

          // Process each record
          console.log('🔄 Processing records from database...');
          
          workReadinessData.forEach((record: any, index: number) => {
            // Extract date from submitted_at timestamp
            const submittedDate = new Date(record.submitted_at);
            const dateKey = submittedDate.toISOString().split('T')[0];
            const level = record.readiness_level?.toLowerCase()?.trim();
            
            console.log(`\n📝 Record ${index + 1}/${workReadinessData.length}:`, {
              id: record.id,
              worker_id: record.worker_id,
              submitted_at: record.submitted_at,
              dateKey: dateKey,
              readiness_level: record.readiness_level,
              normalized_level: level,
              dateInRange: dateMap.has(dateKey)
            });

            // Check if date is in our range
            if (!dateMap.has(dateKey)) {
              console.log(`  ⚠️ Date ${dateKey} not in range [${Array.from(dateMap.keys())[0]} to ${Array.from(dateMap.keys())[dateMap.size - 1]}]`);
              return;
            }

            const dayData = dateMap.get(dateKey);
            
            // Map readiness levels to counts
            if (level === 'fit' || level === 'fit_for_work') {
              dayData.fitForWork++;
              console.log(`  ✅ Fit for Work → Count: ${dayData.fitForWork}`);
            } else if (level === 'minor' || level === 'minor_concerns' || level === 'minor_concerns_fit_for_work') {
              dayData.minorConcernsFitForWork++;
              console.log(`  ✅ Minor Concerns → Count: ${dayData.minorConcernsFitForWork}`);
            } else if (level === 'not_fit' || level === 'not_fit_for_work') {
              dayData.notFitForWork++;
              console.log(`  ✅ Not Fit for Work → Count: ${dayData.notFitForWork}`);
            } else {
              console.log(`  ❌ Unknown level: "${level}" (raw: "${record.readiness_level}")`);
            }
            
            dayData.total++;
            dateMap.set(dateKey, dayData);
          });

          console.log('\n📊 Processing complete!');

          // Convert map to array and sort by date
          const trendData: any[] = [];
          dateMap.forEach((value) => {
            trendData.push(value);
          });

          // Sort by date to ensure chronological order
          trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // Calculate summary statistics
          const summary = {
            totalDays: trendData.length,
            totalSubmissions: trendData.reduce((sum, d) => sum + d.total, 0),
            fitTotal: trendData.reduce((sum, d) => sum + d.fitForWork, 0),
            minorTotal: trendData.reduce((sum, d) => sum + d.minorConcernsFitForWork, 0),
            notFitTotal: trendData.reduce((sum, d) => sum + d.notFitForWork, 0),
            dateRange: {
              start: trendData[0]?.date,
              end: trendData[trendData.length - 1]?.date
            }
          };

          console.log('\n✅ ===== FINAL RESULT =====');
          console.log('📊 Summary:', summary);
          console.log('📈 Trend Data:', trendData);
          console.log('=========================\n');

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
          if (!teamLeaderId) {
            return { data: [] };
          }

          // Fetch assignments with worker details (trust database for overdue status)
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

          return { data: data || [] };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching assignments:', error);
          }
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
          
          if (leaderError) {
            console.error('❌ Team leader not found for monthly performance:', leaderError);
            return { data: { assignments: [], submissions: [], teamMembers: [] } };
          }

          // Handle team leader with no team setup
          if (!teamLeaderData.team && (!teamLeaderData.managed_teams || teamLeaderData.managed_teams.length === 0)) {
            console.log('🔍 Team leader has no team setup for monthly performance');
            return { data: { assignments: [], submissions: [], teamMembers: [] } };
          }

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

