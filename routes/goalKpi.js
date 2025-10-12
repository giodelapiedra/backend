const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authSupabase');
const { validatePagination, validateDateRange } = require('../middleware/validators');
const asyncHandler = require('../middleware/asyncHandler');
const { validateTeamLeaderId, validateWorkerId, validateWorkReadinessData } = require('../middleware/validation');
const { supabase } = require('../config/supabase');
// Import new domain-specific controllers
const goalTrackingController = require('../controllers/goalTracking.controller');
const assignmentKPIController = require('../controllers/assignmentKPI.controller');
const teamMonitoringController = require('../controllers/teamMonitoring.controller');

/**
 * Goal Tracking & KPI Routes
 * 
 * This module provides routes for both worker and team leader dashboards to track
 * goals and KPIs based on work readiness submissions.
 */

// Apply authentication to all routes
router.use(authenticateToken);

// Worker routes - with async error handling
router.get('/worker/weekly-progress', 
  validatePagination, 
  validateDateRange, 
  asyncHandler(goalTrackingController.getWorkerWeeklyProgress)
);

router.get('/worker/assignment-kpi', 
  validateWorkerId, 
  validatePagination, 
  validateDateRange, 
  asyncHandler(assignmentKPIController.getWorkerAssignmentKPI)
);

// Team Leader routes - with async error handling
router.get('/team-leader/weekly-kpi', 
  validateTeamLeaderId, 
  validatePagination, 
  validateDateRange, 
  asyncHandler(teamMonitoringController.getTeamWeeklyKPI)
);

router.get('/team-leader/assignment-summary', 
  validateTeamLeaderId, 
  validatePagination, 
  validateDateRange, 
  asyncHandler(assignmentKPIController.getTeamLeaderAssignmentKPI)
);

router.get('/team-leader/monitoring-dashboard', 
  validateTeamLeaderId, 
  validatePagination, 
  validateDateRange, 
  asyncHandler(teamMonitoringController.getTeamMonitoringDashboard)
);

router.get('/team-leader/monthly-performance', 
  validatePagination, 
  asyncHandler(teamMonitoringController.getMonthlyPerformanceTracking)
);

// Login cycle handler - with async error handling
router.post('/login-cycle', 
  asyncHandler(goalTrackingController.handleLogin)
);

// Assessment submission handler - with validation and async error handling
router.post('/submit-assessment', 
  validateWorkReadinessData, 
  asyncHandler(goalTrackingController.handleAssessmentSubmission)
);

module.exports = router;
