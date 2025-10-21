const userRepo = require('../repositories/userRepo');
const workReadinessRepo = require('../repositories/workReadinessRepo');
const assignmentRepo = require('../repositories/assignmentRepo');
const unselectedWorkerRepo = require('../repositories/unselectedWorkerRepo');
const { calculateAssignmentKPI, calculateWeeklyTeamKPI, calculateCompletionRateKPI } = require('../utils/kpiCalculators');
const { generatePerformanceInsights, generateMonitoringInsights, generateMonthlyInsights, getTeamWeeklyComparison } = require('../utils/insightGenerators');
const dateUtils = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Team KPI Service
 * Handles team-level KPI calculations and analytics
 */
class TeamKPIService {
  /**
   * Get team leader assignment KPI summary
   * @param {string} teamLeaderId - Team leader ID
   * @returns {Promise<Object>} Team KPI data
   */
  async getTeamLeaderAssignmentKPI(teamLeaderId) {
    try {
      logger.logBusiness('Team Leader Assignment KPI Request', { teamLeaderId });

      // Get date range for the current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get team leader with managed teams
      const teamLeader = await userRepo.getTeamLeaderWithManagedTeams(teamLeaderId);
      if (!teamLeader) {
        throw new Error('Team leader not found');
      }

      // Get team members
      const teamMembers = await userRepo.getTeamMembersByTeamLeader(teamLeader.managed_teams);
      const teamMemberIds = teamMembers?.map(member => member.id) || [];

      // Get unselected workers for this month to exclude them from KPI calculation
      const unselectedWorkers = await unselectedWorkerRepo.getUnselectedWorkersForTeamLeader(
        teamLeaderId,
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0]
      );

      // Create a set of unselected worker IDs for quick lookup
      const unselectedWorkerIds = new Set(unselectedWorkers?.map(uw => uw.worker_id) || []);

      // Filter out unselected workers from team member IDs
      const selectedTeamMemberIds = teamMemberIds.filter(id => !unselectedWorkerIds.has(id));

      logger.logBusiness('Team Member Filtering', {
        totalTeamMembers: teamMemberIds.length,
        unselectedWorkers: unselectedWorkerIds.size,
        selectedTeamMembers: selectedTeamMemberIds.length,
        unselectedWorkerIds: Array.from(unselectedWorkerIds)
      });

      // Get assignments only for selected team members (excluding unselected workers)
      const assignments = await assignmentRepo.getAssignmentsForWorkers(
        selectedTeamMemberIds,
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0]
      );

      // Calculate team metrics
      const totalAssignments = assignments?.length || 0;
      const completedAssignments = assignments?.filter(a => a.status === 'completed').length || 0;
      const onTimeSubmissions = assignments?.filter(a => 
        a.status === 'completed' && 
        a.completed_at && 
        new Date(a.completed_at) <= new Date(a.due_time)
      ).length || 0;

      // PENDING ASSIGNMENTS WITH FUTURE DUE DATES (TEAM LEVEL)
      const currentTime = new Date();
      const pendingAssignments = assignments?.filter(a => {
        if (a.status !== 'pending' || !a.due_time) return false;
        const dueTime = new Date(a.due_time);
        return dueTime > currentTime; // Only count pending assignments with future due dates
      }).length || 0;

      // OVERDUE ASSIGNMENTS CALCULATION (TEAM LEVEL)
      const overdueAssignments = assignments?.filter(a => {
        if (a.status !== 'overdue') return false;
        return true; // All overdue assignments count as penalty
      }).length || 0;

      logger.logBusiness('Team Metrics (Excluding Unselected Workers)', {
        totalAssignments,
        completedAssignments,
        onTimeSubmissions,
        pendingAssignments,
        overdueAssignments,
        totalTeamMembers: teamMembers?.length || 0,
        selectedTeamMembers: selectedTeamMemberIds.length,
        unselectedWorkers: unselectedWorkerIds.size,
        unselectedWorkerIds: Array.from(unselectedWorkerIds)
      });

