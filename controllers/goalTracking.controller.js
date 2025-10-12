const goalTrackingService = require('../services/goalTracking.service');
const logger = require('../utils/logger');

/**
 * Goal Tracking Controller
 * Handles goal tracking and cycle management endpoints
 */
class GoalTrackingController {
  /**
   * Get Weekly Work Readiness Goal Tracking for Worker Dashboard (Cycle-based)
   * @route GET /api/goal-kpi/worker/weekly-progress
   * @access Worker
   */
  async getWorkerWeeklyProgress(req, res) {
    try {
      const workerId = req.query.workerId;
      
      if (!workerId) {
        return res.status(400).json({
          success: false,
          message: 'Worker ID is required'
        });
      }

      const result = await goalTrackingService.getWorkerWeeklyProgress(workerId);
      res.json(result);

    } catch (error) {
      console.error('Error fetching worker weekly progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch weekly progress',
        error: error.message
      });
    }
  }

  /**
   * Handle Login-Triggered 7-Day Cycle for Workers
   * @route POST /api/goal-kpi/login-cycle
   * @access Worker
   */
  async handleLogin(req, res) {
    try {
      const { workerId } = req.body;
      
      if (!workerId) {
        return res.status(400).json({
          success: false,
          message: 'Worker ID is required'
        });
      }

      const result = await goalTrackingService.handleLogin(workerId);
      res.json(result);

    } catch (error) {
      logger.error('Error handling login cycle', { 
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to start cycle',
        error: error.message
      });
    }
  }

  /**
   * Handle Work Readiness Assessment Submission and Update Cycle
   * @route POST /api/goal-kpi/submit-assessment
   * @access Worker
   */
  async handleAssessmentSubmission(req, res) {
    try {
      const { workerId, assessmentData } = req.body;
      
      console.log('🔍 CONTROLLER - Request body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 CONTROLLER - Worker ID:', workerId);
      console.log('🔍 CONTROLLER - Assessment data:', assessmentData);
      
      logger.logBusiness('Handling Assessment Submission', { workerId, assessmentData });
      
      if (!workerId) {
        return res.status(400).json({
          success: false,
          message: 'Worker ID is required'
        });
      }

      // Validate assessment data
      if (!assessmentData) {
        return res.status(400).json({
          success: false,
          message: 'Assessment data is required'
        });
      }

      const result = await goalTrackingService.handleAssessmentSubmission(workerId, assessmentData);
      res.json(result);

    } catch (error) {
      logger.error('Error handling assessment submission', { error: error.message, workerId: req.body.workerId });
      res.status(500).json({
        success: false,
        message: 'Failed to update cycle',
        error: error.message
      });
    }
  }
}

module.exports = new GoalTrackingController();
