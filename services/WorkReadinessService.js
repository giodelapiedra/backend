const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin Client with fallback configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Work Readiness Service Layer
 * Handles all business logic for work readiness and KPI calculations
 */
class WorkReadinessService {
  
  /**
   * Calculate KPI score based on consecutive days completed in cycle
   * @param {number} consecutiveDays - Number of consecutive days completed (0-7)
   * @returns {object} KPI score and rating
   */
  static calculateKPI(consecutiveDays) {
    let rating, color, description, score;
    
    // KPI scoring based on consecutive days:
    // 7/7 days: Excellent
    // 5-6 days: Good  
    // 3-4 days: Average
    // Less than 3 days: No KPI points
    
    if (consecutiveDays >= 7) {
      rating = 'Excellent';
      color = '#10b981'; // green
      description = 'Outstanding! Complete 7-day cycle achieved.';
      score = 100;
    } else if (consecutiveDays >= 5) {
      rating = 'Good';
      color = '#22c55e'; // light green
      description = 'Good progress! Keep going to complete the cycle.';
      score = Math.round((consecutiveDays / 7) * 100);
    } else if (consecutiveDays >= 3) {
      rating = 'Average';
      color = '#eab308'; // yellow/orange
      description = 'Average progress. Focus on consistency.';
      score = Math.round((consecutiveDays / 7) * 100);
    } else {
      rating = 'No KPI Points';
      color = '#ef4444'; // red
      description = 'Need at least 3 consecutive days for KPI points.';
      score = 0;
    }

    return {
      rating,
      color,
      description,
      score: score,
      consecutiveDays: consecutiveDays,
      maxDays: 7
    };
  }

  /**
   * Get worker's latest work readiness assessment
   * @param {string} workerId - Worker ID
   * @returns {object} Latest assessment data
   */
  static async getLatestAssessment(workerId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('work_readiness')
        .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
        .eq('worker_id', workerId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching latest assessment:', error);
      throw error;
    }
  }

  /**
   * Get worker's work readiness data for a date range
   * @param {string} workerId - Worker ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {array} Work readiness assessments
   */
  static async getWorkerAssessments(workerId, startDate, endDate) {
    try {
      const { data, error } = await supabaseAdmin
        .from('work_readiness')
        .select('*')
        .eq('worker_id', workerId)
        .gte('submitted_at', startDate.toISOString())
        .lte('submitted_at', endDate.toISOString())
        .order('submitted_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching worker assessments:', error);
      throw error;
    }
  }

  /**
   * Calculate worker's weekly progress
   * @param {string} workerId - Worker ID
   * @param {Date} weekStart - Week start date
   * @param {Date} weekEnd - Week end date
   * @returns {object} Weekly progress data
   */
  static async calculateWeeklyProgress(workerId, weekStart, weekEnd) {
    try {
      const assessments = await this.getWorkerAssessments(workerId, weekStart, weekEnd);
      const latestAssessment = await this.getLatestAssessment(workerId);
      
      const completedDays = assessments.length;
      const totalWorkDays = 7; // Assuming 7-day work week
      const completionRate = totalWorkDays > 0 ? Math.round((completedDays / totalWorkDays) * 100) : 0;
      
      const consecutiveDays = latestAssessment?.streak_days || 0;
      const kpi = this.calculateKPI(consecutiveDays);
      
      return {
        completedDays,
        totalWorkDays,
        completionRate,
        kpi,
        weekLabel: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
        streaks: {
          current: consecutiveDays,
          longest: consecutiveDays // TODO: Calculate from historical data
        },
        topPerformingDays: completedDays
      };
    } catch (error) {
      console.error('Error calculating weekly progress:', error);
      throw error;
    }
  }