      // Calculate individual worker KPIs
      logger.logBusiness('Calculating Individual KPIs', { 
        teamMembersCount: teamMembers?.length || 0 
      });

      const individualKPIs = await Promise.all(teamMembers.map(async (member) => {
        // Only calculate KPI for selected team members (exclude unselected workers)
        if (unselectedWorkerIds.has(member.id)) {
          return {
            workerId: member.id,
            workerName: `${member.first_name} ${member.last_name}`,
            kpi: {
              rating: 'Unselected',
              letterGrade: 'N/A',
              score: 0,
              color: '#6b7280',
              description: 'Worker not selected for assignments'
            },
            metrics: {
              totalAssignments: 0,
              completedAssignments: 0,
              onTimeSubmissions: 0,
              pendingAssignments: 0,
              overdueAssignments: 0,
              completionRate: 0,
              onTimeRate: 0,
              qualityScore: 0
            }
          };
        }

        const memberAssignments = assignments?.filter(a => a.worker_id === member.id) || [];
        const memberCompleted = memberAssignments.filter(a => a.status === 'completed').length;

        // SHIFT-BASED ON-TIME CALCULATION
        const memberOnTime = memberAssignments.filter(a => {
          if (a.status !== 'completed' || !a.completed_at || !a.due_time) return false;
          const completedDate = new Date(a.completed_at);
          const dueTime = new Date(a.due_time); // Shift-based deadline from DB
          return completedDate <= dueTime;
        }).length;

        // PENDING ASSIGNMENTS WITH FUTURE DUE DATES
        const memberPending = memberAssignments.filter(a => {
          if (a.status !== 'pending' || !a.due_time) return false;
          const dueTime = new Date(a.due_time);
          return dueTime > currentTime; // Only count pending assignments with future due dates
        }).length;

        // OVERDUE ASSIGNMENTS FOR INDIVIDUAL WORKER
        const memberOverdue = memberAssignments.filter(a => {
          if (a.status !== 'overdue') return false;
          return true; // All overdue assignments count as penalty
        }).length;

        // Validate shift-based deadline data
        const assignmentsWithDueTime = memberAssignments.filter(a => a.due_time).length;
        if (assignmentsWithDueTime < memberAssignments.length) {
          logger.warn('Worker assignments missing due_time', {
            workerName: `${member.first_name} ${member.last_name}`,
            missingDueTime: memberAssignments.length - assignmentsWithDueTime
          });
        }

        // Get work readiness data for quality scoring
        const workReadiness = await workReadinessRepo.getWorkReadinessForQualityScoring(
          member.id,
          monthStart.toISOString(),
          monthEnd.toISOString()
        );

        // Calculate quality score
        let qualityScore = 0;
        if (workReadiness && workReadiness.length > 0) {
          const qualityScores = workReadiness.map(wr => {
            switch(wr.readiness_level) {
              case 'fit': return 100;
              case 'minor': return 70;
              case 'not_fit': return 30;
              default: return 50;
            }
          });
          qualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
        }

        // Detect late submissions (completed after due time)
        const lateSubmissions = memberAssignments.filter(assignment => {
          if (assignment.status !== 'completed' || !assignment.completed_at || !assignment.due_time) {
            return false;
          }
          const completedTime = new Date(assignment.completed_at);
          const dueTime = new Date(assignment.due_time);
          return completedTime > dueTime;
        });

        const kpi = calculateAssignmentKPI(memberCompleted, memberAssignments.length, memberOnTime, qualityScore, memberPending, memberOverdue, [], lateSubmissions);

        return {
          workerId: member.id,
          workerName: `${member.first_name} ${member.last_name}`,
          workerEmail: member.email,
          kpi: kpi,
          assignments: {
            total: memberAssignments.length,
            completed: memberCompleted,
            onTime: memberOnTime,
            pending: memberAssignments.filter(a => a.status === 'pending').length,
            overdue: memberAssignments.filter(a => a.status === 'overdue').length
          }
        };
      }));

