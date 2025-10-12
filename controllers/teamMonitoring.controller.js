const teamKPIService = require('../services/teamKPI.service');
const { calculateCompletionRateKPI } = require('../utils/kpiCalculators');
const dateUtils = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Team Monitoring Controller
 * Handles team monitoring and analytics endpoints
 */
class TeamMonitoringController {
  /**
   * Get Team Weekly KPI
   * @route GET /api/goal-kpi/team-leader/weekly-kpi
   * @access Team Leader
   */
  async getTeamWeeklyKPI(req, res) {
    try {
      const teamLeaderId = req.query.teamLeaderId;
      const { weekOffset = 0, teamFilter } = req.query;
      
      if (!teamLeaderId) {
        logger.warn('Team Weekly KPI: No team leader ID provided');
        return res.status(400).json({
          success: false,
          message: 'Team Leader ID is required'
        });
      }
      
      logger.logBusiness('Team Weekly KPI: API Called', { teamLeaderId });
      
      // Calculate target week using automatic current date
      const weekInfo = dateUtils.getWeekComparison(new Date());
      
      const result = await teamKPIService.getTeamWeeklyKPI(teamLeaderId, weekInfo);
      res.json(result);

    } catch (error) {
      logger.error('Error fetching team weekly KPI', { 
        error: error.message, 
        stack: error.stack, 
        query: req.query 
      });

      res.status(500).json({
        success: false,
        message: 'Failed to fetch team weekly KPI',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get Team Monitoring Dashboard
   * @route GET /api/goal-kpi/team-leader/monitoring-dashboard
   * @access Team Leader
   */
  async getTeamMonitoringDashboard(req, res) {
    try {
      const teamLeaderId = req.query.teamLeaderId;
      const { timeRange = '30' } = req.query; // Last 30 days by default
      
      if (!teamLeaderId) {
        return res.status(400).json({
          success: false,
          message: 'Team Leader ID is required'
        });
      }

      const result = await teamKPIService.getTeamMonitoringDashboard(teamLeaderId, parseInt(timeRange));
      res.json(result);

    } catch (error) {
      console.error('❌ Error fetching team monitoring dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team monitoring dashboard',
        error: error.message
      });
    }
  }

  /**
   * Get Monthly Performance Tracking for Team Leader
   * Comprehensive monthly KPI calculation and reporting
   * @route GET /api/goal-kpi/team-leader/monthly-performance
   * @access Team Leader
   */
  async getMonthlyPerformanceTracking(req, res) {
    try {
      logger.logBusiness('Monthly Performance Tracking Request', { query: req.query });
      const teamLeaderId = req.query.teamLeaderId;
      const { 
        year = new Date().getFullYear(), 
        month = new Date().getMonth() + 1,
        includePreviousMonths = '3' // Include last 3 months for comparison
      } = req.query;
      
      if (!teamLeaderId) {
        return res.status(400).json({
          success: false,
          message: 'Team Leader ID is required'
        });
      }

      // This is a legacy endpoint that needs to be refactored
      // For now, return a placeholder response
      res.json({
        success: true,
        message: 'Monthly performance tracking endpoint - needs refactoring',
        data: {
          monthlyWorkerKPIs: [],
          monthlyTeamSummary: {},
          monthlyTrends: [],
          performanceInsights: []
        }
      });

    } catch (error) {
      console.error('❌ Error fetching monthly performance tracking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch monthly performance tracking',
        error: error.message
      });
    }
  }
}

module.exports = new TeamMonitoringController();

