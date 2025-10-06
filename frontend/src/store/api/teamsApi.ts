import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { dataClient } from '../../lib/supabase';

export const teamsApi = createApi({
  reducerPath: 'teamsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '', // No fallback URL - use Supabase only
  }),
  tagTypes: ['Team', 'User'],
  // Optimize for real-time updates
  refetchOnFocus: false,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds
  endpoints: (builder) => ({
    getTeams: builder.query({
      queryFn: async (teamLeaderId: string = '') => {
        try {
          console.log('getTeams query called with teamLeaderId:', teamLeaderId);
          
          if (!teamLeaderId) {
            console.log('No teamLeaderId provided, returning empty teams');
            return { 
              data: { 
                teams: [],
                currentTeam: null,
                defaultTeam: null
              } 
            };
          }
          
          // Test Supabase connection first
          console.log('Testing Supabase connection...');
          const { data: testData, error: testError } = await dataClient
            .from('users')
            .select('id')
            .limit(1);
          
          if (testError) {
            console.error('Supabase connection test failed:', testError);
            throw testError;
          }
          
          console.log('Supabase connection test successful');
          
          // Get team leader's managed teams
          const { data: teamLeader, error: leaderError } = await dataClient
            .from('users')
            .select('managed_teams, team, default_team, role, first_name, last_name')
            .eq('id', teamLeaderId)
            .single();
          
          if (leaderError) {
            console.error('Error fetching team leader:', leaderError);
            console.error('Leader error details:', JSON.stringify(leaderError, null, 2));
            throw leaderError;
          }
          
          console.log('Team leader data:', teamLeader);
          
          // For site supervisors, they might not have managed_teams, so use their current team
          let teams = teamLeader?.managed_teams || [];
          
          // If no managed teams but has a current team, use that
          if (teams.length === 0 && teamLeader?.team) {
            teams = [teamLeader.team];
          }
          
          // If still no teams, try to get all unique teams from users table
          if (teams.length === 0) {
            console.log('No teams found, fetching all available teams...');
            const { data: allTeams, error: allTeamsError } = await dataClient
              .from('users')
              .select('team')
              .not('team', 'is', null)
              .neq('team', '');
            
            if (!allTeamsError && allTeams) {
              const uniqueTeams = Array.from(new Set(allTeams.map(t => t.team).filter(Boolean)));
              teams = uniqueTeams;
              console.log('Found available teams:', uniqueTeams);
            }
          }
          
          const result = { 
            teams: teams,
            currentTeam: teamLeader?.team || null,
            defaultTeam: teamLeader?.default_team || teamLeader?.team || null
          };
          
          console.log('getTeams result:', result);
          
          return { data: result };
        } catch (error) {
          console.error('getTeams error:', error);
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: ['Team'],
    }),
    
    getTeamMembers: builder.query({
      queryFn: async ({ teamLeaderId, teamName }: { teamLeaderId: string; teamName?: string }) => {
        try {
          console.log('getTeamMembers query called with:', { teamLeaderId, teamName });
          
          if (!teamLeaderId) {
            console.log('No teamLeaderId provided, returning empty team members');
            return { data: { teamMembers: [] } };
          }
          
          // If team name is provided, filter by that specific team
          if (teamName) {
            console.log('Filtering by team name:', teamName);
            const { data, error } = await dataClient
              .from('users')
              .select('*')
              .eq('role', 'worker')
              .eq('team', teamName)
              .order('created_at', { ascending: false });
            
            if (error) {
              console.error('Error fetching team members:', error);
              throw error;
            }
            
            console.log('Team members fetched for team', teamName, ':', data?.length || 0, 'members');
            return { data: { teamMembers: data || [] } };
          } else {
            // If no team name, get team leader's managed teams and fetch all members from those teams
            console.log('Getting team leader managed teams...');
            const { data: teamLeader, error: leaderError } = await dataClient
              .from('users')
              .select('managed_teams, team')
              .eq('id', teamLeaderId)
              .single();
            
            if (leaderError) {
              console.error('Error fetching team leader:', leaderError);
              throw leaderError;
            }
            
            console.log('Team leader managed teams:', teamLeader?.managed_teams);
            
            // Get all managed teams, including the current team
            const managedTeams = teamLeader?.managed_teams || [];
            if (teamLeader?.team && !managedTeams.includes(teamLeader.team)) {
              managedTeams.push(teamLeader.team);
            }
            
            if (managedTeams.length === 0) {
              console.log('No managed teams found for team leader');
              return { data: { teamMembers: [] } };
            }
            
            // Fetch team members from all managed teams
            const { data, error } = await dataClient
              .from('users')
              .select('*')
              .eq('role', 'worker')
              .in('team', managedTeams)
              .order('created_at', { ascending: false });
            
            if (error) {
              console.error('Error fetching team members:', error);
              throw error;
            }
            
            console.log('Team members fetched from managed teams:', data?.length || 0, 'members');
            return { data: { teamMembers: data || [] } };
          }
        } catch (error) {
          console.error('getTeamMembers error:', error);
          return { error: { status: 500, data: error } };
        }
      },
      providesTags: ['User'],
    }),
    
    createTeam: builder.mutation({
      queryFn: async ({ teamName, teamLeaderId }: { teamName: string; teamLeaderId: string }) => {
        try {
          // Get current user data to update managed_teams array
          const { data: currentUser, error: fetchError } = await dataClient
            .from('users')
            .select('managed_teams, team')
            .eq('id', teamLeaderId)
            .single();
          
          if (fetchError) throw fetchError;

          // Add new team to existing managed teams array
          const currentManagedTeams = currentUser?.managed_teams || [];
          const updatedManagedTeams = [...currentManagedTeams, teamName];

          // Update the team leader's current team and managed teams
          const { data: userData, error: userError } = await dataClient
            .from('users')
            .update({ 
              team: teamName,
              managed_teams: updatedManagedTeams,
              updated_at: new Date().toISOString()
            })
            .eq('id', teamLeaderId)
            .select()
            .single();
          
          if (userError) throw userError;

          return { 
            data: { 
              team: { name: teamName, team_leader_id: teamLeaderId }, 
              user: userData 
            } 
          };
        } catch (error) {
          return { error: { status: 500, data: error } };
        }
      },
      invalidatesTags: ['Team', 'User'],
    }),
    
    updateUserTeam: builder.mutation({
      queryFn: async ({ userId, teamName }: { userId: string; teamName: string }) => {
        try {
          const { data, error } = await dataClient
            .from('users')
            .update({ 
              team: teamName,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();
          
          if (error) throw error;
          return { data: { user: data } };
        } catch (error) {
          return { error: { status: 500, data: error } };
        }
      },
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetTeamsQuery,
  useGetTeamMembersQuery,
  useCreateTeamMutation,
  useUpdateUserTeamMutation,
} = teamsApi;
