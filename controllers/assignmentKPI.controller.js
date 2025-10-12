const teamKPIService = require('../services/teamKPI.service');
const workerKPIService = require('../services/workerKPI.service');
const logger = require('../utils/logger');

/**
 * Assignment KPI Controller
 * Handles assignment-based KPI calculations
 */
class AssignmentKPIController {
  /**
   * Get Team Leader Assignment KPI Summary
   * @route GET /api/goal-kpi/team-leader/assignment-summary
   * @access Team Leader
   */
  async getTeamLeaderAssignmentKPI(req, res) {
    try {
      const { teamLeaderId } = req.query;
      
      if (!teamLeaderId) {
        return res.status(400).json({
          success: false,
          message: 'Team Leader ID is required'
        });
      }

      const result = await teamKPIService.getTeamLeaderAssignmentKPI(teamLeaderId);
      res.json(result);

    } catch (error) {
      console.error('Error in getTeamLeaderAssignmentKPI:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get Worker KPI based on Assignment Completion
   * @route GET /api/goal-kpi/worker/assignment-kpi
   * @access Worker
   */
  async getWorkerAssignmentKPI(req, res) {
    try {
      const { workerId } = req.query;
      
      if (!workerId) {
        return res.status(400).json({
          success: false,
          message: 'Worker ID is required'
        });
      }

      const result = await workerKPIService.getWorkerAssignmentKPI(workerId);
      res.json(result);

    } catch (error) {
      console.error('Error in getWorkerAssignmentKPI:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new AssignmentKPIController();