      // Calculate team KPI
      const teamCompletionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
      const teamOnTimeRate = totalAssignments > 0 ? (onTimeSubmissions / totalAssignments) * 100 : 0;
      const avgQualityScore = individualKPIs.length > 0 
        ? individualKPIs.reduce((sum, kpi) => sum + kpi.kpi.qualityScore, 0) / individualKPIs.length 
        : 0;

      // Calculate team late submissions
      const teamLateSubmissions = assignments.filter(assignment => {
        if (assignment.status !== 'completed' || !assignment.completed_at || !assignment.due_time) {
          return false;
        }
        const completedTime = new Date(assignment.completed_at);
        const dueTime = new Date(assignment.due_time);
        return completedTime > dueTime;
      });

      const teamKPI = calculateAssignmentKPI(completedAssignments, totalAssignments, onTimeSubmissions, avgQualityScore, pendingAssignments, overdueAssignments, [], teamLateSubmissions);

      logger.logBusiness('Team KPI Calculation with Penalties', {
        totalAssignments,
        completedAssignments,
        completionRate: (teamCompletionRate || 0).toFixed(1),
        pendingAssignments,
        onTimeSubmissions,
        onTimeRate: (teamOnTimeRate || 0).toFixed(1),
        avgQualityScore: (avgQualityScore || 0).toFixed(1),
        pendingBonus: (teamKPI.pendingBonus || 0).toFixed(2),
        overduePenalty: (teamKPI.overduePenalty || 0).toFixed(2),
        lateSubmissions: teamLateSubmissions.length,
        latePenaltyApplied: teamKPI.latePenaltyApplied,
        teamKPIRating: teamKPI.rating,
        teamKPIScore: (teamKPI.score || 0).toFixed(2),
        finalFormula: `(${(teamCompletionRate || 0).toFixed(1)}% * 0.5) + (${(teamOnTimeRate || 0).toFixed(1)}% * 0.25) + (${(teamLateRate || 0).toFixed(1)}% * 0.15) + (${(avgQualityScore || 0).toFixed(1)} * 0.1) + ${(teamKPI.pendingBonus || 0).toFixed(2)}% bonus - ${(teamKPI.overduePenalty || 0).toFixed(2)}% penalty = ${(teamKPI.score || 0).toFixed(2)}`
      });

