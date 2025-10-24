const userRepo = require('../repositories/userRepo');
const workReadinessRepo = require('../repositories/workReadinessRepo');
const assignmentRepo = require('../repositories/assignmentRepo');
const { calculateAssignmentKPI } = require('../utils/kpiCalculators');
const logger = require('../utils/logger');

/**
 * Worker KPI Service
 * Handles individual worker KPI calculations
 */
class WorkerKPIService {
  /**
   * Get worker KPI based on assignment completion
   * @param {string} workerId - Worker ID
   * @returns {Promise<Object>} Worker KPI data
   */
  async getWorkerAssignmentKPI(workerId) {
    try {
      // Get date range for the current month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get all assignments for the worker this month
      const assignments = await assignmentRepo.getAssignmentsForWorker(
        workerId,
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0]
      );

      // Get completed work readiness submissions for quality scoring
      const workReadiness = await workReadinessRepo.getWorkReadinessForQualityScoring(
        workerId,
        monthStart.toISOString(),
        monthEnd.toISOString()
      );

      // Calculate metrics
      const totalAssignments = assignments?.length || 0;
      const completedAssignments = assignments?.filter(a => a.status === 'completed').length || 0;
      const onTimeSubmissions = assignments?.filter(a => 
        a.status === 'completed' && 
        a.completed_at && 
        new Date(a.completed_at) <= new Date(a.due_time)
      ).length || 0;
      
      // Detect late submissions (completed after due time)
      const lateSubmissions = assignments?.filter(assignment => {
        if (assignment.status !== 'completed' || !assignment.completed_at || !assignment.due_time) {
          return false;
        }
        const completedTime = new Date(assignment.completed_at);
        const dueTime = new Date(assignment.due_time);
        return completedTime > dueTime;
      }) || [];

      // PENDING ASSIGNMENTS WITH FUTURE DUE DATES (WORKER LEVEL)
      const currentTime = new Date();
      const pendingAssignments = assignments?.filter(a => {
        if (a.status !== 'pending' || !a.due_time) return false;
        const dueTime = new Date(a.due_time);
        return dueTime > currentTime; // Only count pending assignments with future due dates
      }).length || 0;

      // OVERDUE ASSIGNMENTS FOR WORKER
      const overdueAssignments = assignments?.filter(a => {
        if (a.status !== 'overdue') return false;
        return true; // All overdue assignments count as penalty
      }).length || 0;

      // Calculate quality score based on readiness levels
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

      // Calculate KPI using enhanced assignment-based system with pending assignments and overdue penalty
      const kpi = calculateAssignmentKPI(completedAssignments, totalAssignments, onTimeSubmissions, qualityScore, pendingAssignments, overdueAssignments, [], lateSubmissions);

      // Get recent assignments for context
      const recentAssignments = assignments?.slice(0, 5).map(assignment => ({
        id: assignment.id,
        assignedDate: assignment.assigned_date,
        status: assignment.status,
        dueTime: assignment.due_time,
        completedAt: assignment.completed_at,
        isOnTime: assignment.status === 'completed' && 
                  assignment.completed_at && 
                  new Date(assignment.completed_at) <= new Date(assignment.due_time)
      })) || [];

      return {
        success: true,
        kpi: kpi,
        metrics: {
          totalAssignments,
          completedAssignments,
          onTimeSubmissions,
          qualityScore: Math.round(qualityScore),
          completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
          onTimeRate: totalAssignments > 0 ? Math.round((onTimeSubmissions / totalAssignments) * 100) : 0,
          lateRate: totalAssignments > 0 ? Math.round((lateSubmissions.length / totalAssignments) * 100) : 0
        },
        recentAssignments,
        period: {
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0],
          month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
        }
      };

    } catch (error) {
      logger.error('Error in getWorkerAssignmentKPI:', error);
      throw error;
    }
  }
}

module.exports = new WorkerKPIService();
