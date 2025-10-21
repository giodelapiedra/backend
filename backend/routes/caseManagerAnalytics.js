const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/authSupabase');
const {
  getCaseManagerOverview,
  getCaseManagerTrends,
  getClinicianMetrics,
  getWorkerStatusOverview,
  getDeadlinesOverview
} = require('../controllers/caseManagerAnalyticsController');

// All routes are protected and require case_manager role
router.use(authenticateToken);
router.use(requireRole('case_manager'));

// @route   GET /api/analytics/case-manager/overview
// @desc    Get overview analytics for case manager
// @access  Private (case_manager, admin)
router.get('/overview', getCaseManagerOverview);

// @route   GET /api/analytics/case-manager/trends
// @desc    Get trend analytics over time
// @access  Private (case_manager, admin)
router.get('/trends', getCaseManagerTrends);

// @route   GET /api/analytics/case-manager/clinicians
// @desc    Get clinician performance metrics
// @access  Private (case_manager, admin)
router.get('/clinicians', getClinicianMetrics);

// @route   GET /api/analytics/case-manager/workers
// @desc    Get worker status overview
// @access  Private (case_manager, admin)
router.get('/workers', getWorkerStatusOverview);

// @route   GET /api/analytics/case-manager/deadlines
// @desc    Get upcoming deadlines and overdue tasks
// @access  Private (case_manager, admin)
router.get('/deadlines', getDeadlinesOverview);

module.exports = router;