      return {
        success: true,
        teamKPI: teamKPI,
        teamMetrics: {
          totalAssignments,
          completedAssignments,
          onTimeSubmissions,
          pendingAssignments,
          overdueAssignments,
          teamCompletionRate: Math.round(teamCompletionRate),
          teamOnTimeRate: Math.round(teamOnTimeRate),
          avgQualityScore: Math.round(avgQualityScore),
          totalMembers: teamMembers.length,
          selectedMembers: selectedTeamMemberIds.length,
          unselectedMembers: unselectedWorkerIds.size,
          unselectedWorkerIds: Array.from(unselectedWorkerIds)
        },
        individualKPIs,
        period: {
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0],
          month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
        }
      };

    } catch (error) {
      logger.error('Error in getTeamLeaderAssignmentKPI:', error);
      throw error;
    }
  }

  /**
   * Get team weekly KPI
   * @param {string} teamLeaderId - Team leader ID
   * @param {Object} weekInfo - Week information
   * @returns {Promise<Object>} Team weekly KPI data
   */
  async getTeamWeeklyKPI(teamLeaderId, weekInfo) {
    try {
      logger.logBusiness('Team Weekly KPI Request', { teamLeaderId });

      // Get team leader with managed teams
      const teamLeader = await userRepo.getTeamLeaderWithManagedTeams(teamLeaderId);
      if (!teamLeader) {
        throw new Error('Team leader not found');
      }

      // Use only the team leader's primary team (one-to-one relationship)
      let teamsToQuery = [];
      if (teamLeader?.team) {
        teamsToQuery = [teamLeader.team];
        logger.logBusiness('Using Primary Team', { team: teamLeader.team });
      } else {
        logger.warn('No team information found for team leader', { teamLeaderId });
        return {
          success: true,
          data: {
            teamKPI: {
              weekLabel: weekInfo.currentWeek.weekLabel,
              overallTeamKPI: calculateWeeklyTeamKPI(0, 0, 0),
              teamOverview: {
                totalMembers: 0,
                activeMembers: 0,
                averageCompletion: 0,
                teamKPI: 'No Team Data'
              },
              individualKPIs: [],
              teamGoalsSummary: [],
              performanceInsights: []
            }
          }
        };
      }

      // Get team members
      const teamMembers = await userRepo.getTeamMembersByTeam(teamsToQuery[0]);
      const teamMemberIds = teamMembers?.map(member => member.id) || [];

      if (teamMemberIds.length === 0) {
        return {
          success: true,
          data: {
            teamKPI: {
              weekLabel: weekInfo.currentWeek.weekLabel,
              overallTeamKPI: calculateWeeklyTeamKPI(0, 0, 0),
              teamOverview: {
                totalMembers: 0,
                weeklySubmissions: 0,
                weeklySubmissionRate: 0,
                teamKPI: 'No Team Data',
                weekStart: new Date().toISOString().split('T')[0],
                weekEnd: new Date().toISOString().split('T')[0]
              },
              individualKPIs: [],
              teamGoalsSummary: [],
              performanceInsights: []
            }
          }
        };
      }

      // Calculate expected working days in the week
      const workingDaysCount = dateUtils.getWorkingDaysCount(weekInfo.currentWeek.startDate, weekInfo.currentWeek.endDate);

      // Get weekly assessments for all team members
      const assessments = await workReadinessRepo.getAssessmentsForWorkers(
        teamMemberIds,
        weekInfo.currentWeek.startDate,
        weekInfo.currentWeek.endDate
      );

      // Calculate individual KPIs based on each worker's 7-day cycle
      const individualKPIs = await Promise.all(teamMembers.map(async (member) => {
        try {
          logger.logBusiness('Processing Worker', {
            workerName: `${member.first_name} ${member.last_name}`,
            workerId: member.id,
            team: member.team
          });

          // Get latest assessment to find individual cycle start
          const latestAssessment = await workReadinessRepo.getLatestAssessment(member.id);

          if (!latestAssessment) {
            logger.warn('No cycle data for worker', { workerId: member.id });
            return {
              workerId: member.id,
              workerName: `${member.first_name} ${member.last_name}`,
              email: member.email,
              team: member.team,
              weeklyKPIMetrics: {
                goalType: 'Work Readiness Cycle',
                completedDays: 0,
                totalWorkDays: 7,
                completionRate: 0,
                kpi: calculateCompletionRateKPI(0, null, 0)
              },
              readinessBreakdown: { fit: 0, minor: 0, not_fit: 0 },
              averageFatigueLevel: 0,
              streakDays: 0,
              missedDays: 0
            };
          }

          // Use individual cycle dates (not calendar week)
          const cycleStart = new Date(latestAssessment.cycle_start);
          const cycleEnd = new Date(cycleStart);
          cycleEnd.setDate(cycleStart.getDate() + 6); // 7-day cycle
          cycleEnd.setHours(23, 59, 59, 999); // Include the full last day

          logger.logBusiness('Worker Cycle Info', {
            workerName: member.first_name,
            cycleStart: dateUtils.getDateString(cycleStart),
            cycleEnd: dateUtils.getDateString(cycleEnd),
            currentDay: latestAssessment.cycle_day,
            streakDays: latestAssessment.streak_days
          });

          // Get assessments from individual cycle (not calendar week)
          const cycleAssessments = await workReadinessRepo.getAssessmentsForWorker(
            member.id,
            cycleStart.toISOString(),
            cycleEnd.toISOString()
          );

          // Calculate completion rate based on individual 7-day cycle
          const submittedDays = new Set(cycleAssessments?.map(a => 
            new Date(a.submitted_at).toISOString().split('T')[0]
          ) || []);

          const completedCount = submittedDays.size;
          const completionRate = (completedCount / 7) * 100; // 7-day cycle, not working days

          logger.logBusiness('Worker Cycle Stats', {
            workerName: member.first_name,
            completedDays: completedCount,
            totalCycleDays: 7,
            completionRate: Math.round(completionRate),
            cycleCompleted: latestAssessment.cycle_completed,
            cycleAssessmentsCount: cycleAssessments?.length || 0,
            submittedDays: Array.from(submittedDays)
          });

          // Calculate KPI based on individual cycle completion
          const kpi = calculateCompletionRateKPI(completionRate, latestAssessment.cycle_day, cycleAssessments?.length || 0);

          // Calculate readiness statistics for the individual cycle
          const readinessStats = cycleAssessments?.reduce((stats, assessment) => {
            stats[assessment.readiness_level] = (stats[assessment.readiness_level] || 0) + 1;
            return stats;
          }, {}) || {};

          // Calculate average trends from cycle assessments
          const avgFatigueLevel = cycleAssessments?.length > 0 
            ? cycleAssessments.reduce((sum, a) => sum + a.fatigue_level, 0) / cycleAssessments.length
            : 0;

          // Calculate missed days in current cycle
          const missedDays = Math.max(0, latestAssessment.cycle_day - completedCount);

          return {
            workerId: member.id,
            workerName: `${member.first_name} ${member.last_name}`,
            email: member.email,
            team: member.team,
            weeklyKPIMetrics: {
              goalType: 'Work Readiness Cycle',
              completedDays: completedCount,
              totalWorkDays: 7, // Always 7 days for individual cycle
              completionRate: Math.round(completionRate),
              kpi: kpi
            },
            readinessBreakdown: {
              fit: readinessStats.fit || 0,
              minor: readinessStats.minor || 0,
              not_fit: readinessStats.not_fit || 0
            },
            averageFatigueLevel: Math.round(avgFatigueLevel * 10) / 10,
            lastSubmission: cycleAssessments?.length > 0 
              ? cycleAssessments[cycleAssessments.length - 1].submitted_at
              : null,
            streakDays: latestAssessment.streak_days || 0,
            missedDays: missedDays,
            cycleInfo: {
              cycleStart: cycleStart.toISOString().split('T')[0],
              cycleEnd: cycleEnd.toISOString().split('T')[0],
              currentDay: latestAssessment.cycle_day,
              cycleCompleted: latestAssessment.cycle_completed
            }
          };
        } catch (error) {
          logger.error('Error processing worker', { 
            workerName: `${member.first_name} ${member.last_name}`,
            error: error.message 
          });
          // Return default values for this worker
          return {
            workerId: member.id,
            workerName: `${member.first_name} ${member.last_name}`,
            email: member.email,
            team: member.team,
            weeklyKPIMetrics: {
              goalType: 'Work Readiness Cycle',
              completedDays: 0,
              totalWorkDays: 7,
              completionRate: 0,
              kpi: calculateCompletionRateKPI(0, null, 0)
            },
            readinessBreakdown: { fit: 0, minor: 0, not_fit: 0 },
            averageFatigueLevel: 0,
            streakDays: 0,
            missedDays: 0
          };
        }
      }));

      // Calculate current week (Sunday to Saturday) - AUTOMATIC DATE
      const currentWeek = dateUtils.getWeekDateRange();
      const currentWeekStart = new Date(currentWeek.startDate);
      const currentWeekEnd = new Date(currentWeek.endDate);

      // Calculate TODAY's submissions using the same logic as TeamLeaderMonitoring
      const todayRange = dateUtils.getDayRange();
      const todayStart = new Date(todayRange.start);
      const todayEnd = new Date(todayRange.end);

      // Alternative approach: Use date string comparison for today
      const todayDateString = dateUtils.getTodayDateString();

      logger.logBusiness('Date Range Calculations', {
        currentWeekStart: currentWeekStart.toISOString(),
        currentWeekEnd: currentWeekEnd.toISOString(),
        todayStart: todayStart.toISOString(),
        todayEnd: todayEnd.toISOString(),
        todayDateString,
        teamMembersCount: teamMembers?.length || 0
      });

      // Count members who submitted work readiness TODAY
      const todaySubmissions = await Promise.all(teamMembers.map(async (member) => {
        const { supabase } = require('../config/supabase');
        const { data: todayAssessments, error: todayError } = await supabase
          .from('work_readiness')
          .select('id, submitted_at')
          .eq('worker_id', member.id)
          .gte('submitted_at', todayStart.toISOString())
          .lte('submitted_at', todayEnd.toISOString())
          .limit(1);

        if (todayError) {
          logger.error('Error checking today\'s submissions', { 
            workerName: member.first_name, 
            error: todayError 
          });
          return false;
        }

        if (todayAssessments && todayAssessments.length > 0) {
          logger.logBusiness('Today Submission Found', {
            workerName: member.first_name,
            submittedAt: todayAssessments[0].submitted_at
          });
          return true;
        }

        return false;
      }));

      const todaySubmissionCount = todaySubmissions.filter(submitted => submitted).length;
      const todaySubmissionRate = teamMembers.length > 0 ? (todaySubmissionCount / teamMembers.length) * 100 : 0;

      logger.logBusiness('Today Submissions Check', {
        submissions: todaySubmissions.map((submitted, index) => ({
          member: `${teamMembers[index].first_name} ${teamMembers[index].last_name}`,
          submitted: submitted
        })),
        submissionCount: todaySubmissionCount,
        submissionRate: Math.round(todaySubmissionRate)
      });

      // Count members who submitted work readiness this week
      const weeklySubmissions = await Promise.all(teamMembers.map(async (member) => {
        const { supabase } = require('../config/supabase');
        const { data: weeklyAssessments } = await supabase
          .from('work_readiness')
          .select('id')
          .eq('worker_id', member.id)
          .gte('submitted_at', currentWeekStart.toISOString())
          .lte('submitted_at', currentWeekEnd.toISOString())
          .limit(1);

        return weeklyAssessments && weeklyAssessments.length > 0;
      }));

      const weeklySubmissionCount = weeklySubmissions.filter(submitted => submitted).length;

      logger.logBusiness('Weekly Submissions Check', {
        submissions: weeklySubmissions.map((submitted, index) => ({
          member: `${teamMembers[index].first_name} ${teamMembers[index].last_name}`,
          submitted: submitted
        })),
        totalWeeklySubmissions: weeklySubmissionCount
      });

      // Calculate weekly submission rate
      const weeklySubmissionRate = teamMembers.length > 0 ? (weeklySubmissionCount / teamMembers.length) * 100 : 0;

      // Calculate team KPI based on weekly submissions (simple percentage)
      const teamKPI = calculateWeeklyTeamKPI(weeklySubmissionRate, weeklySubmissionCount, teamMembers.length);

      // Additional team metrics for comprehensive view
      const teamMetrics = {
        weeklySubmissions: weeklySubmissionCount,
        totalMembers: teamMembers.length,
        weeklySubmissionRate: Math.round(weeklySubmissionRate),
        weekStart: dateUtils.getDateString(currentWeekStart), // Use local date format
        weekEnd: dateUtils.getDateString(currentWeekEnd), // Use local date format
        todaySubmissions: todaySubmissionCount,
        todaySubmissionRate: Math.round(todaySubmissionRate),
        todayDate: dateUtils.getTodayDateString() // Use local date format
      };

      // Debug logging to understand team performance
      logger.logBusiness('Weekly Team Performance Debug', {
        teamMetrics,
        weeklyTeamKPI: teamKPI,
        weeklySubmissionRate,
        weeklySubmissionCount,
        totalTeamMembers: teamMembers.length
      });

      // Team goals summary - based on individual 7-day cycles
      const teamGoalsSummary = [
        {
          goalType: 'Work Readiness Cycle Completion',
          target: '7-day cycles per worker',
          teamActual: individualKPIs.reduce((sum, member) => sum + member.weeklyKPIMetrics.completedDays, 0),
          teamTarget: 7 * teamMembers.length, // 7 days × number of workers
          achievementRate: teamMembers.length > 0 
            ? Math.round((individualKPIs.reduce((sum, member) => sum + member.weeklyKPIMetrics.completedDays, 0) / (7 * teamMembers.length)) * 100)
            : 0
        }
      ];

      // Performance insights
      const performanceInsights = generatePerformanceInsights(individualKPIs, teamKPI);

      // Final response debugging
      const responseData = {
        teamKPI: {
          weekLabel: weekInfo.currentWeek.weekLabel,
          overallTeamKPI: teamKPI,
          teamOverview: {
            totalMembers: teamMembers.length,
            weeklySubmissions: teamMetrics.weeklySubmissions,
            weeklySubmissionRate: teamMetrics.weeklySubmissionRate,
            teamKPI: teamKPI.rating,
            weekStart: teamMetrics.weekStart,
            weekEnd: teamMetrics.weekEnd,
            todaySubmissions: teamMetrics.todaySubmissions,
            todaySubmissionRate: teamMetrics.todaySubmissionRate,
            todayDate: teamMetrics.todayDate
          },
          individualKPIs: individualKPIs,
          teamGoalsSummary: teamGoalsSummary,
          performanceInsights: performanceInsights,
          weeklyComparison: await getTeamWeeklyComparison(teamLeaderId, weekInfo, require('../config/supabase').supabase)
        }
      };

      logger.logBusiness('Final Response Data', { responseData });

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      logger.error('Error fetching team weekly KPI', { 
        error: error.message, 
        stack: error.stack, 
        teamLeaderId 
      });
      throw error;
    }
  }

  /**
   * Get team monitoring dashboard
   * @param {string} teamLeaderId - Team leader ID
   * @param {number} timeRange - Time range in days
   * @returns {Promise<Object>} Monitoring dashboard data
   */
  async getTeamMonitoringDashboard(teamLeaderId, timeRange = 30) {
    try {
      logger.logBusiness('Team Monitoring Dashboard Request', { teamLeaderId, timeRange });

      // Get team leader with managed teams
      const teamLeader = await userRepo.getTeamLeaderWithManagedTeams(teamLeaderId);
      if (!teamLeader) {
        throw new Error('Team leader not found');
      }

      // Get team members
      const teamMembers = await userRepo.getTeamMembersByTeamLeader(teamLeader.managed_teams);
      const teamMemberIds = teamMembers?.map(member => member.id) || [];

      // Calculate date range for monitoring
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(timeRange));

      // Get all assessments in the monitoring period
      const assessments = await workReadinessRepo.getAssessmentsForWorkers(
        teamMemberIds,
        startDate.toISOString(),
        endDate.toISOString()
      );

      // CURRENT CYCLE STATUS (Real-time monitoring)
      const currentCycleStatus = await Promise.all(teamMembers.map(async (member) => {
        const latestAssessment = await workReadinessRepo.getLatestAssessment(member.id);

        if (!latestAssessment) {
          return {
            workerId: member.id,
            workerName: `${member.first_name} ${member.last_name}`,
            status: 'No Cycle Started',
            currentDay: 0,
            streakDays: 0,
            cycleCompleted: false,
            lastSubmission: null
          };
        }

        const cycleStart = new Date(latestAssessment.cycle_start);
        const cycleEnd = new Date(cycleStart);
        cycleEnd.setDate(cycleStart.getDate() + 6);

        // Check if cycle is completed
        const isCompleted = latestAssessment.cycle_completed || latestAssessment.streak_days >= 7;

        return {
          workerId: member.id,
          workerName: `${member.first_name} ${member.last_name}`,
          status: isCompleted ? 'Cycle Completed' : 'Cycle In Progress',
          currentDay: latestAssessment.cycle_day,
          streakDays: latestAssessment.streak_days,
          cycleCompleted: isCompleted,
          cycleStart: cycleStart.toISOString().split('T')[0],
          cycleEnd: cycleEnd.toISOString().split('T')[0],
          lastSubmission: latestAssessment.submitted_at
        };
      }));

      // COMPLETED CYCLES HISTORY (Past performance)
      const completedCyclesHistory = await Promise.all(teamMembers.map(async (member) => {
        const completedCycles = await workReadinessRepo.getCompletedCyclesForWorker(
          member.id,
          startDate.toISOString(),
          endDate.toISOString()
        );

        const cyclesWithKPI = completedCycles?.map(cycle => {
          const completionRate = (cycle.streak_days / 7) * 100;
          const kpi = calculateCompletionRateKPI(completionRate, null, null);

          return {
            cycleStart: cycle.cycle_start,
            completedAt: cycle.submitted_at,
            streakDays: cycle.streak_days,
            completionRate: completionRate,
            kpi: kpi
          };
        }) || [];

        return {
          workerId: member.id,
          workerName: `${member.first_name} ${member.last_name}`,
          completedCycles: cyclesWithKPI,
          totalCompletedCycles: cyclesWithKPI.length,
          averageKPI: cyclesWithKPI.length > 0 
            ? cyclesWithKPI.reduce((sum, cycle) => sum + cycle.kpi.score, 0) / cyclesWithKPI.length
            : 0
        };
      }));

      // TEAM PERFORMANCE SUMMARY (Rolling average)
      const teamPerformanceSummary = {
        totalMembers: teamMembers.length,
        activeMembers: currentCycleStatus.filter(member => member.status !== 'No Cycle Started').length,
        completedCyclesThisPeriod: completedCyclesHistory.reduce((sum, member) => sum + member.totalCompletedCycles, 0),
        averageCyclesPerMember: teamMembers.length > 0 
          ? completedCyclesHistory.reduce((sum, member) => sum + member.totalCompletedCycles, 0) / teamMembers.length
          : 0,
        teamAverageKPI: completedCyclesHistory.length > 0
          ? completedCyclesHistory.reduce((sum, member) => sum + member.averageKPI, 0) / completedCyclesHistory.length
          : 0
      };

      // PERFORMANCE TRENDS (Weekly breakdown)
      const performanceTrends = [];
      const weeksBack = Math.ceil(parseInt(timeRange) / 7);

      for (let i = 0; i < weeksBack; i++) {
        const weekStart = new Date(endDate);
        weekStart.setDate(endDate.getDate() - (i * 7) - 6);
        const weekEnd = new Date(endDate);
        weekEnd.setDate(endDate.getDate() - (i * 7));

        const weekCompletedCycles = completedCyclesHistory.map(member => 
          member.completedCycles.filter(cycle => {
            const cycleDate = new Date(cycle.completedAt);
            return cycleDate >= weekStart && cycleDate <= weekEnd;
          }).length
        );

        const weekTotalCycles = weekCompletedCycles.reduce((sum, cycles) => sum + cycles, 0);
        const weekAverageCycles = teamMembers.length > 0 ? weekTotalCycles / teamMembers.length : 0;

        performanceTrends.unshift({
          weekLabel: `Week ${weeksBack - i}`,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          completedCycles: weekTotalCycles,
          averageCyclesPerMember: Math.round(weekAverageCycles * 100) / 100
        });
      }

      return {
        success: true,
        data: {
          monitoringDashboard: {
            timeRange: `${timeRange} days`,
            generatedAt: new Date().toISOString(),
            currentCycleStatus: currentCycleStatus,
            completedCyclesHistory: completedCyclesHistory,
            teamPerformanceSummary: teamPerformanceSummary,
            performanceTrends: performanceTrends,
            insights: generateMonitoringInsights(currentCycleStatus, completedCyclesHistory, teamPerformanceSummary)
          }
        }
      };

    } catch (error) {
      logger.error('Error fetching team monitoring dashboard:', error);
      throw error;
    }
  }
}

module.exports = new TeamKPIService();
