const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { supabase } = require('../config/supabase');
const {
  getWorkerWeeklyProgress,
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

// Worker routes - temporarily without auth for testing
router.get('/worker/weekly-progress', asyncHandler(getWorkerWeeklyProgress));

// Team Leader routes - temporarily without auth for testing
router.get('/team-leader/weekly-summary', asyncHandler(getTeamWeeklyKPI));
router.get('/team-leader/monitoring-dashboard', asyncHandler(getTeamMonitoringDashboard));
router.get('/team-leader/monthly-performance', asyncHandler(getMonthlyPerformanceTracking));

// Login cycle handler - temporarily without auth for testing
router.post('/login-cycle', asyncHandler(handleLogin));

// Assessment submission handler - temporarily without auth for testing
router.post('/submit-assessment', asyncHandler(handleAssessmentSubmission));

module.exports = router;
