const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authSupabase');
const { validatePagination, validateDateRange } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { validateTeamLeaderId, validateWorkerId, validateWorkReadinessData } = require('../middleware/validation');
const { supabase } = require('../config/supabase');
const {
  getWorkerWeeklyProgress,
  getWorkerAssignmentKPI,
  getTeamLeaderAssignmentKPI,
  getTeamWeeklyKPI,
  getTeamMonitoringDashboard,
  getMonthlyPerformanceTracking,
  handleLogin,
  handleAssessmentSubmission,
  calculateKPI,
  getWeekDateRange,
  getWorkingDaysCount,
  calculateStreaks,
  getPerformanceTrend,
  getTeamWeeklyComparison,
  generatePerformanceInsights
} = require('../controllers/goalKpiController');

/**
 * Goal Tracking & KPI Routes
 * 
 * This module provides routes for both worker and team leader dashboards to track
 * goals and KPIs based on work readiness submissions.
 */

// Apply authentication to all routes
router.use(authenticateToken);

// Worker routes - now with authentication and validation
router.get('/worker/weekly-progress', validatePagination, validateDateRange, getWorkerWeeklyProgress);
router.get('/worker/assignment-kpi', validateWorkerId, validatePagination, validateDateRange, getWorkerAssignmentKPI);

// Team Leader routes - now with authentication and validation
router.get('/team-leader/weekly-summary', validateTeamLeaderId, validatePagination, validateDateRange, getTeamWeeklyKPI);
router.get('/team-leader/assignment-summary', validateTeamLeaderId, validatePagination, validateDateRange, getTeamLeaderAssignmentKPI);
router.get('/team-leader/monitoring-dashboard', validateTeamLeaderId, validatePagination, validateDateRange, getTeamMonitoringDashboard);
router.get('/team-leader/monthly-performance', validatePagination, getMonthlyPerformanceTracking);

// Login cycle handler - now with authentication
router.post('/login-cycle', handleLogin);

// Assessment submission handler - with authentication and validation
router.post('/submit-assessment', authenticateToken, validateWorkReadinessData, handleAssessmentSubmission);

module.exports = router;
