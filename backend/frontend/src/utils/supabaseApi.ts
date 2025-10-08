import { dataClient, authClient } from '../lib/supabase';

// Response cache for performance optimization
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Supabase-based API helper to replace old backend API calls
export class SupabaseAPI {
  
  // Helper method to get/set cache
  static getCachedData(cacheKey: string) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }
  
  static setCachedData(cacheKey: string, data: any) {
    responseCache.set(cacheKey, { data, timestamp: Date.now() });
  }
  
  // Clear cache by pattern or all
  static clearCache(pattern?: string) {
    if (pattern) {
      // Clear specific cache entries matching pattern
      const keys = Array.from(responseCache.keys());
      keys.forEach(key => {
        if (key.includes(pattern)) {
          responseCache.delete(key);
        }
      });
    } else {
      // Clear all cache
      responseCache.clear();
    }
  }
  
  // Cases API
  static async getCases() {
    const { data, error } = await dataClient
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { cases: data || [] };
  }

  static async getCaseById(id: string) {
    const { data, error } = await dataClient
      .from('cases')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { case: data };
  }

  static async createCase(caseData: any) {
    const { data, error } = await dataClient
      .from('cases')
      .insert(caseData)
      .select()
      .single();
    
    if (error) throw error;
    return { case: data };
  }

  static async updateCase(id: string, updates: any) {
    const { data, error } = await dataClient
      .from('cases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return { case: data };
  }

  // Incidents API
  static async getIncidents() {
    const { data, error } = await dataClient
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { incidents: data || [] };
  }

  static async getIncidentById(id: string) {
    const { data, error } = await dataClient
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { incident: data };
  }

  static async createIncident(incidentData: any) {
    const { data, error } = await dataClient
      .from('incidents')
      .insert(incidentData)
      .select()
      .single();
    
    if (error) throw error;
    return { incident: data };
  }

  // Check-ins API
  static async getCheckIns() {
    const { data, error } = await dataClient
      .from('check_ins')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { checkIns: data || [] };
  }

  static async getCheckInsByWorker(workerId: string) {
    const { data, error } = await dataClient
      .from('check_ins')
      .select('*')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { checkIns: data || [] };
  }

  static async createCheckIn(checkInData: any) {
    const { data, error } = await dataClient
      .from('check_ins')
      .insert(checkInData)
      .select()
      .single();
    
    if (error) throw error;
    return { checkIn: data };
  }

  // Users API
  static async getUsers() {
    const { data, error } = await dataClient
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { users: data || [] };
  }

  static async getUsersByRole(role: string) {
    const { data, error } = await dataClient
      .from('users')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { users: data || [] };
  }

  static async getUserById(id: string) {
    const { data, error } = await dataClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { user: data };
  }

  // Appointments API
  static async getAppointments() {
    const { data, error } = await dataClient
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true });
    
    if (error) throw error;
    return { appointments: data || [] };
  }

  static async getAppointmentsByUser(userId: string) {
    const { data, error } = await dataClient
      .from('appointments')
      .select('*')
      .or(`clinician_id.eq.${userId},worker_id.eq.${userId}`)
      .order('appointment_date', { ascending: true });
    
    if (error) throw error;
    return { appointments: data || [] };
  }

  static async createAppointment(appointmentData: any) {
    const { data, error } = await dataClient
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();
    
    if (error) throw error;
    return { appointment: data };
  }

  // Notifications API
  static async getNotifications() {
    const { data, error } = await dataClient
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { notifications: data || [] };
  }

  static async getNotificationsByUser(userId: string) {
    const { data, error } = await dataClient
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { notifications: data || [] };
  }

  static async createNotification(notificationData: any) {
    const { data, error } = await dataClient
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();
    
    if (error) throw error;
    return { notification: data };
  }

  // Dashboard Stats API
  static async getDashboardStats() {
    try {
      // Get basic counts
      const [casesResult, incidentsResult, usersResult, appointmentsResult] = await Promise.all([
        dataClient.from('cases').select('id', { count: 'exact' }),
        dataClient.from('incidents').select('id', { count: 'exact' }),
        dataClient.from('users').select('id', { count: 'exact' }),
        dataClient.from('appointments').select('id', { count: 'exact' })
      ]);

      return {
        totalCases: casesResult.count || 0,
        totalIncidents: incidentsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalAppointments: appointmentsResult.count || 0,
        activeCases: 0, // Would need more complex query
        recentIncidents: 0, // Would need more complex query
        upcomingAppointments: 0, // Would need more complex query
        complianceRate: 85 // Mock data
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }



  // Rehabilitation Plans API
  static async getRehabilitationPlans() {
    const { data, error } = await dataClient
      .from('rehabilitation_plans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { rehabilitationPlans: data || [] };
  }

  static async getRehabilitationPlansByWorker(workerId: string) {
    const { data, error } = await dataClient
      .from('rehabilitation_plans')
      .select('*')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { rehabilitationPlans: data || [] };
  }

  static async createRehabilitationPlan(planData: any) {
    const { data, error } = await dataClient
      .from('rehabilitation_plans')
      .insert(planData)
      .select()
      .single();
    
    if (error) throw error;
    return { rehabilitationPlan: data };
  }

  // Preventive Tasks API
  static async getPreventiveTasks() {
    const { data, error } = await dataClient
      .from('preventive_tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { tasks: data || [] };
  }

  static async getPreventiveTasksByWorker(workerId: string) {
    const { data, error } = await dataClient
      .from('preventive_tasks')
      .select('*')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { tasks: data || [] };
  }

  static async createPreventiveTask(taskData: any) {
    const { data, error } = await dataClient
      .from('preventive_tasks')
      .insert(taskData)
      .select()
      .single();
    
    if (error) throw error;
    return { task: data };
  }

  // Team Management API
  static async createTeam(teamName: string, teamLeaderId: string) {
    try {
      console.log('Creating team:', { teamName, teamLeaderId });
      
      // Get current user data to update managed_teams array
      const { data: currentUser, error: fetchError } = await dataClient
        .from('users')
        .select('managed_teams, team')
        .eq('id', teamLeaderId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current user:', fetchError);
        throw fetchError;
      }

      console.log('Current user data:', currentUser);

      // Add new team to existing managed teams array
      const currentManagedTeams = currentUser?.managed_teams || [];
      const updatedManagedTeams = [...currentManagedTeams, teamName];

      console.log('Updated managed teams:', updatedManagedTeams);

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
      
      if (userError) {
        console.error('Error updating user:', userError);
        throw userError;
      }

      console.log('Team created successfully:', userData);

      return { 
        team: { name: teamName, team_leader_id: teamLeaderId }, 
        user: userData 
      };
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  static async getTeamData(teamLeaderId: string) {
    try {
      console.log('Fetching team data for user:', teamLeaderId);
      
      // Get user's current team and managed teams
      const { data: userData, error: userError } = await dataClient
        .from('users')
        .select('team, managed_teams, default_team')
        .eq('id', teamLeaderId)
        .single();
      
      if (userError) {
        console.error('Error fetching team data:', userError);
        throw userError;
      }

      console.log('Team data fetched:', userData);

      return {
        currentTeam: userData?.team || null,
        defaultTeam: userData?.default_team || userData?.team || null,
        managedTeams: userData?.managed_teams || []
      };
    } catch (error) {
      console.error('Error fetching team data:', error);
      throw error;
    }
  }

  static async updateUserTeam(userId: string, teamName: string) {
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
      return { user: data };
    } catch (error) {
      console.error('Error updating user team:', error);
      throw error;
    }
  }

  // Get team members for a team leader
  static async getTeamMembers(teamLeaderId: string, teamName?: string) {
    try {
      console.log('Fetching team members for team leader:', teamLeaderId, 'team:', teamName);
      
      // If team name is provided, filter by that specific team
      if (teamName) {
        const { data, error } = await dataClient
          .from('users')
          .select('*')
          .eq('role', 'worker')
          .eq('team', teamName)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('Team members fetched for team', teamName, ':', data);
        return { teamMembers: data || [] };
      } else {
        // If no team name, get team leader's managed teams and fetch all members from those teams
        const { data: teamLeader, error: leaderError } = await dataClient
          .from('users')
          .select('managed_teams, team')
          .eq('id', teamLeaderId)
          .single();
        
        if (leaderError) throw leaderError;
        
        console.log('Team leader managed teams:', teamLeader?.managed_teams);
        
        // Get all managed teams, including the current team
        const managedTeams = teamLeader?.managed_teams || [];
        if (teamLeader?.team && !managedTeams.includes(teamLeader.team)) {
          managedTeams.push(teamLeader.team);
        }
        
        if (managedTeams.length === 0) {
          console.log('No managed teams found for team leader');
          return { teamMembers: [] };
        }
        
        // Fetch team members from all managed teams
        const { data, error } = await dataClient
          .from('users')
          .select('*')
          .eq('role', 'worker')
          .in('team', managedTeams)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('Team members fetched from managed teams:', data);
        return { teamMembers: data || [] };
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  }

  // Get analytics data for team leader
  static async getAnalyticsData(teamLeaderId: string) {
    try {
      console.log('Fetching analytics data for team leader:', teamLeaderId);
      
      // Get team leader info
      const { data: teamLeader, error: leaderError } = await dataClient
        .from('users')
        .select('*')
        .eq('id', teamLeaderId)
        .single();
      
      if (leaderError) throw leaderError;
      
      // Get team members from all managed teams
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
      
      // Get work readiness data from Supabase for team members
      const teamMemberIds = teamMembers?.map(m => m.id) || [];
      let workReadinessData: any[] = [];
      
      console.log('Team members found:', teamMembers.length);
      console.log('Team member IDs:', teamMemberIds);
      
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
          console.log('Work readiness data found:', workReadinessData.length, 'submissions');
          workReadinessData.forEach((submission, index) => {
            console.log(`  ${index + 1}. Worker: ${submission.worker_id}, Status: ${submission.readiness_level}, Date: ${submission.submitted_at}`);
          });
        }
      }

      // Get today's submissions with proper date filtering
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      const todaySubmissions = workReadinessData.filter(w => {
        if (!w.submitted_at) return false;
        const submissionDate = new Date(w.submitted_at);
        return submissionDate >= todayStart && submissionDate <= todayEnd;
      });
      
      console.log('Today\'s date range:', todayStart.toISOString(), 'to', todayEnd.toISOString());
      console.log('Today\'s submissions:', todaySubmissions.length);
      todaySubmissions.forEach((submission, index) => {
        console.log(`  ${index + 1}. Worker: ${submission.worker_id}, Status: ${submission.readiness_level}, Time: ${submission.submitted_at}`);
      });

      const total = teamMembers?.length || 0;
      const completed = todaySubmissions.length;
      const pending = 0; // Workers who haven't submitted today
      const notStarted = total - completed;

      const workReadinessStats = {
        total: teamMembers?.length || 0,
        completed,
        pending,
        notStarted,
        completedPercentage: teamMembers?.length > 0 ? Math.round((completed / teamMembers.length) * 100) : 0,
        pendingPercentage: teamMembers?.length > 0 ? Math.round((pending / teamMembers.length) * 100) : 0,
        notStartedPercentage: teamMembers?.length > 0 ? Math.round((notStarted / teamMembers.length) * 100) : 0,
        byStatus: [
          { status: 'Completed', count: completed, color: '#22c55e' },
          { status: 'Pending', count: pending, color: '#f59e0b' },
          { status: 'Not Started', count: notStarted, color: '#6b7280' }
        ],
        monthlyAssessments: []
      };
      
      // Get recent login activity for team members
      const memberIds = teamMembers?.map(member => member.id) || [];
      let loginActivity: any[] = [];
      
      if (memberIds.length > 0) {
        const { data: authLogs, error: authError } = await dataClient
          .from('authentication_logs')
          .select('user_id, created_at')
          .eq('action', 'login')
          .eq('success', true)
          .in('user_id', memberIds)
          .order('created_at', { ascending: false });
        
        if (!authError && authLogs) {
          loginActivity = authLogs;
        }
      }
      
      // Group login activity by user
      const userLastLogins: { [key: string]: string } = {};
      const userTodayLogins: { [key: string]: boolean } = {};
      
      loginActivity.forEach(log => {
        const userId = log.user_id;
        if (!userLastLogins[userId]) {
          userLastLogins[userId] = log.created_at;
        }
        
        // Check if logged in today
        const logDate = new Date(log.created_at);
        const todayDate = new Date();
        const isToday = logDate.toDateString() === todayDate.toDateString();
        if (isToday) {
          userTodayLogins[userId] = true;
        }
      });

      // Calculate login statistics from authentication logs
      const todayDate = new Date();
      const weekAgo = new Date(todayDate);
      weekAgo.setDate(todayDate.getDate() - 7);
      const monthAgo = new Date(todayDate);
      monthAgo.setMonth(todayDate.getMonth() - 1);
      
      const todayLogins = loginActivity.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === todayDate.toDateString();
      }).length;
      
      const weeklyLogins = loginActivity.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= weekAgo;
      }).length;
      
      const monthlyLogins = loginActivity.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= monthAgo;
      }).length;
      
      // Calculate daily breakdown for the last 7 days
      const dailyBreakdown = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(todayDate);
        date.setDate(todayDate.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayLogins = loginActivity.filter(log => {
          const logDate = new Date(log.created_at).toISOString().split('T')[0];
          return logDate === dateStr;
        }).length;
        
        dailyBreakdown.push({
          date: dateStr,
          count: dayLogins
        });
      }

      const loginStats = {
        totalLogins: loginActivity.length,
        todayLogins: todayLogins,
        weeklyLogins: weeklyLogins,
        monthlyLogins: monthlyLogins,
        dailyBreakdown: dailyBreakdown
      };

      // Calculate team performance with work readiness data
      const teamPerformance = (teamMembers || []).map(member => {
        // Find today's work readiness data for this member
        const todayMemberWorkReadiness = todaySubmissions.find(w => w.worker_id === member.id);
        // Find all work readiness data for this member
        const allMemberWorkReadiness = workReadinessData.filter(w => w.worker_id === member.id);
        
        // Get last login from authentication logs
        const lastLoginDate = userLastLogins[member.id];
        const loggedInToday = userTodayLogins[member.id] || false;
        
        // Safely format last login date
        let formattedLastLogin = 'Never';
        if (lastLoginDate) {
          try {
            const loginDate = new Date(lastLoginDate);
            if (!isNaN(loginDate.getTime())) {
              formattedLastLogin = loginDate.toLocaleDateString();
            }
          } catch (error) {
            console.warn('Invalid login date for user:', member.email, lastLoginDate);
            formattedLastLogin = 'Never';
          }
        }

        // Safely format last assessment date
        let formattedLastAssessment = 'Never';
        if (allMemberWorkReadiness.length > 0) {
          try {
            const assessmentDate = new Date(allMemberWorkReadiness[0].submitted_at);
            if (!isNaN(assessmentDate.getTime())) {
              formattedLastAssessment = assessmentDate.toLocaleDateString();
            }
          } catch (error) {
            console.warn('Invalid assessment date for user:', member.email, allMemberWorkReadiness[0].submitted_at);
            formattedLastAssessment = 'Never';
          }
        }

        return {
          memberName: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
          email: member.email,
          role: member.role,
          team: member.team,
          lastLogin: formattedLastLogin,
          isActive: member.is_active || false,
          workReadinessStatus: todayMemberWorkReadiness ? 'Completed' : 'Not Started',
          activityLevel: allMemberWorkReadiness.length,
          loggedInToday: loggedInToday,
          recentCheckIns: 0, // Will be implemented when check-in tracking is available
          recentAssessments: allMemberWorkReadiness.length,
          completedAssessments: allMemberWorkReadiness.filter(w => w.status === 'submitted').length,
          lastAssessment: formattedLastAssessment,
          fatigueLevel: todayMemberWorkReadiness?.fatigue_level || null,
          readinessLevel: todayMemberWorkReadiness?.readiness_level || null,
          mood: todayMemberWorkReadiness?.mood || null
        };
      });
      
      const analyticsData = {
        teamLeader: {
          id: teamLeader.id,
          firstName: teamLeader.first_name,
          lastName: teamLeader.last_name,
          email: teamLeader.email,
          team: teamLeader.team,
          managedTeams: teamLeader.managed_teams || []
        },
        analytics: {
          totalTeamMembers: teamMembers?.length || 0,
          activeTeamMembers: teamMembers?.filter(m => m.is_active).length || 0,
          workReadinessStats,
          todayWorkReadinessStats: {
            completed: completed,
            total: total
          },
          loginStats,
          teamPerformance,
          readinessTrendData: [], // Will be implemented for trend analysis
          complianceRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          activityRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          safetyMetrics: {
            highFatigueCount: todaySubmissions.filter(w => w.fatigue_level >= 4).length,
            notFitForWorkCount: todaySubmissions.filter(w => w.readiness_level === 'not_fit').length,
            painReportedCount: todaySubmissions.filter(w => w.pain_discomfort === 'yes').length,
            poorMoodCount: todaySubmissions.filter(w => w.mood === 'poor' || w.mood === 'terrible').length
          }
        }
      };
      
      console.log('Analytics data fetched:', analyticsData);
      return analyticsData;
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }
  }

  // Get work readiness stats with date filtering
  static async getWorkReadinessStats(teamLeaderId: string, dateRange: string, startDate?: Date, endDate?: Date) {
    try {
      console.log('🔄 Fetching work readiness stats for team leader:', teamLeaderId);
      console.log('📅 Filter parameters:', { 
        dateRange, 
        startDate: startDate?.toISOString(), 
        endDate: endDate?.toISOString() 
      });
      
      // Get team leader info
      const { data: teamLeader, error: leaderError } = await dataClient
        .from('users')
        .select('*')
        .eq('id', teamLeaderId)
        .single();
      
      if (leaderError) throw leaderError;
      
      // Get team members from all managed teams
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
      
      // Calculate date range
      let start, end;
      const now = new Date();
      
      switch (dateRange) {
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'month':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'year':
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'custom':
          if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
          } else {
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            end = now;
          }
          break;
        default:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
      }
      
      // Get work readiness data for the date range
      const teamMemberIds = teamMembers?.map(m => m.id) || [];
      let workReadinessData: any[] = [];
      
      if (teamMemberIds.length > 0) {
        const { data: wrData, error: workReadinessError } = await dataClient
          .from('work_readiness')
          .select('*')
          .in('worker_id', teamMemberIds)
          .gte('submitted_at', start.toISOString())
          .lte('submitted_at', end.toISOString())
          .order('submitted_at', { ascending: false });

        if (workReadinessError) {
          console.error('Error fetching work readiness data:', workReadinessError);
        } else {
          workReadinessData = wrData || [];
        }
      }
      
      // Calculate stats
      const total = teamMembers?.length || 0;
      const completed = workReadinessData.length;
      const pending = 0; // Workers who haven't submitted in the date range
      const notStarted = total - completed;

      const workReadinessStats = {
        total: teamMembers?.length || 0,
        completed,
        pending,
        notStarted,
        completedPercentage: teamMembers?.length > 0 ? Math.round((completed / teamMembers.length) * 100) : 0,
        pendingPercentage: teamMembers?.length > 0 ? Math.round((pending / teamMembers.length) * 100) : 0,
        notStartedPercentage: teamMembers?.length > 0 ? Math.round((notStarted / teamMembers.length) * 100) : 0,
        byStatus: [
          { status: 'Completed', count: completed, color: '#22c55e' },
          { status: 'Pending', count: pending, color: '#f59e0b' },
          { status: 'Not Started', count: notStarted, color: '#ef4444' }
        ],
        monthlyAssessments: [] // Could be implemented for monthly breakdown
      };

      return {
        teamLeader: {
          id: teamLeader.id,
          firstName: teamLeader.first_name,
          lastName: teamLeader.last_name,
          email: teamLeader.email,
          team: teamLeader.team,
          managedTeams: teamLeader.managed_teams || []
        },
        analytics: {
          workReadinessStats
        }
      };
    } catch (error) {
      console.error('Error fetching work readiness stats:', error);
      throw error;
    }
  }

  // Get login stats with date filtering
  static async getLoginStats(teamLeaderId: string, dateRange: string, startDate?: Date, endDate?: Date) {
    try {
      console.log('🔄 Fetching login stats for team leader:', teamLeaderId);
      console.log('📅 Filter parameters:', { 
        dateRange, 
        startDate: startDate?.toISOString(), 
        endDate: endDate?.toISOString() 
      });
      
      // Get team leader info
      const { data: teamLeader, error: leaderError } = await dataClient
        .from('users')
        .select('*')
        .eq('id', teamLeaderId)
        .single();
      
      if (leaderError) throw leaderError;
      
      // Get team members from all managed teams
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
      
      // Calculate date range
      let start, end;
      const now = new Date();
      
      switch (dateRange) {
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'month':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'year':
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'custom':
          if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
          } else {
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            end = now;
          }
          break;
        default:
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
      }
      
      // Get login activity data for the date range
      const teamMemberIds = teamMembers?.map(m => m.id) || [];
      let loginActivity: any[] = [];
      
      if (teamMemberIds.length > 0) {
        const { data: loginData, error: loginError } = await dataClient
          .from('authentication_logs')
          .select('*')
          .in('user_id', teamMemberIds)
          .eq('action', 'login')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false });

        if (loginError) {
          console.error('Error fetching login data:', loginError);
        } else {
          loginActivity = loginData || [];
        }
      }
      
      // Calculate stats
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const todayLogins = loginActivity.filter(login => {
        const loginDate = new Date(login.created_at);
        return loginDate >= todayStart && loginDate <= todayEnd;
      }).length;
      
      const weeklyLogins = loginActivity.filter(login => {
        const loginDate = new Date(login.created_at);
        return loginDate >= weekStart;
      }).length;
      
      const monthlyLogins = loginActivity.filter(login => {
        const loginDate = new Date(login.created_at);
        return loginDate >= monthStart;
      }).length;
      
      // Generate daily breakdown for the selected range
      const dailyBreakdown = [];
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999);
        
        const dayLogins = loginActivity.filter(login => {
          const loginDate = new Date(login.created_at);
          return loginDate >= dayStart && loginDate <= dayEnd;
        }).length;
        
        dailyBreakdown.push({
          date: dateStr,
          count: dayLogins
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const loginStats = {
        totalLogins: loginActivity.length,
        todayLogins: todayLogins,
        weeklyLogins: weeklyLogins,
        monthlyLogins: monthlyLogins,
        dailyBreakdown: dailyBreakdown
      };

      return {
        teamLeader: {
          id: teamLeader.id,
          firstName: teamLeader.first_name,
          lastName: teamLeader.last_name,
          email: teamLeader.email,
          team: teamLeader.team,
          managedTeams: teamLeader.managed_teams || []
        },
        analytics: {
          loginStats
        }
      };
    } catch (error) {
      console.error('Error fetching login stats:', error);
      throw error;
    }
  }

  // Get work readiness trend data for charts (with caching)
  static async getWorkReadinessTrendData(teamLeaderId: string, dateRange: string, startDate?: Date, endDate?: Date, forceRefresh = false) {
    try {
      // Create cache key
      const cacheKey = `work-readiness-trend-${teamLeaderId}-${dateRange}-${startDate?.toISOString()}-${endDate?.toISOString()}`;
      
      // Clear all work readiness trend caches if force refresh
      if (forceRefresh) {
        console.log('🗑️ Clearing work readiness trend cache...');
        SupabaseAPI.clearCache('work-readiness-trend');
      }
      
      // Check cache first (only if not forcing refresh)
      if (!forceRefresh) {
        const cachedData = SupabaseAPI.getCachedData(cacheKey);
        if (cachedData) {
          console.log('📊 Using cached work readiness trend data for:', dateRange);
          return cachedData;
        }
      }
      
      console.log('🔄 Fetching work readiness trend data for team leader:', teamLeaderId);
      console.log('📅 Filter parameters:', { 
        dateRange, 
        startDate: startDate?.toISOString(), 
        endDate: endDate?.toISOString() 
      });
      
      // Get team leader info
      const { data: teamLeader, error: leaderError } = await dataClient
        .from('users')
        .select('*')
        .eq('id', teamLeaderId)
        .single();
      
      if (leaderError) throw leaderError;
      
      // Get team members from all managed teams
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
      
      // Calculate date range
      let start, end;
      const now = new Date();
      
      switch (dateRange) {
        case 'week':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'month':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'year':
          start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'custom':
          if (startDate && endDate) {
            // Use the provided custom dates directly, but normalize to start/end of day
            start = new Date(startDate);
            end = new Date(endDate);
            
            // Ensure start is at beginning of day and end is at end of day
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            
            // Add 1 day to end date to ensure the selected end date is included
            end.setDate(end.getDate() + 1);
            
            console.log('📅 Custom range processing:', {
              startDate: startDate?.toISOString(),
              endDate: endDate?.toISOString(),
              calculatedStart: start.toISOString(),
              calculatedEnd: end.toISOString(),
              note: 'Added +1 day to end date to include selected date'
            });
          } else {
            // Fallback to default range if custom dates not provided
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            end = now;
            console.log('📅 Custom range fallback to default:', {
              calculatedStart: start.toISOString(),
              calculatedEnd: end.toISOString()
            });
          }
          break;
        default:
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
      }
      
      console.log('📅 Calculated date range:', { 
        start: start.toISOString(), 
        end: end.toISOString(),
        dateRange,
        daysDiff: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        startDateLocal: start.toLocaleDateString(),
        endDateLocal: end.toLocaleDateString()
      });
      
      // Get work readiness data for team members within date range
      const teamMemberIds = teamMembers?.map(m => m.id) || [];
      let workReadinessData: any[] = [];
      
      console.log('📊 Team members found:', teamMembers?.length || 0);
      console.log('📊 Team member IDs:', teamMemberIds);
      console.log('📊 Team member details:', teamMembers?.map(m => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        email: m.email
      })));
      
      if (teamMemberIds.length > 0) {
        console.log('📊 Querying work_readiness table with:', {
          worker_ids: teamMemberIds,
          start_date: start.toISOString(),
          end_date: end.toISOString()
        });
        
        // Optimized query - only select necessary columns for better performance
        const { data: wrData, error: workReadinessError } = await dataClient
          .from('work_readiness')
          .select('submitted_at, readiness_level')
          .in('worker_id', teamMemberIds)
          .gte('submitted_at', start.toISOString())
          .lte('submitted_at', end.toISOString())
          .order('submitted_at', { ascending: true });

        if (workReadinessError) {
          console.error('Error fetching work readiness trend data:', workReadinessError);
        } else {
          workReadinessData = wrData || [];
          console.log('📊 Raw query result:', wrData?.length || 0, 'records');
        }
      } else {
        console.log('📊 No team members found - trying to fetch all work readiness data');
        
        // Fallback: fetch all work readiness data if no team members found (optimized)
        const { data: allWrData, error: allWrError } = await dataClient
          .from('work_readiness')
          .select('submitted_at, readiness_level')
          .gte('submitted_at', start.toISOString())
          .lte('submitted_at', end.toISOString())
          .order('submitted_at', { ascending: true });

        if (allWrError) {
          console.error('Error fetching all work readiness data:', allWrError);
        } else {
          workReadinessData = allWrData || [];
          console.log('📊 Fallback query result:', allWrData?.length || 0, 'records');
        }
      }
      
      console.log('📊 Work readiness data for trend:', workReadinessData.length, 'submissions');
      console.log('📊 Sample data:', workReadinessData.slice(0, 3).map(item => ({
        date: item.submitted_at,
        readiness_level: item.readiness_level,
        worker_id: item.worker_id
      })));
      
      // Show unique dates in the filtered data
      const uniqueDates = Array.from(new Set(workReadinessData.map(item => item.submitted_at.split('T')[0]))).sort();
      console.log('📊 Unique dates in filtered data:', uniqueDates);
      console.log('📊 Date range query details:', {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        teamMemberIds: teamMemberIds.length,
        queryResult: workReadinessData.length,
        uniqueDatesCount: uniqueDates.length,
        dateRange: dateRange
      });
      
      // Optimized: Group data by date and count readiness levels efficiently
      const dateGroups: { [key: string]: { not_fit: number, minor: number, fit: number } } = {};
      
      workReadinessData.forEach(submission => {
        const date = submission.submitted_at.split('T')[0]; // Get YYYY-MM-DD
        if (!dateGroups[date]) {
          dateGroups[date] = { not_fit: 0, minor: 0, fit: 0 };
        }
        // Increment count based on readiness level
        if (submission.readiness_level === 'not_fit') {
          dateGroups[date].not_fit++;
        } else if (submission.readiness_level === 'minor') {
          dateGroups[date].minor++;
        } else if (submission.readiness_level === 'fit') {
          dateGroups[date].fit++;
        }
      });
      
      // Get only dates that have actual data, sorted chronologically
      const datesWithData = Object.keys(dateGroups).sort();
      
      console.log('📊 Dates with actual submissions:', datesWithData.length, 'dates');
      console.log('📊 Total submissions:', workReadinessData.length);
      console.log('📊 Date groups with actual data:', dateGroups);
      
      // Generate trend data ONLY for dates with actual submissions
      const readinessTrendData = datesWithData.map(date => {
        const dayData = dateGroups[date];
        
        return {
          date,
          notFitForWork: dayData.not_fit,
          minorConcernsFitForWork: dayData.minor,
          fitForWork: dayData.fit,
          total: dayData.not_fit + dayData.minor + dayData.fit
        };
      });
      
      console.log('📊 Generated trend data (dates with submissions only):', readinessTrendData.length, 'dates');
      console.log('📊 Total submissions across all dates:', workReadinessData.length);
      console.log('📊 Trend data details:', readinessTrendData.map(item => ({
        date: item.date,
        notFit: item.notFitForWork,
        minor: item.minorConcernsFitForWork,
        fit: item.fitForWork,
        total: item.total
      })));
      
      // Validate that the filtered data matches the expected time period
      if (readinessTrendData.length > 0) {
        const firstDataDate = new Date(readinessTrendData[0].date);
        const lastDataDate = new Date(readinessTrendData[readinessTrendData.length - 1].date);
        const dataDaysDiff = Math.ceil((lastDataDate.getTime() - firstDataDate.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log('📅 Data validation:', {
          requestedRange: dateRange,
          requestedDays: dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 365,
          datesWithData: readinessTrendData.length,
          totalSubmissions: workReadinessData.length,
          firstSubmissionDate: readinessTrendData[0].date,
          lastSubmissionDate: readinessTrendData[readinessTrendData.length - 1].date,
          dataSpanDays: dataDaysDiff,
          isWithinRange: firstDataDate >= start && lastDataDate <= end,
          validationPassed: readinessTrendData.length > 0 && firstDataDate >= start && lastDataDate <= end,
          note: 'Chart shows ONLY dates with actual submissions (no empty dates)'
        });
      }
      
      const result = {
        analytics: {
          readinessTrendData
        }
      };
      
      // Cache the result
      SupabaseAPI.setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error fetching work readiness trend data:', error);
      throw error;
    }
  }

  // Check if email already exists
  static async checkEmailExists(email: string) {
    try {
      console.log('Checking if email exists:', email);
      
      const { data, error } = await dataClient
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return !!data; // Return true if email exists, false if not
    } catch (error) {
      console.error('Error checking email:', error);
      throw error;
    }
  }

  // Work Readiness API

  static async getTodayWorkReadiness(workerId: string) {
    try {
      console.log('Checking today\'s work readiness for worker:', workerId);
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const { data, error } = await dataClient
        .from('work_readiness')
        .select('*')
        .eq('worker_id', workerId)
        .gte('submitted_at', `${today}T00:00:00.000Z`)
        .lte('submitted_at', `${today}T23:59:59.999Z`)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return { workReadiness: data || null };
    } catch (error) {
      console.error('Error checking today\'s work readiness:', error);
      throw error;
    }
  }

  static async createWorkReadiness(workReadinessData: any) {
    try {
      console.log('Creating work readiness:', workReadinessData);
      
      const { data, error } = await dataClient
        .from('work_readiness')
        .insert([workReadinessData])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('Work readiness created successfully:', data);
      return { workReadiness: data };
    } catch (error) {
      console.error('Error creating work readiness:', error);
      throw error;
    }
  }

  static async getWorkReadinessByTeamLeader(teamLeaderId: string, teamName?: string) {
    try {
      console.log('Fetching work readiness for team leader:', teamLeaderId, 'team:', teamName);
      
      let query = dataClient
        .from('work_readiness')
        .select(`
          *,
          worker:users!work_readiness_worker_id_fkey(*)
        `)
        .eq('team_leader_id', teamLeaderId)
        .order('submitted_at', { ascending: false });

      // If team name is provided, filter by team
      if (teamName) {
        query = query.eq('team', teamName);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return { workReadiness: data || [] };
    } catch (error) {
      console.error('Error fetching work readiness for team leader:', error);
      throw error;
    }
  }

  static async getWorkReadinessByWorker(workerId: string, date?: string) {
    try {
      console.log('Fetching work readiness for worker:', workerId, 'date:', date);
      
      let query = dataClient
        .from('work_readiness')
        .select('*')
        .eq('worker_id', workerId)
        .order('submitted_at', { ascending: false });
      
      if (date) {
        // Filter by specific date (YYYY-MM-DD format)
        query = query.gte('submitted_at', `${date}T00:00:00`)
                    .lte('submitted_at', `${date}T23:59:59`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('Work readiness fetched successfully:', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching work readiness:', error);
      throw error;
    }
  }

  // Create new user
  static async createUser(userData: any) {
    try {
      console.log('Creating new user:', userData);
      
      // Check if email already exists
      const emailExists = await this.checkEmailExists(userData.email);
      if (emailExists) {
        throw new Error('Email already registered. Please use a different email address.');
      }
      
      // Use service role key to create user in Supabase Auth
      console.log('Creating Supabase Auth user with service role...');
      
      // Create user using admin API with service role
      const response = await fetch('https://dtcgzgbxhefwhqpeotrl.supabase.co/auth/v1/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          email_confirm: true, // Auto-confirm email
          app_metadata: {
            provider: 'email',
            providers: ['email']
          },
          user_metadata: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: 'worker'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Auth user creation error:', errorData);
        
        if (errorData.msg && errorData.msg.includes('already registered')) {
          throw new Error('Email already registered. Please use a different email address.');
        }
        throw new Error(errorData.msg || 'Failed to create authentication user');
      }

      const authData = await response.json();
      console.log('Supabase Auth user created:', authData.id);
      
      // Simple hash that fits in VARCHAR(20) - using first 20 chars of SHA-256
      const hashPassword = async (password: string) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 20); // Take first 20 characters
      };

      // Hash the password to fit VARCHAR(20)
      const passwordHash = await hashPassword(userData.password);

      // Create user profile in users table
      const profileData = {
        id: authData.id,
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        password_hash: passwordHash,
        role: 'worker',
        phone: userData.phone || null,
        team: userData.team || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating user profile:', profileData);

      // Create user profile in Supabase
      const { data, error } = await dataClient
        .from('users')
        .insert(profileData)
        .select()
        .single();
      
      if (error) {
        console.error('Profile creation error:', error);
        // Handle specific database errors
        if (error.code === '23505' && error.message.includes('users_email_key')) {
          throw new Error('Email already registered. Please use a different email address.');
        }
        throw error;
      }
      
      console.log('User created successfully:', data);
      return { user: data };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Authentication Logging API
  static async logLoginActivity(userId: string, userEmail: string, userName: string, userRole: string, ipAddress: string, userAgent: string) {
    try {
      console.log('📝 Logging login activity to Supabase:', { userEmail, userRole });
      
      const logData = {
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        user_role: userRole,
        action: 'login',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true,
        device_info: {
          userAgent: userAgent,
          timestamp: new Date().toISOString()
        }
      };

      const { data, error } = await dataClient
        .from('authentication_logs')
        .insert([logData])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Login activity logged successfully:', data.id);
      return data;
    } catch (error) {
      console.error('Error logging login activity:', error);
      throw error;
    }
  }

  static async getTeamMemberLoginActivity(teamLeaderId: string, days: number = 7) {
    try {
      console.log('📊 Fetching team member login activity for team leader:', teamLeaderId);
      
      // Get team leader's managed teams
      const { data: teamLeader, error: leaderError } = await dataClient
        .from('users')
        .select('managed_teams, team')
        .eq('id', teamLeaderId)
        .single();
      
      if (leaderError) throw leaderError;
      
      const managedTeams = teamLeader?.managed_teams || [];
      if (teamLeader?.team && !managedTeams.includes(teamLeader.team)) {
        managedTeams.push(teamLeader.team);
      }
      
      if (managedTeams.length === 0) {
        return [];
      }
      
      // Get team members
      const { data: teamMembers, error: membersError } = await dataClient
        .from('users')
        .select('id, first_name, last_name, email, team')
        .eq('role', 'worker')
        .in('team', managedTeams);
      
      if (membersError) throw membersError;
      
      const memberIds = teamMembers?.map(member => member.id) || [];
      
      if (memberIds.length === 0) {
        return [];
      }
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get login activity for team members
      const { data: loginActivity, error: activityError } = await dataClient
        .from('authentication_logs')
        .select('*')
        .eq('action', 'login')
        .eq('success', true)
        .in('user_id', memberIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (activityError) throw activityError;
      
      console.log(`📊 Found ${loginActivity?.length || 0} login activities for team members`);
      return loginActivity || [];
      
    } catch (error) {
      console.error('Error fetching team member login activity:', error);
      throw error;
    }
  }
}

// Export default instance for backward compatibility
