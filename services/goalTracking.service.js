const userRepo = require('../repositories/userRepo');
const workReadinessRepo = require('../repositories/workReadinessRepo');
const assignmentRepo = require('../repositories/assignmentRepo');
const { calculateKPI, calculateCompletionRateKPI, calculateStreaks } = require('../utils/kpiCalculators');
const { getPerformanceTrend } = require('../utils/insightGenerators');
const dateUtils = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Goal Tracking Service
 * Handles goal tracking and cycle management logic
 */
class GoalTrackingService {
  /**
   * Get worker weekly progress
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Weekly progress data
   */
  async getWorkerWeeklyProgress(workerId) {
    try {
      // Get worker info
      const worker = await userRepo.getUserByIdAndRole(workerId, 'worker');
      if (!worker) {
        throw new Error('Worker not found');
      }

      // Get latest assessment
      const latestAssessment = await workReadinessRepo.getLatestAssessment(workerId);

      // Check if cycle exists
      if (!latestAssessment?.cycle_start) {
        return {
          success: true,
          message: 'No active cycle',
          data: {
            weeklyProgress: {
              completedDays: 0,
              totalWorkDays: 7,
              completionRate: 0,
              kpi: calculateKPI(0),
              weekLabel: 'No Active Cycle',
              streaks: { current: 0, longest: 0 },
              topPerformingDays: 0
            },
            dailyBreakdown: [],
            kpiMetrics: {
              currentKPI: calculateKPI(0),
              goalType: 'Work Readiness Assessment',
              weeklyTarget: 7,
              actualCompleted: 0,
              performanceTrend: []
            }
          }
        };
      }

      const cycleStart = new Date(latestAssessment.cycle_start);
      const cycleEnd = new Date(cycleStart);
      cycleEnd.setDate(cycleStart.getDate() + 6); // 7-day cycle

      // Get assessments
      const assessments = await workReadinessRepo.getAssessmentsForWorker(
        workerId,
        cycleStart.toISOString(),
        cycleEnd.toISOString()
      );

      // Calculate daily breakdown for cycle
      const dailyBreakdown = [];
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(cycleStart);
        currentDate.setDate(cycleStart.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const dayAssessment = assessments?.find(a => 
          new Date(a.submitted_at).toISOString().split('T')[0] === dateStr
        );
        
        dailyBreakdown.push({
          date: dateStr,
          dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
          completed: !!dayAssessment,
          readinessLevel: dayAssessment?.readiness_level || null,
          fatigueLevel: dayAssessment?.fatigue_level || null,
          mood: dayAssessment?.mood || null,
          submittedAt: dayAssessment?.submitted_at || null
        });
      }

      // Calculate KPI
      const consecutiveDaysCompleted = latestAssessment.streak_days || 0;
      const kpi = calculateKPI(consecutiveDaysCompleted);

      // Achievement summary
      const achievementSummary = {
        completedDays: consecutiveDaysCompleted,
        totalWorkDays: 7,
        completionRate: Math.round((consecutiveDaysCompleted / 7) * 100),
        kpi: kpi,
        weekLabel: `Cycle Day ${latestAssessment.cycle_day || 1} of 7`,
        streaks: calculateStreaks(assessments),
        topPerformingDays: dailyBreakdown.filter(d => d.completed && d.readinessLevel === 'fit').length
      };

      return {
        success: true,
        data: {
          weeklyProgress: achievementSummary,
          dailyBreakdown,
          kpiMetrics: {
            currentKPI: kpi,
            goalType: 'Work Readiness Assessment',
            weeklyTarget: 7,
            actualCompleted: consecutiveDaysCompleted,
            performanceTrend: await getPerformanceTrend(workerId, require('../config/supabase').supabase)
          },
          cycle: {
            cycleStart: latestAssessment.cycle_start,
            currentDay: latestAssessment.cycle_day || 1,
            streakDays: latestAssessment.streak_days || 0,
            cycleCompleted: latestAssessment.cycle_completed || false
          }
        }
      };

    } catch (error) {
      logger.error('Error in getWorkerWeeklyProgress:', error);
      throw error;
    }
  }