  /**
   * Get team members for a team leader
   * @param {string} teamLeaderId - Team leader ID
   * @returns {array} Team members
   */
  static async getTeamMembers(teamLeaderId) {
    try {
      // Get team leader's managed teams
      const { data: teamLeader, error: leaderError } = await supabaseAdmin
        .from('users')
        .select('managed_teams, team')
        .eq('id', teamLeaderId)
        .single();

      if (leaderError) {
        throw leaderError;
      }

      const managedTeams = teamLeader?.managed_teams || [];
      if (teamLeader?.team && !managedTeams.includes(teamLeader.team)) {
        managedTeams.push(teamLeader.team);
      }

      if (managedTeams.length === 0) {
        return [];
      }

      // Get team members
      const { data: teamMembers, error: membersError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .eq('is_active', true)
        .in('team', managedTeams);

      if (membersError) {
        throw membersError;
      }

      return teamMembers || [];
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  }

  /**
   * Get team work readiness data
   * @param {string} teamLeaderId - Team leader ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {object} Team work readiness data
   */
  static async getTeamWorkReadinessData(teamLeaderId, startDate, endDate) {
    try {
      const teamMembers = await this.getTeamMembers(teamLeaderId);
      const teamMemberIds = teamMembers.map(member => member.id);

      if (teamMemberIds.length === 0) {
        return {
          teamMembers: [],
          assessments: [],
          complianceRate: 0
        };
      }

      // Get work readiness assessments
      const { data: assessments, error: assessmentsError } = await supabaseAdmin
        .from('work_readiness')
        .select(`
          *,
          worker:users!work_readiness_worker_id_fkey(*)
        `)
        .in('worker_id', teamMemberIds)
        .gte('submitted_at', startDate.toISOString())
        .lte('submitted_at', endDate.toISOString())
        .order('submitted_at', { ascending: false });

      if (assessmentsError) {
        throw assessmentsError;
      }

      // Calculate compliance rate
      const totalTeamMembers = teamMembers.length;
      const submittedAssessments = assessments?.length || 0;
      const complianceRate = totalTeamMembers > 0 
        ? Math.round((submittedAssessments / totalTeamMembers) * 100) 
        : 0;

      return {
        teamMembers,
        assessments: assessments || [],
        complianceRate
      };
    } catch (error) {
      console.error('Error fetching team work readiness data:', error);
      throw error;
    }
  }

  /**
   * Validate work readiness submission data
   * @param {object} data - Submission data
   * @returns {object} Validation result
   */
  static validateWorkReadinessData(data) {
    const errors = [];

    // Required fields
    if (!data.fatigueLevel || data.fatigueLevel < 1 || data.fatigueLevel > 5) {
      errors.push('Fatigue level must be between 1 and 5');
    }

    if (!data.readinessLevel || !['fit', 'not_fit', 'limited'].includes(data.readinessLevel)) {
      errors.push('Readiness level must be fit, not_fit, or limited');
    }

    if (!data.mood || !['excellent', 'good', 'average', 'poor'].includes(data.mood)) {
      errors.push('Mood must be excellent, good, average, or poor');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process work readiness submission
   * @param {string} workerId - Worker ID
   * @param {object} submissionData - Submission data
   * @returns {object} Processed submission result
   */
  static async processWorkReadinessSubmission(workerId, submissionData) {
    try {
      // Validate data
      const validation = this.validateWorkReadinessData(submissionData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Get latest assessment for cycle calculation
      const latestAssessment = await this.getLatestAssessment(workerId);
      
      // Calculate cycle data
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      let cycleStart = todayDate;
      let cycleDay = 1;
      let streakDays = 1;
      let cycleCompleted = false;
      let message = '';

      if (latestAssessment) {
        const lastSubmissionDate = new Date(latestAssessment.submitted_at);
        const daysDiff = Math.floor((todayDate - lastSubmissionDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Consecutive day - continue streak
          streakDays = (latestAssessment.streak_days || 0) + 1;
          cycleDay = (latestAssessment.cycle_day || 0) + 1;
          cycleStart = new Date(latestAssessment.cycle_start);
          cycleCompleted = latestAssessment.cycle_completed;
        } else if (daysDiff > 1) {
          // Missed day(s) - reset cycle
          console.log('🔄 MISSED DAYS - Resetting cycle due to gap of', daysDiff, 'days');
          cycleStart = todayDate;
          cycleDay = 1;
          streakDays = 1;
          cycleCompleted = false;
        } else {
          // Same day - don't update
          throw new Error('Already submitted today');
        }
      }

      // Check if cycle is completed
      if (streakDays >= 7) {
        cycleCompleted = true;
        message = "🎉 Cycle complete! Excellent work! 7 consecutive days achieved!";
      }

      // Prepare submission data
      const assessmentData = {
        worker_id: workerId,
        fatigue_level: submissionData.fatigueLevel,
        pain_discomfort: submissionData.painDiscomfort,
        pain_areas: submissionData.painAreas || [],
        readiness_level: submissionData.readinessLevel,
        mood: submissionData.mood,
        notes: submissionData.notes || '',
        cycle_start: cycleStart.toISOString(),
        cycle_day: cycleDay,
        streak_days: streakDays,
        cycle_completed: cycleCompleted,
        submitted_at: new Date().toISOString()
      };

      // Insert assessment
      const { data, error } = await supabaseAdmin
        .from('work_readiness')
        .insert(assessmentData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Calculate KPI
      const kpi = this.calculateKPI(streakDays);

      return {
        success: true,
        assessment: data,
        kpi,
        message: message || 'Assessment submitted successfully',
        cycleInfo: {
          cycleStart,
          cycleDay,
          streakDays,
          cycleCompleted
        }
      };
    } catch (error) {
      console.error('Error processing work readiness submission:', error);
      throw error;
    }
  }
}

module.exports = WorkReadinessService;
