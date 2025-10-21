import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { dataClient } from '../../lib/supabase';

// Utility: Validate UUID format
// Security: Enhanced UUID validation with better error handling
const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid.trim());
};

// Security: Input sanitization utility
const sanitizeString = (input: any, maxLength: number = 255): string => {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim().slice(0, maxLength);
};

export const teamsApi = createApi({
  reducerPath: 'teamsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '', // No fallback URL - use Supabase only
  }),
  tagTypes: ['Team', 'User'],
  // Minimal auto refresh - only on reconnect, no aggressive refresh
  refetchOnFocus: false,
  refetchOnReconnect: true, // Reconnect only - essential for network issues
  refetchOnMountOrArgChange: false, // No aggressive refresh
  endpoints: (builder) => ({
    getTeams: builder.query({
      queryFn: async (teamLeaderId: string = '') => {
        try {
          // Validate input
          if (!teamLeaderId || !teamLeaderId.trim()) {
            if (process.env.NODE_ENV === 'development') {
              console.log('No teamLeaderId provided');
            }
            return { 
              data: { 
                teams: [],
                currentTeam: null,
                defaultTeam: null
              } 
            };
          }

          // Validate UUID format for security
          if (!isValidUUID(teamLeaderId)) {
            throw new Error('Invalid team leader ID format');
          }
          
          // Get team leader's managed teams (minimal query for performance)
          const { data: teamLeader, error: leaderError } = await dataClient
            .from('users')
            .select('managed_teams, team, default_team')
            .eq('id', teamLeaderId)
            .single();
          
          if (leaderError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Error fetching team leader:', leaderError);
            }
            throw new Error('Failed to fetch team leader data');
          }
          
          // Build teams array efficiently
          let teams = teamLeader?.managed_teams || [];
          
          // Add current team if not in managed teams
          if (teams.length === 0 && teamLeader?.team) {
            teams = [teamLeader.team];
          }
          
          // Fallback: Get all unique teams (only if no teams found)
          if (teams.length === 0) {
            const { data: allTeams, error: allTeamsError } = await dataClient
              .from('users')
              .select('team')
              .not('team', 'is', null)
              .neq('team', '');
            
            if (!allTeamsError && allTeams) {
              teams = Array.from(new Set(allTeams.map(t => t.team).filter(Boolean)));
            }
          }
          
          return { 
            data: { 
              teams,
              currentTeam: teamLeader?.team || null,
              defaultTeam: teamLeader?.default_team || teamLeader?.team || null
            }
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('getTeams error:', error);
          }
          return { 
            error: { 
              status: 500, 
              data: error instanceof Error ? error.message : 'Failed to fetch teams'
            } 
          };
        }
      },
      providesTags: ['Team'],
    }),
    
    getTeamMembers: builder.query({
      queryFn: async ({ teamLeaderId, teamName }: { teamLeaderId: string; teamName?: string }) => {
        try {
          // Validate input
          if (!teamLeaderId || !teamLeaderId.trim()) {
            return { data: { teamMembers: [] } };
          }

          // Validate UUID
          if (!isValidUUID(teamLeaderId)) {
            throw new Error('Invalid team leader ID format');
          }
          
          // If team name is provided, filter by that specific team
          if (teamName) {
            const { data, error } = await dataClient
              .from('users')
              .select('*')
              .eq('role', 'worker')
              .eq('team', teamName)
              .order('created_at', { ascending: false });
            
            if (error) {
              throw new Error('Failed to fetch team members');
            }
            
            return { data: { teamMembers: data || [] } };
          } else {
            // Get team leader's managed teams
            const { data: teamLeader, error: leaderError } = await dataClient
              .from('users')
              .select('managed_teams, team')
              .eq('id', teamLeaderId)
              .single();
            
            if (leaderError) {
              throw new Error('Failed to fetch team leader');
            }
            
            // Build managed teams array
            const managedTeams = teamLeader?.managed_teams || [];
            if (teamLeader?.team && !managedTeams.includes(teamLeader.team)) {
              managedTeams.push(teamLeader.team);
            }
            
            if (managedTeams.length === 0) {
              return { data: { teamMembers: [] } };
            }
            
            // Fetch team members
            const { data, error } = await dataClient
              .from('users')
              .select('*')
              .eq('role', 'worker')
              .in('team', managedTeams)
              .order('created_at', { ascending: false });
            
            if (error) {
              throw new Error('Failed to fetch team members');
            }
            
            return { data: { teamMembers: data || [] } };
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('getTeamMembers error:', error);
          }
          return { 
            error: { 
              status: 500, 
              data: error instanceof Error ? error.message : 'Failed to fetch team members'
            } 
          };
        }
      },
      providesTags: ['User'],
    }),
    
    createTeam: builder.mutation({
      queryFn: async ({ teamName, teamLeaderId }: { teamName: string; teamLeaderId: string }) => {
        try {
          // Validate inputs
          if (!teamName || !teamName.trim()) {
            throw new Error('Team name is required');
          }
          if (!teamLeaderId || !isValidUUID(teamLeaderId)) {
            throw new Error('Invalid team leader ID');
          }

          // Get current user data
          const { data: currentUser, error: fetchError } = await dataClient
            .from('users')
            .select('managed_teams, team')
            .eq('id', teamLeaderId)
            .single();
          
          if (fetchError) {
            throw new Error('Failed to fetch user data');
          }

          // Add new team to managed teams
          const currentManagedTeams = currentUser?.managed_teams || [];
          const updatedManagedTeams = [...currentManagedTeams, teamName.trim()];

          // Update user
          const { data: userData, error: userError } = await dataClient
            .from('users')
            .update({ 
              team: teamName.trim(),
              managed_teams: updatedManagedTeams,
              updated_at: new Date().toISOString()
            })
            .eq('id', teamLeaderId)
            .select()
            .single();
          
          if (userError) {
            throw new Error('Failed to create team');
          }

          return { 
            data: { 
              team: { name: teamName.trim(), team_leader_id: teamLeaderId }, 
              user: userData 
            } 
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('createTeam error:', error);
          }
          return { 
            error: { 
              status: 500, 
              data: error instanceof Error ? error.message : 'Failed to create team'
            } 
          };
        }
      },
      invalidatesTags: ['Team', 'User'],
    }),
    
    updateUserTeam: builder.mutation({
      queryFn: async ({ userId, teamName }: { userId: string; teamName: string }) => {
        try {
          // Validate inputs
          if (!teamName || !teamName.trim()) {
            throw new Error('Team name is required');
          }
          if (!userId || !isValidUUID(userId)) {
            throw new Error('Invalid user ID');
          }

          const { data, error } = await dataClient
            .from('users')
            .update({ 
              team: teamName.trim(),
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();
          
          if (error) {
            throw new Error('Failed to update user team');
          }

          return { data: { user: data } };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('updateUserTeam error:', error);
          }
          return { 
            error: { 
              status: 500, 
              data: error instanceof Error ? error.message : 'Failed to update team'
            } 
          };
        }
      },
      invalidatesTags: ['User'],
    }),

    getUnselectedWorkers: builder.query({
      queryFn: async ({ teamLeaderId, date }: { teamLeaderId: string; date?: string }) => {
        try {
          console.log('🔍 getUnselectedWorkers called with:', { teamLeaderId, date });
          
          // Security: Validate and sanitize input
          if (!teamLeaderId || typeof teamLeaderId !== 'string' || !isValidUUID(teamLeaderId)) {
            console.warn('❌ Invalid teamLeaderId:', teamLeaderId);
            return { data: { unselectedWorkers: [] } };
          }

          // Security: Validate date format if provided
          if (date && typeof date === 'string') {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) {
              console.warn('❌ Invalid date format:', date);
              return { data: { unselectedWorkers: [] } };
            }
          }

          // Get API base URL from environment or use default
          const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
          
          // Build URL securely with proper encoding
          const params = new URLSearchParams();
          params.append('teamLeaderId', teamLeaderId);
          if (date) {
            params.append('date', date);
          }
          
          // Security: Validate API_BASE_URL
          if (!API_BASE_URL || typeof API_BASE_URL !== 'string') {
            throw new Error('Invalid API base URL configuration');
          }
          
          const url = `${API_BASE_URL}/work-readiness-assignments/unselected?${params.toString()}`;
          console.log('🔍 API URL:', url);

          // Get session token
          const { data: { session }, error: sessionError } = await dataClient.auth.getSession();
          if (sessionError || !session?.access_token) {
            throw new Error('Authentication required');
          }

          // Fetch from backend API
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status}`);
          }

          // Security: Validate response before parsing
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format');
          }

          const responseData = await response.json();
          console.log('🔍 API Response:', { status: response.status, data: responseData });
          
          // Security: Validate response structure
          if (!responseData || typeof responseData !== 'object') {
            throw new Error('Invalid response data structure');
          }

          // Backend returns { success: true, data: [...] }
          // Extract the actual workers array from data.data
          const workersArray = responseData.success && Array.isArray(responseData.data) 
            ? responseData.data 
            : [];

          if (workersArray.length > 0) {
            // Security: Validate each worker object
            const validatedWorkers = workersArray.filter((worker: any) => {
              return worker && 
                     typeof worker === 'object' && 
                     worker.worker && 
                     typeof worker.worker === 'object' &&
                     worker.worker.id &&
                     worker.worker.first_name &&
                     worker.worker.last_name;
            });

            console.log('🔍 Total unselected workers:', workersArray.length);
            console.log('🔍 Validated workers:', validatedWorkers.length);
            
            return { data: { unselectedWorkers: validatedWorkers } };
          }

          return { data: { unselectedWorkers: [] } };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('getUnselectedWorkers error:', error);
          }
          return { 
            error: { 
              status: 500, 
              data: error instanceof Error ? error.message : 'Failed to fetch unselected workers'
            } 
          };
        }
      },
      providesTags: ['User'],
    }),
  }),
});

export const {
  useGetTeamsQuery,
  useGetTeamMembersQuery,
  useCreateTeamMutation,
  useUpdateUserTeamMutation,
  useGetUnselectedWorkersQuery,
} = teamsApi;