  /**
   * Handle login-triggered 7-day cycle for workers
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Cycle data
   */
  async handleLogin(workerId) {
    try {
      logger.logBusiness('Handle Login Called', { workerId });

      // Check if user is WORKER role
      const user = await userRepo.getUserRole(workerId);
      if (user !== 'worker') {
        return {
          success: true,
          message: "No cycle needed for this role",
          cycle: null
        };
      }

      // Get today's date in Philippines Time (UTC+8)
      const today = dateUtils.getTodayDateString();

      // Get the last login from authentication_logs (simplified)
      const { supabase } = require('../config/supabase');
      const { data: lastLoginRecord, error: loginError } = await supabase
        .from('authentication_logs')
        .select('created_at')
        .eq('user_id', workerId)
        .eq('action', 'login')
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      logger.logBusiness('Backend Debug - Login Record', { lastLoginRecord, loginError });

      // If no login record found, treat as first time login
      const lastLogin = lastLoginRecord?.created_at?.split('T')[0] || null;
      logger.logBusiness('Backend Debug - Date Comparison', { lastLogin, today });

      // Get latest assessment to check cycle status
      const latestAssessment = await workReadinessRepo.getLatestAssessment(workerId);
      logger.logBusiness('Backend Debug - Latest Assessment', { latestAssessment });

      // FIRST: Check if no assessments exist (FIRST TIME LOGIN)
      if (!latestAssessment) {
        logger.logBusiness('First Time Login - No Assessments', { lastLoginRecord, lastLogin });
        return {
          success: true,
          message: "Welcome! Your 7-day Work Readiness cycle has started.",
          cycle: {
            cycle_start: today,
            current_day: 1,
            streak_days: 0,
            cycle_completed: false
          },
          day: 1,
          isFirstTimeLogin: true
        };
      }

      // SPECIAL CASE: Check if this is the very first login (no login records)
      if (!lastLoginRecord || loginError?.code === 'PGRST116') {
        logger.logBusiness('Very First Login - No Login Records', { loginError });
        return {
          success: true,
          message: "Welcome! Your 7-day Work Readiness cycle has started.",
          cycle: {
            cycle_start: today,
            current_day: 1,
            streak_days: 0,
            cycle_completed: false
          },
          day: 1,
          isFirstTimeLogin: true
        };
      }

      // SECOND: Check if cycle exists and is completed
      if (latestAssessment?.cycle_completed) {
        return {
          success: true,
          message: "Cycle completed! Login again to start a new 7-day cycle.",
          cycle: {
            cycle_start: null,
            current_day: 0,
            streak_days: 0,
            cycle_completed: true
          },
          day: 0,
          cycleCompleted: true,
          needsNewLogin: true
        };
      }

      // THIRD: Check if missed a day (cycle broken) - using login data
      if (latestAssessment?.cycle_start && lastLogin !== today) {
        logger.logBusiness('Missed Day - Cycle Broken', { lastLogin, today });
        return {
          success: true,
          message: "A new cycle has started.",
          cycle: {
            cycle_start: today,
            current_day: 1,
            streak_days: 1,
            cycle_completed: false
          },
          day: 1,
          isCycleReset: true
        };
      }

      // FOURTH: Check if cycle was completed and needs new login to start
      if (latestAssessment?.cycle_completed && lastLogin !== today) {
        logger.logBusiness('New Cycle After Completion', { lastLogin, today });
        return {
          success: true,
          message: "Welcome! Your new 7-day Work Readiness cycle has started.",
          cycle: {
            cycle_start: today,
            current_day: 1,
            streak_days: 0,
            cycle_completed: false
          },
          day: 1,
          isNewCycleStart: true
        };
      }

      // FIFTH: Check if no cycle start (shouldn't happen if latestAssessment exists)
      if (!latestAssessment?.cycle_start) {
        logger.logBusiness('No Cycle Start - Starting New One');
        return {
          success: true,
          message: "Welcome! Your 7-day Work Readiness cycle has started.",
          cycle: {
            cycle_start: today,
            current_day: 1,
            streak_days: 0,
            cycle_completed: false
          },
          day: 1,
          isFirstTimeLogin: true
        };
      }

      // Continue existing cycle
      const currentDay = latestAssessment.cycle_day || 1;
      logger.logBusiness('Continuing Existing Cycle', { currentDay, lastLogin, today });

      return {
        success: true,
        message: `Continue your cycle! Day ${currentDay} of 7.`,
        cycle: {
          cycle_start: latestAssessment.cycle_start,
          current_day: currentDay,
          streak_days: latestAssessment.streak_days || 0,
          cycle_completed: latestAssessment.cycle_completed || false
        },
        day: currentDay
      };

    } catch (error) {
      logger.error('Error handling login cycle', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle work readiness assessment submission and update cycle
   * @param {string} workerId - Worker ID
   * @param {Object} assessmentData - Assessment data
   * @returns {Promise<Object>} Submission result
   */
  async handleAssessmentSubmission(workerId, assessmentData) {
    try {
      logger.logBusiness('Handling Assessment Submission', { workerId, assessmentData });

      // Get worker info
      const worker = await userRepo.getUserByIdAndRole(workerId, 'worker');
      if (!worker) {
        throw new Error('Worker not found');
      }

      // Get today's date in Philippines Time (UTC+8)
      const today = dateUtils.getTodayDateString();

      // Check if worker has active assignment for today
      const assignment = await assignmentRepo.getActiveAssignmentForDate(workerId, today);
      if (!assignment) {
        throw new Error('No active work readiness assignment found for today. Please wait for your team leader to assign you.');
      }

      // Allow submission even if assignment is overdue
      const currentTime = new Date();
      const dueTime = new Date(assignment.due_time);
      const isOverdue = currentTime > dueTime;
      
      if (isOverdue) {
        logger.logBusiness('Assignment is overdue but allowing submission', {
          workerId,
          assignmentId: assignment.id,
          dueTime: dueTime.toISOString(),
          currentTime: currentTime.toISOString()
        });
      }

      // Get latest assessment to check cycle status
      const latestAssessment = await workReadinessRepo.getLatestAssessment(workerId);

      // Check if assessment already submitted today
      const existingAssessment = await workReadinessRepo.getAssessmentForToday(workerId, today);

      // Determine cycle data with proper consecutive day validation
      let cycleStart, cycleDay, streakDays, cycleCompleted;

      if (!latestAssessment?.cycle_start || latestAssessment?.cycle_completed) {
        // Start new cycle
        cycleStart = today;
        cycleDay = 1;
        streakDays = 1;
        cycleCompleted = false;
      } else {
        // Check if submission is consecutive
        const lastSubmissionDate = new Date(latestAssessment.submitted_at);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate - lastSubmissionDate) / (1000 * 60 * 60 * 24));

        logger.logBusiness('Date Validation', {
          lastSubmission: dateUtils.getDateString(lastSubmissionDate),
          today: today,
          daysDiff: daysDiff
        });

        if (daysDiff > 1) {
          // Missed day(s) - reset cycle
          logger.logBusiness('Missed Days - Resetting Cycle', { daysDiff });
          cycleStart = today;
          cycleDay = 1;
          streakDays = 0;
          cycleCompleted = false;
        } else {
          // Continue existing cycle (consecutive day)
          cycleStart = latestAssessment.cycle_start;
          cycleDay = (latestAssessment.cycle_day || 1) + 1;
          streakDays = (latestAssessment.streak_days || 0) + 1;
          cycleCompleted = streakDays >= 7;

          logger.logBusiness('Consecutive Day - Continuing Cycle', {
            cycleDay: cycleDay,
            streakDays: streakDays,
            cycleCompleted: cycleCompleted
          });
        }
      }

      // Support both camelCase and snake_case field names
      const { 
        readinessLevel, 
        fatigueLevel, 
        readiness_level, 
        fatigue_level 
      } = assessmentData;

      // Use snake_case if available, otherwise camelCase
      const actualReadinessLevel = readiness_level || readinessLevel;
      const actualFatigueLevel = fatigue_level || fatigueLevel;

      // Get worker's team and team leader info
      let teamLeaderId = null;
      let workerTeam = worker.team || null;

      // PRIORITY 1: Use worker's assigned team_leader_id if it exists
      if (worker.team_leader_id) {
        teamLeaderId = worker.team_leader_id;
        logger.logBusiness('Using Worker\'s Assigned Team Leader', { 
          workerId, 
          workerTeam: worker.team,
          teamLeaderId: worker.team_leader_id,
          source: 'worker.team_leader_id (DIRECT ASSIGNMENT)'
        });
      }
      // PRIORITY 2: Look up team leader if worker has team but no direct team_leader_id
      else if (worker.team) {
        try {
          const { supabase } = require('../config/supabase');
          
          // Look for team leader who manages this team (in managed_teams array)
          const { data: teamLeader, error: teamLeaderError } = await supabase
            .from('users')
            .select('id, first_name, last_name, managed_teams')
            .eq('role', 'team_leader')
            .eq('is_active', true)
            .contains('managed_teams', [worker.team])
            .single();
          
          if (!teamLeaderError && teamLeader) {
            teamLeaderId = teamLeader.id;
            logger.logBusiness('Found Team Leader via Managed Teams', { 
              workerId, 
              workerTeam: worker.team,
              teamLeaderId: teamLeader.id, 
              teamLeaderName: `${teamLeader.first_name} ${teamLeader.last_name}`,
              managedTeams: teamLeader.managed_teams,
              source: 'managed_teams lookup'
            });
          } else {
            // Fallback: try to find team leader by team field
            const { data: fallbackLeader, error: fallbackError } = await supabase
              .from('users')
              .select('id, first_name, last_name, team')
              .eq('role', 'team_leader')
              .eq('team', worker.team)
              .eq('is_active', true)
              .single();
            
            if (!fallbackError && fallbackLeader) {
              teamLeaderId = fallbackLeader.id;
              logger.logBusiness('Found Team Leader via Team Field', { 
                workerId, 
                workerTeam: worker.team,
                teamLeaderId: fallbackLeader.id, 
                teamLeaderName: `${fallbackLeader.first_name} ${fallbackLeader.last_name}`,
                source: 'team field lookup (fallback)'
              });
            } else {
              logger.warn('Team Leader Not Found for Worker', { 
                workerId, 
                workerTeam: worker.team,
                teamLeaderError: teamLeaderError?.message,
                fallbackError: fallbackError?.message
              });
            }
          }
        } catch (error) {
          logger.error('Error finding team leader', { error: error.message, workerId, workerTeam: worker.team });
        }
      } else {
        logger.warn('Worker has no team assigned', { workerId });
      }

      // Transform assessment data to match database schema
      const transformedAssessmentData = {
        worker_id: workerId,
        team_leader_id: teamLeaderId,
        team: workerTeam,
        readiness_level: actualReadinessLevel,
        fatigue_level: actualFatigueLevel,
        mood: assessmentData.mood,
        pain_discomfort: assessmentData.pain_discomfort,
        notes: assessmentData.notes || null,
        // Legacy cycle columns - kept for migration but not used in new assignment-based system
        cycle_start: cycleStart,
        cycle_day: cycleDay,
        streak_days: streakDays,
        cycle_completed: cycleCompleted,
        submitted_at: new Date().toISOString()
      };

      // Handle existing vs new assessment to prevent duplication
      let savedAssessment;

      if (existingAssessment) {
        // Update existing assessment with cycle data
        logger.logBusiness('Updating Existing Assessment', { assessmentId: existingAssessment.id });

        const updateData = {
          ...existingAssessment,
          ...transformedAssessmentData,
          updated_at: new Date().toISOString()
        };

        savedAssessment = await workReadinessRepo.updateAssessment(existingAssessment.id, updateData);
        logger.logBusiness('Assessment Updated with Cycle Data', { assessmentId: savedAssessment.id });

      } else {
        // Create new assessment with cycle data
        logger.logBusiness('Creating New Assessment with Cycle Data', {
          workerId,
          teamLeaderId,
          team: workerTeam,
          readinessLevel: actualReadinessLevel
        });
        savedAssessment = await workReadinessRepo.createAssessment(transformedAssessmentData);
        logger.logBusiness('New Assessment Saved with Cycle Data', { 
          assessmentId: savedAssessment.id,
          workerId: savedAssessment.worker_id,
          teamLeaderId: savedAssessment.team_leader_id,
          team: savedAssessment.team,
          readinessLevel: savedAssessment.readiness_level
        });
      }

      // Update assignment status to completed
      try {
        const { supabase } = require('../config/supabase');
        const { error: updateAssignmentError } = await supabase
          .from('work_readiness_assignments')
          .update({
            status: 'completed',
            work_readiness_id: savedAssessment.id,
            completed_at: new Date().toISOString()
          })
          .eq('id', assignment.id);

        if (updateAssignmentError) {
          logger.error('Failed to update assignment status', { error: updateAssignmentError, assignmentId: assignment.id });
        } else {
          logger.logBusiness('Assignment Status Updated to Completed', { assignmentId: assignment.id });
        }
      } catch (assignmentUpdateError) {
        logger.error('Error updating assignment status', { error: assignmentUpdateError, workerId });
        // Don't fail the whole request if assignment update fails
      }

      // Calculate KPI based on consecutive days
      const kpi = calculateKPI(streakDays);

      // Determine message based on progress
      let message;
      if (cycleCompleted) {
        message = "🎉 Cycle complete! Excellent work! 7 consecutive days achieved!";
      } else if (streakDays >= 2) {
        message = `✅ Day ${streakDays} complete! Keep the streak going!`;
      } else if (streakDays === 1 && cycleDay === 1) {
        message = "🚀 Day 1 complete! Great start to your new cycle!";
      } else {
        message = `📝 Day ${streakDays} complete! Building momentum!`;
      }

      return {
        success: true,
        message: message,
        cycle: {
          cycle_start: cycleStart,
          current_day: cycleDay,
          streak_days: streakDays,
          cycle_completed: cycleCompleted
        },
        day: streakDays,
        cycleComplete: cycleCompleted,
        kpi: kpi,
        assessmentData: transformedAssessmentData,
        savedAssessmentId: savedAssessment.id
      };

    } catch (error) {
      logger.error('Error handling assessment submission', { error: error.message, workerId });
      throw error;
    }
  }
}

module.exports = new GoalTrackingService();
