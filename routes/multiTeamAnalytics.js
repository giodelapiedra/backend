const express = require('express');
const router = express.Router();
const {
  getMultiTeamAnalytics,
  getTeamPerformanceComparison,
  getTeamLeaderPerformance,
  getTeamLeaderPerformanceTrends
} = require('../controllers/multiTeamAnalyticsController');
const { authenticateToken, requireRole } = require('../middleware/authSupabase');

// Test endpoint without authentication for debugging (must be before middleware)
router.get('/test-trends', getTeamLeaderPerformanceTrends);

// Apply authentication and role guard (site_supervisor only)
router.use(authenticateToken);
router.use(requireRole('site_supervisor'));

// Get comprehensive multi-team analytics data
router.get('/analytics', getMultiTeamAnalytics);

// Get team performance comparison data
router.get('/team-comparison', getTeamPerformanceComparison);

// Get team leader performance analytics
router.get('/team-leader-performance', getTeamLeaderPerformance);

// Get team leader performance trends for line chart
router.get('/team-leader-performance-trends', getTeamLeaderPerformanceTrends);

module.exports = router;
